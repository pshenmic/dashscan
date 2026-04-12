use chrono::{DateTime, Utc};
use deadpool_postgres::PoolError;
use tokio_postgres::GenericClient;
use tracing::debug;

use crate::rpc::Block;
use super::Database;

impl Database {
    pub async fn get_max_block_height(&self) -> Result<i64, PoolError> {
        let client = self.pool.get().await?;
        let row = client
            .query_one("SELECT MAX(height) FROM blocks", &[])
            .await?;

        let height: Option<i32> = row.get(0);
        Ok(height.map(|h| h as i64).unwrap_or(0))
    }

    #[allow(dead_code)]
    pub async fn get_block_hash_at_height(&self, height: i64) -> Result<Option<String>, PoolError> {
        let client = self.pool.get().await?;
        let rows = client
            .query(
                "SELECT hash FROM blocks WHERE height = $1",
                &[&(height as i32)],
            )
            .await?;
        Ok(rows.first().map(|r| r.get(0)))
    }

    pub async fn get_block_by_hash(
        &self,
        client: &impl GenericClient,
        hash: &str,
    ) -> Result<Option<String>, PoolError> {
        let rows = client
            .query("SELECT hash FROM blocks WHERE hash = $1", &[&hash])
            .await?;
        Ok(rows.first().map(|r| r.get(0)))
    }

    #[allow(dead_code)]
    pub async fn delete_block_at_height(&self, height: i64) -> Result<(), PoolError> {
        let client = self.pool.get().await?;
        let h = height as i32;

        // Delete in correct order due to foreign keys
        client
            .execute(
                "DELETE FROM special_transactions WHERE tx_id IN \
                 (SELECT id FROM transactions WHERE block_height = $1)",
                &[&h],
            )
            .await?;

        client
            .execute(
                "DELETE FROM tx_outputs WHERE tx_id IN \
                 (SELECT id FROM transactions WHERE block_height = $1)",
                &[&h],
            )
            .await?;

        client
            .execute(
                "DELETE FROM tx_inputs WHERE tx_id IN \
                 (SELECT id FROM transactions WHERE block_height = $1)",
                &[&h],
            )
            .await?;

        client
            .execute(
                "DELETE FROM transactions WHERE block_hash IN \
                 (SELECT hash FROM blocks WHERE height = $1)",
                &[&h],
            )
            .await?;

        client
            .execute("DELETE FROM blocks WHERE height = $1", &[&h])
            .await?;

        debug!(height, "Deleted block data for reorg handling");
        Ok(())
    }

    #[allow(dead_code)]
    pub async fn get_block_mn_list_hash(
        &self,
        block_hash: &str,
    ) -> Result<Option<String>, PoolError> {
        let client = self.pool.get().await?;
        let rows = client
            .query(
                "SELECT merkle_root_mn_list FROM blocks WHERE hash = $1",
                &[&block_hash],
            )
            .await?;
        Ok(rows.first().and_then(|r| r.get(0)))
    }

    pub async fn insert_block(
        &self,
        client: &impl GenericClient,
        block: &Block,
        timestamp: DateTime<Utc>,
        is_superblock: bool,
        miner_id: Option<i32>,
        miner_name_id: Option<i32>,
    ) -> Result<(), PoolError> {
        let naive_timestamp = timestamp.naive_utc();
        let tx_count = block.tx.len() as i32;

        let mn_list_root             = block.cb_tx.as_ref().map(|cb| cb.merkle_root_mn_list.clone());
        let credit_pool_balance      = block.cb_tx.as_ref().and_then(|cb| cb.credit_pool_balance);
        let cbtx_version             = block.cb_tx.as_ref().map(|cb| cb.version);
        let cbtx_height              = block.cb_tx.as_ref().map(|cb| cb.height);
        let cbtx_merkle_root_quorums = block.cb_tx.as_ref().and_then(|cb| cb.merkle_root_quorums.clone());
        let cbtx_best_cl_height_diff = block.cb_tx.as_ref().and_then(|cb| cb.best_cl_height_diff);
        let cbtx_best_cl_signature   = block.cb_tx.as_ref().and_then(|cb| cb.best_cl_signature.clone());

        client
            .execute(
                "INSERT INTO blocks (
                    hash, height, version, timestamp, previous_block_hash, merkle_root,
                    size, nonce, difficulty, chainwork, tx_count,
                    merkle_root_mn_list, credit_pool_balance,
                    cbtx_version, cbtx_height, cbtx_merkle_root_quorums,
                    cbtx_best_cl_height_diff, cbtx_best_cl_signature,
                    superblock, miner_id, miner_name_id
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                 ON CONFLICT (hash) DO NOTHING",
                &[
                    &block.hash,
                    &(block.height as i32),
                    &block.version,
                    &naive_timestamp,
                    &block.previous_block_hash,
                    &block.merkle_root,
                    &(block.size as i32),
                    &block.nonce,
                    &block.difficulty,
                    &block.chainwork,
                    &tx_count,
                    &mn_list_root.as_deref(),
                    &credit_pool_balance,
                    &cbtx_version,
                    &cbtx_height,
                    &cbtx_merkle_root_quorums.as_deref(),
                    &cbtx_best_cl_height_diff,
                    &cbtx_best_cl_signature.as_deref(),
                    &Some(is_superblock),
                    &miner_id,
                    &miner_name_id,
                ],
            )
            .await?;

        Ok(())
    }
}