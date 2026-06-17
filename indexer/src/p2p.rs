use std::collections::HashMap;
use std::io::{BufReader, Write};
use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpStream};
use std::sync::mpsc::SyncSender;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use dashcore::consensus::{Decodable, encode};
use dashcore::hashes::Hash;
use dashcore::network::{address, constants, message, message_blockdata, message_network};
use dashcore::{BlockHash, Network, block};
use dashcore::secp256k1::rand::Rng;
use dashcore::secp256k1::rand;
use tracing::{debug, info};

pub struct P2PClient {
    address: SocketAddr,
    network: Network,
    stream: TcpStream,
    reader: BufReader<TcpStream>,
    /// The peer's `version` message, captured during the handshake.
    peer_version: Option<message_network::VersionMessage>,
}

/// A peer address discovered through a `getaddr` round, normalized to a
/// routable `SocketAddr`. Tor/I2P/CJDNS addresses are dropped — they can't be
/// probed over plain TCP.
#[derive(Debug, Clone)]
pub struct DiscoveredAddr {
    pub addr: SocketAddr,
    /// Last-seen timestamp the advertising peer reported (unix seconds).
    pub last_seen: u32,
}

/// Liveness + identity metadata captured from a peer's `version` handshake.
#[derive(Debug, Clone)]
pub struct PeerInfo {
    pub version: u32,
    pub services: u64,
    pub user_agent: String,
    pub start_height: i32,
}

impl P2PClient {
    /// Connect to a Dash peer and perform the version/verack handshake, using
    /// the default timeouts (suited to block streaming).
    pub fn connect(address: SocketAddr, network: Network) -> Result<Self, P2PError> {
        Self::connect_with(
            address,
            network,
            Duration::from_secs(10),
            Duration::from_secs(15),
        )
    }

    /// Connect with explicit connect/handshake timeouts. The peer crawler uses
    /// short timeouts here — most discovered addresses are dead, and a long
    /// connect timeout is what makes a full crawl slow.
    pub fn connect_with(
        address: SocketAddr,
        network: Network,
        connect_timeout: Duration,
        handshake_timeout: Duration,
    ) -> Result<Self, P2PError> {
        let stream =
            TcpStream::connect_timeout(&address, connect_timeout).map_err(P2PError::Connection)?;
        // No global read timeout — we manage timeouts per-phase instead.
        // During block streaming the socket can sit idle while the channel
        // back-pressures (DB processing is slower than network).
        stream
            .set_read_timeout(None)
            .map_err(P2PError::Connection)?;

        let reader = BufReader::new(stream.try_clone().map_err(P2PError::Io)?);

        let mut client = Self {
            address,
            network,
            stream,
            reader,
            peer_version: None,
        };

        client.handshake(handshake_timeout)?;
        Ok(client)
    }

    /// The version metadata this peer advertised during the handshake, if any.
    /// A connected client always has it; used by the crawler to record liveness
    /// + subversion/services/height alongside a `getaddr` on the same socket.
    pub fn peer_info(&self) -> Option<PeerInfo> {
        self.peer_version.as_ref().map(|v| PeerInfo {
            version: v.version,
            services: v.services.as_u64(),
            user_agent: v.user_agent.clone(),
            start_height: v.start_height,
        })
    }

    /// Ask this peer for the addresses it knows about (`getaddr`).
    ///
    /// Uses the v1 `getaddr`/`addr` exchange (universally supported, unlike
    /// BIP155 `sendaddrv2` which Dash Core's protocol may not recognize and can
    /// disconnect on). Any `addrv2` the peer volunteers is still accepted.
    /// Collects replies until `max_addrs` is reached, the socket goes idle for
    /// `idle_timeout`, or the overall `deadline` elapses — whichever comes
    /// first. A peer is free to never answer, so the timeouts bound this call.
    pub fn get_addresses(
        &mut self,
        max_addrs: usize,
        idle_timeout: Duration,
        deadline: Duration,
    ) -> Result<Vec<DiscoveredAddr>, P2PError> {
        self.set_read_timeout(Some(idle_timeout))?;
        self.send(message::NetworkMessage::GetAddr)?;

        let mut out: Vec<DiscoveredAddr> = Vec::new();
        let start = Instant::now();

        while out.len() < max_addrs && start.elapsed() < deadline {
            match self.recv() {
                Ok(message::NetworkMessage::Addr(addrs)) => {
                    for (time, addr) in addrs {
                        if let Ok(socket_addr) = addr.socket_addr() {
                            out.push(DiscoveredAddr {
                                addr: socket_addr,
                                last_seen: time,
                            });
                        }
                    }
                }
                Ok(message::NetworkMessage::AddrV2(addrs)) => {
                    for msg in addrs {
                        if let Ok(socket_addr) = msg.socket_addr() {
                            out.push(DiscoveredAddr {
                                addr: socket_addr,
                                last_seen: msg.time,
                            });
                        }
                    }
                }
                Ok(_) => {}
                // Terminal read conditions during a getaddr exchange are normal:
                //   WouldBlock/TimedOut — idle socket, peer is done sending.
                //   UnexpectedEof/ConnectionReset/… — peer closed the connection.
                // In all cases we stop and return whatever addresses we collected.
                Err(P2PError::Io(e))
                    if matches!(
                        e.kind(),
                        std::io::ErrorKind::WouldBlock
                            | std::io::ErrorKind::TimedOut
                            | std::io::ErrorKind::UnexpectedEof
                            | std::io::ErrorKind::ConnectionReset
                            | std::io::ErrorKind::ConnectionAborted
                            | std::io::ErrorKind::BrokenPipe
                    ) =>
                {
                    debug!("getaddr stream ended ({}): {} addresses collected", e.kind(), out.len());
                    break;
                }
                Err(e) => return Err(e),
            }
        }

        Ok(out)
    }

    /// Fetch a single block by its hash.
    #[allow(dead_code)]
    pub fn get_block(&mut self, block_hash: BlockHash) -> Result<block::Block, P2PError> {
        info!("Requesting block {}", block_hash);

        self.send(message::NetworkMessage::GetData(vec![
            message_blockdata::Inventory::Block(block_hash),
        ]))?;

        loop {
            match self.recv()? {
                message::NetworkMessage::Block(block) => {
                    info!("Received block {}", block_hash);
                    return Ok(block);
                }
                message::NetworkMessage::NotFound(_) => {
                    return Err(P2PError::BlockNotFound(block_hash));
                }
                _ => {}
            }
        }
    }

    /// Sync headers then stream blocks through a channel for processing.
    ///
    /// `start_hash` is the hash of the block at `start_height` (obtained from RPC).
    /// Headers are synced only from `start_height` forward, skipping everything before.
    ///
    /// Blocks are fetched in batches for throughput, but always sent to the
    /// channel **sorted by height** to guarantee insertion order in the DB.
    /// This prevents data gaps if `get_max_block_height` is used on restart.
    pub fn stream_blocks(
        &mut self,
        start_height: u64,
        start_hash: BlockHash,
        end_height: u64,
        sender: &SyncSender<(i64, block::Block)>,
        batch_size: usize,
    ) -> Result<(), P2PError> {
        let hashes = self.sync_headers_from(start_height, start_hash, end_height)?;

        // Build a hash -> height lookup for this range
        let hash_to_height: HashMap<BlockHash, i64> = hashes
            .iter()
            .enumerate()
            .map(|(i, h)| (*h, start_height as i64 + i as i64))
            .collect();

        for chunk in hashes.chunks(batch_size) {
            let inventory: Vec<_> = chunk
                .iter()
                .map(|h| message_blockdata::Inventory::Block(*h))
                .collect();

            self.send(message::NetworkMessage::GetData(inventory))?;
            debug!("Sent getdata for {} blocks", chunk.len());

            // Collect all blocks in the batch before sending to channel
            let mut batch: Vec<(i64, block::Block)> = Vec::with_capacity(chunk.len());

            while batch.len() < chunk.len() {
                match self.recv()? {
                    message::NetworkMessage::Block(blk) => {
                        let hash = blk.block_hash();
                        let height = hash_to_height
                            .get(&hash)
                            .copied()
                            .unwrap_or(start_height as i64);

                        batch.push((height, blk));
                    }
                    message::NetworkMessage::NotFound(inv) => {
                        for item in inv {
                            if let message_blockdata::Inventory::Block(hash) = item {
                                return Err(P2PError::BlockNotFound(hash));
                            }
                        }
                    }
                    _ => {}
                }
            }

            // Sort by height so DB inserts are always in order
            batch.sort_by_key(|(h, _)| *h);

            for item in batch {
                if sender.send(item).is_err() {
                    return Ok(()); // receiver dropped, stop
                }
            }
        }

        Ok(())
    }

    /// Sync headers starting from a known block hash/height up to `target_height`.
    ///
    /// Returns hashes for blocks `start_height` through `target_height` (inclusive).
    fn sync_headers_from(
        &mut self,
        start_height: u64,
        start_hash: BlockHash,
        target_height: u64,
    ) -> Result<Vec<BlockHash>, P2PError> {
        // Headers should arrive fast — use a timeout here
        self.set_read_timeout(Some(Duration::from_secs(60)))?;

        let count = target_height - start_height + 1;
        info!(
            "Syncing headers from {} to {} ({} headers)",
            start_height, target_height, count
        );

        // Start with the known hash; getheaders returns headers AFTER the locator.
        let mut hashes: Vec<BlockHash> = vec![start_hash];
        let needed = (target_height - start_height) as usize; // headers after start

        while hashes.len() <= needed {
            let locator_hash = *hashes.last().unwrap();

            self.send(message::NetworkMessage::GetHeaders(
                message_blockdata::GetHeadersMessage::new(
                    vec![locator_hash],
                    BlockHash::all_zeros(),
                ),
            ))?;

            loop {
                match self.recv()? {
                    message::NetworkMessage::Headers(headers) => {
                        if headers.is_empty() {
                            return Err(P2PError::HeightNotFound(target_height));
                        }

                        debug!(
                            "Received {} headers (height {} - {})",
                            headers.len(),
                            start_height as usize + hashes.len(),
                            start_height as usize + hashes.len() + headers.len() - 1
                        );

                        for header in &headers {
                            hashes.push(header.block_hash());
                        }
                        break;
                    }
                    _ => {}
                }
            }
        }

        // Trim to exact range (getheaders may overshoot)
        hashes.truncate(needed + 1);

        // Remove timeout before block streaming
        self.set_read_timeout(Some(Duration::from_secs(30)))?;

        info!("Header sync complete, {} hashes collected", hashes.len());
        Ok(hashes)
    }

    // -- Low-level helpers --

    fn send(&mut self, payload: message::NetworkMessage) -> Result<(), P2PError> {
        let msg = message::RawNetworkMessage {
            magic: self.network.magic(),
            payload,
        };
        self.stream
            .write_all(encode::serialize(&msg).as_slice())
            .map_err(P2PError::Io)
    }

    /// Read the next message, automatically responding to pings.
    fn recv(&mut self) -> Result<message::NetworkMessage, P2PError> {
        loop {
            let reply = match message::RawNetworkMessage::consensus_decode(&mut self.reader) {
                Ok(msg) => msg,
                Err(dashcore::consensus::encode::Error::Io(e)) => {
                    return Err(P2PError::Io(e));
                }
                Err(e) => {
                    return Err(P2PError::Decode(e));
                }
            };

            match reply.payload {
                message::NetworkMessage::Ping(nonce) => {
                    self.send(message::NetworkMessage::Pong(nonce))?;
                }
                message::NetworkMessage::Alert(_) => { /* Ignore */ }
                message::NetworkMessage::Reject(ref rej) => {
                    info!("Peer rejected request: {}", rej.reason);
                    return Ok(reply.payload);
                }
                payload => {
                    // Log what we actually got to see why we aren't getting blocks
                    debug!("Received message: {:?}", payload);
                    return Ok(payload);
                }
            }
        }
    }

    fn set_read_timeout(&self, timeout: Option<Duration>) -> Result<(), P2PError> {
        self.stream.set_read_timeout(timeout).map_err(P2PError::Io)
    }

    fn handshake(&mut self, timeout: Duration) -> Result<(), P2PError> {
        self.set_read_timeout(Some(timeout))?;
        self.send(self.build_version_message())?;
        debug!("Sent version message");

        let mut got_version = false;
        let mut got_verack = false;

        while !got_version || !got_verack {
            match self.recv()? {
                message::NetworkMessage::Version(version) => {
                    debug!("Received version message");
                    self.peer_version = Some(version);
                    self.send(message::NetworkMessage::Verack)?;
                    debug!("Sent verack message");
                    got_version = true;
                }
                message::NetworkMessage::Verack => {
                    debug!("Received verack message");
                    got_verack = true;
                }
                other => {
                    debug!("Handshake: ignoring message {:?}", other);
                }
            }
        }

        info!("Handshake complete with {}", self.address);
        Ok(())
    }

    fn build_version_message(&self) -> message::NetworkMessage {
        let my_address = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(0, 0, 0, 0)), 0);
        let services = constants::ServiceFlags::NONE;
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time error")
            .as_secs();
        let addr_recv = address::Address::new(&self.address, constants::ServiceFlags::NONE);
        let addr_from = address::Address::new(&my_address, constants::ServiceFlags::NONE);
        let nonce: u64 = rand::thread_rng().r#gen();
        let user_agent = String::from("/dashscan:0.1/");
        let start_height: i32 = 0;
        let mn_auth_challenge: [u8; 32] = rand::random();

        message::NetworkMessage::Version(message_network::VersionMessage::new(
            services,
            timestamp as i64,
            addr_recv,
            addr_from,
            nonce,
            user_agent,
            start_height,
            false,
            mn_auth_challenge,
        ))
    }
}

pub use crate::errors::p2p_error::P2PError;
