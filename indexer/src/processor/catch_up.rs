use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::mpsc;
use dashcore::Txid;
use tracing::{debug, info};

use crate::config::Config;
use crate::errors::block_index_error::BlockIndexError;
use crate::p2p::{P2PClient, P2PError};
use crate::p2p_converter;

use super::BlockProcessor;

impl BlockProcessor {
    /// Catch up from last indexed block to current chain tip via P2P.
    ///
    /// Opens two P2P connections:
    ///   1. Block streaming (`stream_blocks`) — sends blocks through a channel
    ///   2. Prev-tx fetching — persistent request/response loop for address resolution
    ///
    /// Blocks are committed in batches (`catch_up_batch_size`) to amortize WAL flush cost.
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

        // P2P connection #1 — streams blocks
        let p2p_handle = tokio::task::spawn_blocking(move || -> Result<(), P2PError> {
            let mut p2p = P2PClient::connect(p2p_addr, network)?;
            p2p.stream_blocks(start_h, start_hash, end_h, &block_tx, block_batch_size)?;
            Ok(())
        });

        // P2P connection #2 — persistent prev-tx fetcher (channel-based request/response)
        let p2p_addr2: SocketAddr = format!("{}:{}", config.p2p_host, config.p2p_port)
            .parse()
            .map_err(|e| BlockIndexError::UnexpectedError(format!("Invalid P2P address: {}", e)))?;

        type TxRequest = Vec<Txid>;
        type TxResponse = Result<HashMap<Txid, dashcore::blockdata::transaction::Transaction>, P2PError>;

        let (req_tx, req_rx) = mpsc::sync_channel::<TxRequest>(1);
        let (resp_tx, resp_rx) = mpsc::sync_channel::<TxResponse>(1);

        let tx_fetch_handle = tokio::task::spawn_blocking(move || -> Result<(), P2PError> {
            let mut p2p = P2PClient::connect(p2p_addr2, network)?;
            while let Ok(txids) = req_rx.recv() {
                let result = p2p.get_transactions(&txids);
                if resp_tx.send(result).is_err() {
                    break;
                }
            }
            Ok(())
        });

        // Process blocks as they arrive from P2P, batching DB transactions for WAL efficiency
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

            let needed = Self::collect_prev_tx_needs(&block.tx);
            let input_addresses = if !needed.is_empty() {
                let txids: Vec<Txid> = needed
                    .keys()
                    .filter_map(|h| h.parse::<Txid>().ok())
                    .collect();

                req_tx.send(txids).map_err(|e| {
                    BlockIndexError::UnexpectedError(format!("P2P tx-fetch channel closed: {}", e))
                })?;

                let fetched = resp_rx.recv()
                    .map_err(|e| BlockIndexError::UnexpectedError(
                        format!("P2P tx-fetch response channel closed: {}", e)
                    ))?
                    .map_err(BlockIndexError::from)?;

                Self::extract_input_addresses(&needed, &fetched, network)
            } else {
                HashMap::new()
            };

            self.write_block(&*db_tx, block, true, &input_addresses).await?;

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

        // Commit remaining blocks in the last partial batch
        if batch_count > 0 {
            db_tx.commit().await?;
        }

        // Signal tx-fetch thread to exit
        drop(req_tx);

        match p2p_handle.await {
            Ok(Ok(())) => {}
            Ok(Err(e)) => return Err(BlockIndexError::from(e)),
            Err(e) => return Err(BlockIndexError::UnexpectedError(format!("P2P thread panicked: {}", e))),
        }
        match tx_fetch_handle.await {
            Ok(Ok(())) => {}
            Ok(Err(e)) => return Err(BlockIndexError::from(e)),
            Err(e) => return Err(BlockIndexError::UnexpectedError(format!("P2P tx-fetch thread panicked: {}", e))),
        }

        self.sync_masternodes().await?;

        // Backfill chain_locked for any confirmed transactions indexed during a previous
        // continuous sync run before their chainlock arrived.
        let backfill_client = self.db.begin().await?;
        let backfilled = self.db.backfill_chain_locks(&**backfill_client).await?;
        if backfilled > 0 {
            info!(rows = backfilled, "Backfilled chain locks for previously unlocked transactions");
        }

        info!(chain_height, indexed, "Catch-up complete");
        Ok(chain_height)
    }
}