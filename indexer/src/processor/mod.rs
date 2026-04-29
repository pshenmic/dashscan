mod address_resolver;
mod block_writer;
mod catch_up;
mod miner;
mod utxo_cache;

use crate::config::superblock_interval;
use crate::db::Database;
use crate::errors::block_index_error::BlockIndexError;
use crate::miner_pool::MinerPool;
use crate::rpc::DashRpcClient;
use std::collections::HashMap;
use tracing::{debug, info};

pub struct BlockProcessor {
    pub rpc: DashRpcClient,
    pub db: Database,
    pub superblock_interval: i64,
    pub miner_pools: Vec<MinerPool>,
    pub miner_pool_ids: HashMap<String, i32>,
}

impl BlockProcessor {
    pub fn new(
        rpc: DashRpcClient,
        db: Database,
        network: dashcore::Network,
        miner_pools: Vec<MinerPool>,
        miner_pool_ids: HashMap<String, i32>,
    ) -> Self {
        Self {
            rpc,
            db,
            superblock_interval: superblock_interval(network),
            miner_pools,
            miner_pool_ids,
        }
    }

    pub async fn index_block_by_hash(&self, hash: &str) -> Result<Option<String>, BlockIndexError> {
        let mut client = self.db.begin().await?;

        if self.db.get_block_by_hash(&**client, hash).await?.is_some() {
            debug!(hash = %hash, "Block already indexed, skipping");
            return Ok(None);
        }

        let block = self.rpc.get_block(hash).await?;
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
