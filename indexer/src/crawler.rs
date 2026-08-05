use std::collections::{HashMap, VecDeque};
use std::net::SocketAddr;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::time::{Duration, Instant};

use dashcore::Network;
use tokio::task::JoinSet;
use tracing::{debug, error, info, warn};

use crate::p2p::{DiscoveredAddr, P2PClient, PeerInfo};
use crate::peers::{PeerStore, StoredPeer};

/// How long to wait on an idle socket before assuming the peer is done sending
/// `addr` replies, and the hard ceiling on a single `getaddr` exchange.
const GETADDR_IDLE_TIMEOUT: Duration = Duration::from_secs(5);
const GETADDR_DEADLINE: Duration = Duration::from_secs(20);

/// Tunables for the peer crawler.
#[derive(Clone)]
pub struct CrawlConfig {
    /// Trigger a crawl round once every this many live-sync blocks.
    pub every_blocks: u64,
    /// Safety cap on how many distinct addresses a single round will visit.
    pub max_peers: usize,
    /// How many peers we connect to / probe concurrently.
    pub concurrency: usize,
    /// Wall-clock ceiling for a single crawl round.
    pub deadline: Duration,
    /// Connect/handshake timeout per peer. Short by design — most discovered
    /// addresses are dead, and waiting on them is what makes a crawl slow.
    pub connect_timeout: Duration,
}

/// Outcome of visiting one address: its version metadata (if it completed a
/// handshake) and every address it gossiped back via `getaddr`.
struct Visit {
    cand: DiscoveredAddr,
    info: Option<PeerInfo>,
    discovered: Vec<DiscoveredAddr>,
}

/// Background P2P peer crawler. Performs a breadth-first crawl of the network:
/// starting from a seed node it connects to each peer, captures liveness via
/// the handshake, harvests that peer's known addresses with `getaddr` on the
/// same connection, and keeps expanding the frontier until it converges (or a
/// safety cap / deadline is hit). The full set of live peers then overwrites
/// the Redis peer set.
///
/// Triggered from the live-sync flow (once on startup, then every
/// `every_blocks` blocks) rather than on a timer. Each trigger spawns the
/// round on a background task and returns immediately, and an overlap guard
/// skips a trigger if a round is still in flight — so it can never stall live
/// sync. All blocking socket work runs on `spawn_blocking` over its own
/// short-lived connections (never the block-stream socket).
pub struct PeerCrawler {
    seed: SocketAddr,
    network: Network,
    store: PeerStore,
    cfg: CrawlConfig,
    /// True while a round is in flight — guards against overlapping crawls.
    running: AtomicBool,
    /// Live-sync blocks seen since the last trigger.
    blocks_since: AtomicU64,
}

impl PeerCrawler {
    pub fn new(seed: SocketAddr, network: Network, store: PeerStore, cfg: CrawlConfig) -> Self {
        Self {
            seed,
            network,
            store,
            cfg,
            running: AtomicBool::new(false),
            blocks_since: AtomicU64::new(0),
        }
    }

    /// Count one live-sync block; trigger a round once `every_blocks` elapse.
    pub fn tick(self: &Arc<Self>) {
        if self.cfg.every_blocks == 0 {
            return;
        }
        let prev = self.blocks_since.fetch_add(1, Ordering::Relaxed);
        if prev + 1 < self.cfg.every_blocks {
            return;
        }
        self.blocks_since.store(0, Ordering::Relaxed);
        self.trigger("every-N-blocks");
    }

    /// Spawn a crawl round in the background unless one is already running.
    pub fn trigger(self: &Arc<Self>, reason: &str) {
        // swap returns the previous value; if it was already true, skip.
        if self.running.swap(true, Ordering::SeqCst) {
            warn!(reason, "Peer crawl skipped — previous round still running");
            return;
        }

        let me = Arc::clone(self);
        let reason = reason.to_string();
        tokio::spawn(async move {
            info!(reason, seed = %me.seed, "Peer crawl started");
            match me.crawl_round().await {
                Ok(stored) => info!(peers = stored, "Peer crawl complete"),
                Err(e) => error!("Peer crawl failed: {e}"),
            }
            me.running.store(false, Ordering::SeqCst);
        });
    }

    /// One breadth-first round: expand from the seed across the network, then
    /// overwrite Redis with every live peer found. Returns the count stored.
    async fn crawl_round(&self) -> Result<usize, String> {
        let network = self.network;
        let started = Instant::now();
        let deadline = started + self.cfg.deadline;

        // Every address we've seen (addr -> last_seen, for dedup and so we can
        // record unreachable/unprobed peers too), plus the work frontier and
        // the per-address result we'll store.
        let mut visited: HashMap<SocketAddr, u32> = HashMap::new();
        let mut frontier: VecDeque<DiscoveredAddr> = VecDeque::new();
        let mut results: HashMap<SocketAddr, StoredPeer> = HashMap::new();

        let seed = DiscoveredAddr { addr: self.seed, last_seen: now_secs() as u32 };
        visited.insert(seed.addr, seed.last_seen);
        frontier.push_back(seed);

        let mut tasks: JoinSet<Visit> = JoinSet::new();
        let mut probed = 0usize;

        loop {
            // Top up in-flight visits from the frontier, respecting concurrency,
            // the deadline, and the visited-address safety cap.
            while tasks.len() < self.cfg.concurrency.max(1)
                && Instant::now() < deadline
                && visited.len() < self.cfg.max_peers
            {
                let Some(cand) = frontier.pop_front() else { break };
                let connect_timeout = self.cfg.connect_timeout;
                tasks.spawn_blocking(move || visit(cand, network, connect_timeout));
            }

            let Some(joined) = tasks.join_next().await else {
                // Nothing in flight; if the frontier is drained (or we hit a
                // limit) we're done, otherwise loop to schedule more.
                if frontier.is_empty()
                    || Instant::now() >= deadline
                    || visited.len() >= self.cfg.max_peers
                {
                    break;
                }
                continue;
            };

            let Ok(visit) = joined else { continue }; // task panicked → skip
            probed += 1;

            let available = visit.info.is_some();
            results.insert(
                visit.cand.addr,
                StoredPeer {
                    addr: visit.cand.addr.to_string(),
                    available,
                    version: visit.info.as_ref().map(|i| i.version),
                    services: visit.info.as_ref().map(|i| i.services),
                    user_agent: visit.info.as_ref().map(|i| i.user_agent.clone()),
                    start_height: visit.info.as_ref().map(|i| i.start_height),
                    last_seen: visit.cand.last_seen,
                    probed_at: now_secs(),
                },
            );

            // Queue newly discovered addresses unless we've hit the cap.
            for d in visit.discovered {
                if visited.len() >= self.cfg.max_peers {
                    break;
                }
                if visited.insert(d.addr, d.last_seen).is_none() {
                    frontier.push_back(d);
                }
            }
        }

        // Drain any stragglers still running so we don't leak tasks.
        tasks.shutdown().await;

        // Record every discovered address we never got a result for (frontier
        // remainder when a cap/deadline hit, or aborted stragglers) as
        // unavailable, so the stored set covers the whole discovered network.
        let probed_at = now_secs();
        for (addr, last_seen) in &visited {
            results.entry(*addr).or_insert_with(|| StoredPeer {
                addr: addr.to_string(),
                available: false,
                version: None,
                services: None,
                user_agent: None,
                start_height: None,
                last_seen: *last_seen,
                probed_at,
            });
        }

        let peers: Vec<StoredPeer> = results.into_values().collect();
        let total = peers.len();
        let available = peers.iter().filter(|p| p.available).count();
        info!(
            discovered = visited.len(),
            probed,
            available,
            unavailable = total - available,
            elapsed_secs = started.elapsed().as_secs(),
            "Peer crawl: probing finished"
        );
        self.store.replace(&peers).await.map_err(|e| e.to_string())?;
        Ok(total)
    }
}

/// Connect to one address, capture its handshake metadata, and `getaddr` its
/// known peers — all on a single connection. Blocking; runs on the blocking
/// pool. Connection/handshake failures yield an empty, non-live visit.
fn visit(cand: DiscoveredAddr, network: Network, connect_timeout: Duration) -> Visit {
    let mut client = match P2PClient::connect_with(cand.addr, network, connect_timeout, connect_timeout) {
        Ok(client) => client,
        Err(e) => {
            debug!(addr = %cand.addr, "Peer connect failed: {e}");
            return Visit { cand, info: None, discovered: Vec::new() };
        }
    };

    let info = client.peer_info();
    let discovered = client
        .get_addresses(usize::MAX, GETADDR_IDLE_TIMEOUT, GETADDR_DEADLINE)
        .unwrap_or_default();

    Visit { cand, info, discovered }
}

fn now_secs() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or_default()
}