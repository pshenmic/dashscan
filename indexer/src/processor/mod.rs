mod block_writer;
mod catch_up;
mod governance;
mod miner;
mod utxo_cache;

use crate::config::superblock_interval;
use crate::crawler::PeerCrawler;
use crate::dao::DaoStore;
use crate::db::Database;
use crate::errors::block_index_error::BlockIndexError;
use crate::miner_pool::MinerPool;
use crate::p2p_converter;
use crate::rpc::DashRpcClient;
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use tracing::{debug, error, info};

pub struct BlockProcessor {
    pub rpc: DashRpcClient,
    pub db: Database,
    pub dao: DaoStore,
    pub network: dashcore::Network,
    pub superblock_interval: i64,
    pub miner_pools: Vec<MinerPool>,
    pub miner_pool_ids: HashMap<String, i32>,
    pub blocks_since_balance_refresh: AtomicU64,
    /// Background peer crawler, if a valid P2P seed was configured.
    pub peer_crawler: Option<Arc<PeerCrawler>>,
}

impl BlockProcessor {
    pub fn new(
        rpc: DashRpcClient,
        db: Database,
        dao: DaoStore,
        network: dashcore::Network,
        miner_pools: Vec<MinerPool>,
        miner_pool_ids: HashMap<String, i32>,
        peer_crawler: Option<Arc<PeerCrawler>>,
    ) -> Self {
        Self {
            rpc,
            db,
            dao,
            network,
            superblock_interval: superblock_interval(network),
            miner_pools,
            miner_pool_ids,
            blocks_since_balance_refresh: AtomicU64::new(0),
            peer_crawler,
        }
    }

    /// Kick off a peer crawl immediately (used once when live sync starts).
    pub fn bootstrap_peer_crawl(&self) {
        if let Some(crawler) = &self.peer_crawler {
            crawler.trigger("live-sync-start");
        }
    }

    /// Count one live-sync block toward the crawler's every-N-blocks trigger.
    pub fn tick_peer_crawl(&self) {
        if let Some(crawler) = &self.peer_crawler {
            crawler.tick();
        }
    }

    /// Bump the live-block counter and refresh `address_balances` once it
    /// reaches `interval`. Called from the live-sync paths only — catch-up
    /// skips this and a single bootstrap refresh runs once it finishes.
    pub async fn tick_address_balances_refresh(&self, interval: u64) {
        if interval == 0 {
            return;
        }
        let prev = self
            .blocks_since_balance_refresh
            .fetch_add(1, Ordering::Relaxed);
        if prev + 1 < interval {
            return;
        }
        self.blocks_since_balance_refresh.store(0, Ordering::Relaxed);
        if let Err(e) = self.db.refresh_address_balances().await {
            error!("Failed to refresh address_balances matview: {e}");
        } else {
            debug!("Refreshed address_balances matview");
        }
    }

    pub async fn index_block_by_hash(&self, hash: &str) -> Result<Option<String>, BlockIndexError> {
        let mut client = self.db.begin().await?;

        if self.db.get_block_by_hash(&**client, hash).await?.is_some() {
            debug!(hash = %hash, "Block already indexed, skipping");
            return Ok(None);
        }

        let raw_block = self.rpc.get_block_raw(hash).await?;
        let height = p2p_converter::extract_block_height_from_cbtx(&raw_block)
            .ok_or_else(|| BlockIndexError::UnexpectedError(
                format!("Block {hash} has no cbTx height — cannot determine block height from raw block")
            ))?;
        let block = p2p_converter::convert_block(&raw_block, height, self.network);
        self.process_block(&mut client, block).await?;

        Ok(Some(hash.to_string()))
    }

    pub async fn index_block_by_height(
        &self,
        height: i64,
    ) -> Result<Option<String>, BlockIndexError> {
        let hash = self.rpc.get_block_hash(height).await?;
        self.index_block_by_hash(&hash).await
    }

    /// Store the raw ISLOCK hex on the matching transaction.
    pub async fn apply_instant_lock(
        &self,
        txid: String,
        lock_hex: String,
    ) -> Result<(), BlockIndexError> {
        let client = self.db.begin().await?;

        let updated = self
            .db
            .update_transaction_instant_lock(&**client, &txid, &lock_hex)
            .await?;

        if updated == 0 {
            debug!(txid = %txid, "instant_lock: transaction not yet indexed, skipping");
        } else {
            info!(txid = %txid, "Applied instant lock");
        }

        Ok(())
    }

    /// Set chain_locked = TRUE for all transactions at the given block height.
    pub async fn apply_chain_lock(&self, block_height: i32) -> Result<(), BlockIndexError> {
        let client = self.db.begin().await?;

        let updated = self
            .db
            .set_chain_locked_for_block(&**client, block_height)
            .await?;

        info!(height = block_height, rows = updated, "Applied chain lock");

        Ok(())
    }

    pub async fn sync_masternodes(&self) -> Result<(), BlockIndexError> {
        let entries = self.rpc.get_masternode_list().await?;

        let mut client = self.db.begin().await?;
        let db_tx = client.transaction().await?;

        self.db.upsert_masternodes_batch(&*db_tx, &entries).await?;

        db_tx.commit().await?;

        info!(count = entries.len(), "Synced masternode list");
        Ok(())
    }
}
