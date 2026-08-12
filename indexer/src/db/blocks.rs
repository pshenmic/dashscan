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

        // Reverse the incrementally-maintained rollups before the rows they were
        // derived from are gone. Each is the exact inverse of what block_writer
        // phase 7c/7d added for this block.
        client
            .execute(
                "UPDATE addresses a \
                 SET received = a.received - s.received, \
                     sent     = a.sent - s.sent, \
                     tx_count = a.tx_count - s.tx_count \
                 FROM (SELECT address_id, \
                              SUM(received) AS received, \
                              SUM(sent) AS sent, \
                              COUNT(DISTINCT tx_id) AS tx_count \
                       FROM (SELECT o.address_id, o.tx_id, o.value AS received, 0 AS sent \
                             FROM tx_outputs o \
                             JOIN transactions t ON t.id = o.tx_id \
                             WHERE t.block_height = $1 AND o.address_id IS NOT NULL \
                             UNION ALL \
                             SELECT i.address_id, i.tx_id, 0, COALESCE(i.amount, 0) \
                             FROM tx_inputs i \
                             JOIN transactions t ON t.id = i.tx_id \
                             WHERE t.block_height = $1 AND i.address_id IS NOT NULL) f \
                       GROUP BY address_id) s \
                 WHERE a.id = s.address_id",
                &[&h],
            )
            .await?;

        client
            .execute(
                "UPDATE address_balance_deltas d \
                 SET received = d.received - s.received, sent = d.sent - s.sent \
                 FROM (SELECT f.address_id, b.timestamp::date AS day, \
                              SUM(f.received) AS received, SUM(f.sent) AS sent \
                       FROM (SELECT o.address_id, o.tx_id, o.value AS received, 0 AS sent \
                             FROM tx_outputs o \
                             JOIN transactions t ON t.id = o.tx_id \
                             WHERE t.block_height = $1 AND o.address_id IS NOT NULL \
                             UNION ALL \
                             SELECT i.address_id, i.tx_id, 0, COALESCE(i.amount, 0) \
                             FROM tx_inputs i \
                             JOIN transactions t ON t.id = i.tx_id \
                             WHERE t.block_height = $1 AND i.address_id IS NOT NULL) f \
                       JOIN blocks b ON b.height = $1 \
                       GROUP BY 1, 2) s \
                 WHERE d.address_id = s.address_id AND d.day = s.day",
                &[&h],
            )
            .await?;

        // address_activity / _weekly count a transaction once per address, which
        // is what address_transactions already stores for this block.
        client
            .execute(
                "UPDATE address_activity a \
                 SET tx_count = a.tx_count - s.tx_count \
                 FROM (SELECT at.address_id, b.timestamp::date AS day, COUNT(*) AS tx_count \
                       FROM address_transactions at \
                       JOIN blocks b ON b.height = at.block_height \
                       WHERE at.block_height = $1 \
                       GROUP BY 1, 2) s \
                 WHERE a.address_id = s.address_id AND a.day = s.day",
                &[&h],
            )
            .await?;

        client
            .execute(
                "UPDATE address_activity_weekly w \
                 SET tx_count = w.tx_count - s.tx_count \
                 FROM (SELECT at.address_id, date_trunc('week', b.timestamp)::date AS week, \
                              COUNT(*) AS tx_count \
                       FROM address_transactions at \
                       JOIN blocks b ON b.height = at.block_height \
                       WHERE at.block_height = $1 \
                       GROUP BY 1, 2) s \
                 WHERE w.address_id = s.address_id AND w.week = s.week",
                &[&h],
            )
            .await?;

        client
            .execute(
                "UPDATE chain_stats_hourly c \
                 SET block_count    = c.block_count - s.block_count, \
                     tx_count       = c.tx_count - s.tx_count, \
                     size           = c.size - s.size, \
                     difficulty_sum = c.difficulty_sum - s.difficulty_sum, \
                     normal         = c.normal - s.normal, \
                     special        = c.special - s.special, \
                     coinjoin       = c.coinjoin - s.coinjoin, \
                     multisig       = c.multisig - s.multisig \
                 FROM (SELECT date_trunc('hour', b.timestamp) AS hour, 1 AS block_count, \
                              b.size, b.difficulty AS difficulty_sum, \
                              COUNT(t.id) AS tx_count, \
                              COUNT(*) FILTER (WHERE t.type = 0 AND NOT t.coinjoin AND NOT t.multisig) AS normal, \
                              COUNT(*) FILTER (WHERE t.type > 0) AS special, \
                              COUNT(*) FILTER (WHERE t.coinjoin) AS coinjoin, \
                              COUNT(*) FILTER (WHERE t.multisig) AS multisig \
                       FROM blocks b \
                       LEFT JOIN transactions t ON t.block_height = b.height \
                       WHERE b.height = $1 \
                       GROUP BY b.timestamp, b.size, b.difficulty) s \
                 WHERE c.hour = s.hour",
                &[&h],
            )
            .await?;

        client
            .execute(
                "UPDATE transaction_type_counts c \
                 SET count = c.count - s.count \
                 FROM (SELECT type, coinjoin, multisig, COUNT(*) AS count \
                       FROM transactions WHERE block_height = $1 \
                       GROUP BY 1, 2, 3) s \
                 WHERE c.type = s.type AND c.coinjoin = s.coinjoin AND c.multisig = s.multisig",
                &[&h],
            )
            .await?;

        client
            .execute(
                "DELETE FROM address_transactions WHERE block_height = $1",
                &[&h],
            )
            .await?;

        // Outputs spent by this block's inputs go back to unspent.
        client
            .execute(
                "UPDATE tx_outputs o SET spent_by_tx_id = NULL, spent_by_vin_index = NULL \
                 WHERE o.spent_by_tx_id IN \
                 (SELECT id FROM transactions WHERE block_height = $1)",
                &[&h],
            )
            .await?;

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