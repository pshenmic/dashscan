use std::net::SocketAddr;
use std::sync::mpsc;
use tracing::{debug, info};

use crate::config::Config;
use crate::errors::block_index_error::BlockIndexError;
use crate::p2p::{P2PClient, P2PError};
use crate::p2p_converter;

use super::BlockProcessor;

impl BlockProcessor {
    /// Catch up from last indexed block to current chain tip via P2P.
    ///
    /// Keeps a single P2P connection (`p2p_block`) open for the full sync, streaming
    /// blocks in order. Address resolution for inputs is handled inside `write_block`:
    /// DB lookup for already-indexed transactions, RPC fallback for any gaps.
    /// Blocks are committed in batches (`catch_up_batch_size`) to amortize WAL flush.
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

        let p2p_block: SocketAddr = format!("{}:{}", config.p2p_host, config.p2p_port)
            .parse()
            .map_err(|e| BlockIndexError::UnexpectedError(format!("Invalid P2P address: {}", e)))?;

        let start_hash_str = self.rpc.get_block_hash(start).await?;
        let start_hash: dashcore::BlockHash = start_hash_str
            .parse()
            .map_err(|e| BlockIndexError::UnexpectedError(format!("Failed to parse block hash: {:?}", e)))?;

        let block_batch_size = config.p2p_batch_size;

        let (block_tx, block_rx) = mpsc::sync_channel::<(i64, dashcore::block::Block)>(block_batch_size * 2);

        let start_h = u64::try_from(start)
            .map_err(|_| BlockIndexError::UnexpectedError(format!("Invalid start height: {}", start)))?;
        let end_h = u64::try_from(chain_height)
            .map_err(|_| BlockIndexError::UnexpectedError(format!("Invalid chain height: {}", chain_height)))?;

        let network = config.network;

        let p2p_handle = tokio::task::spawn_blocking(move || -> Result<(), P2PError> {
            let mut p2p = P2PClient::connect(p2p_block, network)?;
            p2p.stream_blocks(start_h, start_hash, end_h, &block_tx, block_batch_size)?;
            Ok(())
        });

        let mut client = self.db.begin().await?;
        let mut indexed: i64 = 0;
        let mut last_height = db_height;
        let mut batch_count: usize = 0;
        let mut db_tx = client.transaction().await?;

        while let Ok((height, raw_block)) = block_rx.recv() {
            if height <= last_height {
                debug!(height, "Block already indexed, skipping");
                continue;
            }

            let block = p2p_converter::convert_block(&raw_block, height, network);
            self.write_block(&*db_tx, block, true).await?;

            last_height = height;
            indexed += 1;
            batch_count += 1;

            if batch_count >= config.catch_up_batch_size {
                db_tx.commit().await?;

                info!(
                    indexed,
                    height = last_height,
                    remaining = total - indexed,
                    batch = config.catch_up_batch_size,
                    "Committed batch"
                );

                db_tx = client.transaction().await?;
                batch_count = 0;
            }
        }

        if batch_count > 0 {
            db_tx.commit().await?;
        }

        match p2p_handle.await {
            Ok(Ok(())) => {}
            Ok(Err(e)) => return Err(BlockIndexError::from(e)),
            Err(e) => return Err(BlockIndexError::UnexpectedError(format!("P2P thread panicked: {}", e))),
        }

        self.sync_masternodes().await?;

        let backfill_client = self.db.begin().await?;
        let backfilled = self.db.backfill_chain_locks(&**backfill_client).await?;
        if backfilled > 0 {
            info!(rows = backfilled, "Backfilled chain locks for previously unlocked transactions");
        }

        info!(chain_height, indexed, "Catch-up complete");
        Ok(chain_height)
    }
}