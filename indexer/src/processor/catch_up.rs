use std::net::SocketAddr;
use std::sync::mpsc;
use std::thread;
use tracing::{debug, info};

use crate::config::Config;
use crate::errors::block_index_error::BlockIndexError;
use crate::p2p::{P2PClient, P2PError};
use crate::p2p_converter;

use super::block_writer::PendingBlock;
use super::utxo_cache::UtxoCache;
use super::BlockProcessor;

/// Below this many remaining blocks, skip the parallel-fetch overhead
/// (extra TCP connection + handshake + mid-range RPC lookup) and use a
/// single P2P connection.
const PARALLEL_P2P_THRESHOLD: i64 = 1024;

/// Per-channel buffer for each parallel P2P stream. The "late" stream (B)
/// fills this while stream A drains, so a higher value lets B do more
/// concurrent work at the cost of memory. Speedup cap is
/// `N / (N - PREFETCH_BUFFER)` for a range of N blocks.
const P2P_PREFETCH_BUFFER: usize = 25_000;

/// Hard cap on the persistent UTXO cache. Each entry is ~80 bytes, so 2 M
/// entries ≈ 160 MB. The cache shrinks naturally as outputs are spent;
/// the cap is a safety net for HODL-heavy ranges where many outputs
/// remain unspent within the catch-up window.
const UTXO_CACHE_MAX_ENTRIES: usize = 2_000_000;

impl BlockProcessor {
    /// Catch up from the last indexed block to the current chain tip.
    ///
    /// For any range of `>= PARALLEL_P2P_THRESHOLD` blocks, the range is split
    /// in half and fetched via two parallel P2P connections (A = first half,
    /// B = second half). A merge thread forwards all of A's blocks to the
    /// DB consumer, then all of B's — preserving strict height order. While
    /// A is draining, B fills its channel up to `P2P_PREFETCH_BUFFER`,
    /// effectively saving that many blocks' worth of fetch time at the end.
    pub async fn catch_up(&self, config: &Config) -> Result<i64, BlockIndexError> {
        let chain_height = self.rpc.get_block_count().await?;

        let mut db_height: i64 = self.db.get_max_block_height().await?;
        if db_height == 0 {
            db_height = config.start_height;
        }

        if db_height >= chain_height {
            info!(chain_height, db_height, "Already up to date");
            self.sync_masternodes().await?;
            return Ok(chain_height);
        }

        let start = db_height + 1;
        let total = chain_height - db_height;

        info!(from = start, to = chain_height, blocks = total, "Catching up via P2P");

        let p2p_addr: SocketAddr = format!("{}:{}", config.p2p_host, config.p2p_port)
            .parse()
            .map_err(|e| BlockIndexError::UnexpectedError(format!("Invalid P2P address: {}", e)))?;

        let block_batch_size = config.p2p_batch_size;
        let network = config.network;

        // Final merged stream the DB consumer reads from.
        let (block_tx, block_rx) =
            mpsc::sync_channel::<(i64, dashcore::block::Block)>(block_batch_size * 2);

        let mut p2p_handles: Vec<tokio::task::JoinHandle<Result<(), P2PError>>> = Vec::new();
        let merge_handle: Option<thread::JoinHandle<()>>;

        if total >= PARALLEL_P2P_THRESHOLD {
            // ── Parallel path: split the range in half, two P2P connections.
            let midpoint = start + total / 2 - 1; // A = [start..=midpoint], B = [midpoint+1..=chain_height]
            let b_start = midpoint + 1;

            let a_start_hash: dashcore::BlockHash = self
                .rpc
                .get_block_hash(start)
                .await?
                .parse()
                .map_err(|e| {
                    BlockIndexError::UnexpectedError(format!(
                        "Failed to parse A start block hash: {:?}",
                        e
                    ))
                })?;
            let b_start_hash: dashcore::BlockHash = self
                .rpc
                .get_block_hash(b_start)
                .await?
                .parse()
                .map_err(|e| {
                    BlockIndexError::UnexpectedError(format!(
                        "Failed to parse B start block hash: {:?}",
                        e
                    ))
                })?;

            let a_start_h = u64::try_from(start).map_err(|_| {
                BlockIndexError::UnexpectedError(format!("Invalid start height: {}", start))
            })?;
            let a_end_h = u64::try_from(midpoint).map_err(|_| {
                BlockIndexError::UnexpectedError(format!("Invalid midpoint: {}", midpoint))
            })?;
            let b_start_h = u64::try_from(b_start).map_err(|_| {
                BlockIndexError::UnexpectedError(format!("Invalid B start: {}", b_start))
            })?;
            let b_end_h = u64::try_from(chain_height).map_err(|_| {
                BlockIndexError::UnexpectedError(format!("Invalid chain height: {}", chain_height))
            })?;

            info!(
                a_range = format!("[{}..={}]", a_start_h, a_end_h),
                b_range = format!("[{}..={}]", b_start_h, b_end_h),
                prefetch = P2P_PREFETCH_BUFFER,
                "Parallel P2P split"
            );

            let (a_tx, a_rx) =
                mpsc::sync_channel::<(i64, dashcore::block::Block)>(P2P_PREFETCH_BUFFER);
            let (b_tx, b_rx) =
                mpsc::sync_channel::<(i64, dashcore::block::Block)>(P2P_PREFETCH_BUFFER);

            let a_handle = tokio::task::spawn_blocking(move || -> Result<(), P2PError> {
                let mut p2p = P2PClient::connect(p2p_addr, network)?;
                p2p.stream_blocks(a_start_h, a_start_hash, a_end_h, &a_tx, block_batch_size)?;
                Ok(())
            });
            let b_handle = tokio::task::spawn_blocking(move || -> Result<(), P2PError> {
                let mut p2p = P2PClient::connect(p2p_addr, network)?;
                p2p.stream_blocks(b_start_h, b_start_hash, b_end_h, &b_tx, block_batch_size)?;
                Ok(())
            });

            p2p_handles.push(a_handle);
            p2p_handles.push(b_handle);

            // Merge: drain A, then drain B. Both streams are height-sorted
            // internally and A's range is strictly below B's, so the
            // consumer sees a strictly ascending height sequence.
            let forward_tx = block_tx;
            merge_handle = Some(thread::spawn(move || {
                for item in a_rx.iter() {
                    if forward_tx.send(item).is_err() {
                        return;
                    }
                }
                for item in b_rx.iter() {
                    if forward_tx.send(item).is_err() {
                        return;
                    }
                }
            }));
        } else {
            // ── Single-connection path for small ranges.
            let start_hash: dashcore::BlockHash =
                self.rpc.get_block_hash(start).await?.parse().map_err(|e| {
                    BlockIndexError::UnexpectedError(format!(
                        "Failed to parse start block hash: {:?}",
                        e
                    ))
                })?;

            let start_h = u64::try_from(start).map_err(|_| {
                BlockIndexError::UnexpectedError(format!("Invalid start height: {}", start))
            })?;
            let end_h = u64::try_from(chain_height).map_err(|_| {
                BlockIndexError::UnexpectedError(format!("Invalid chain height: {}", chain_height))
            })?;

            let forward_tx = block_tx;
            let handle = tokio::task::spawn_blocking(move || -> Result<(), P2PError> {
                let mut p2p = P2PClient::connect(p2p_addr, network)?;
                p2p.stream_blocks(start_h, start_hash, end_h, &forward_tx, block_batch_size)?;
                Ok(())
            });
            p2p_handles.push(handle);
            merge_handle = None;
        }

        // ── Consumer loop: drain merged stream, accumulate, flush on batch full.
        let mut client = self.db.begin().await?;
        let mut indexed: i64 = 0;
        let mut last_height = db_height;
        let mut pending: Vec<PendingBlock> = Vec::with_capacity(config.catch_up_batch_size);
        let mut db_tx = client.transaction().await?;
        let mut utxo_cache = UtxoCache::new(UTXO_CACHE_MAX_ENTRIES);

        while let Ok((height, raw_block)) = block_rx.recv() {
            if height <= last_height {
                debug!(height, "Block already indexed, skipping");
                continue;
            }

            let block = p2p_converter::convert_block(&raw_block, height, network);
            let p = self.prepare_block(block, true)?;
            pending.push(p);
            last_height = height;
            indexed += 1;

            if pending.len() >= config.catch_up_batch_size {
                self.write_batch(&*db_tx, &pending, &mut utxo_cache).await?;
                db_tx.commit().await?;

                info!(
                    indexed,
                    height = last_height,
                    remaining = total - indexed,
                    batch = pending.len(),
                    "Committed batch"
                );

                db_tx = client.transaction().await?;
                pending.clear();
            }
        }

        if !pending.is_empty() {
            self.write_batch(&*db_tx, &pending, &mut utxo_cache).await?;
            db_tx.commit().await?;
        } else {
            db_tx.commit().await?;
        }

        for handle in p2p_handles {
            match handle.await {
                Ok(Ok(())) => {}
                Ok(Err(e)) => return Err(BlockIndexError::from(e)),
                Err(e) => {
                    return Err(BlockIndexError::UnexpectedError(format!(
                        "P2P thread panicked: {}",
                        e
                    )));
                }
            }
        }
        if let Some(h) = merge_handle {
            let _ = h.join();
        }

        self.sync_masternodes().await?;

        let backfill_client = self.db.begin().await?;
        let backfilled = self.db.backfill_chain_locks(&**backfill_client).await?;
        if backfilled > 0 {
            info!(
                rows = backfilled,
                "Backfilled chain locks for previously unlocked transactions"
            );
        }

        info!(chain_height, indexed, "Catch-up complete");
        Ok(chain_height)
    }
}