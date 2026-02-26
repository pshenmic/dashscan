use deadpool_postgres::{Client, Pool};
use serde_json::Value;
use tokio_postgres::Error;
use tracing::{debug, info};

const SCHEMA_SQL: &str = include_str!("schema.sql");

pub struct Database {
    pool: Pool,
}

impl Database {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    async fn client(&self) -> Result<Client, String> {
        self.pool
            .get()
            .await
            .map_err(|e| format!("Failed to get DB connection: {e}"))
    }

    pub async fn run_migrations(&self) -> Result<(), String> {
        let client = self.client().await?;
        client
            .batch_execute(SCHEMA_SQL)
            .await
            .map_err(|e| format!("Migration failed: {e}"))?;
        info!("Database migrations applied");
        Ok(())
    }

    pub async fn get_max_block_height(&self) -> Result<Option<i64>, String> {
        let client = self.client().await?;
        let row = client
            .query_one("SELECT MAX(height) FROM blocks", &[])
            .await
            .map_err(|e| format!("Failed to query max height: {e}"))?;
        let height: Option<i32> = row.get(0);
        Ok(height.map(|h| h as i64))
    }

    pub async fn get_block_hash_at_height(&self, height: i64) -> Result<Option<String>, String> {
        let client = self.client().await?;
        let rows = client
            .query(
                "SELECT hash FROM blocks WHERE height = $1",
                &[&(height as i32)],
            )
            .await
            .map_err(|e| format!("Failed to query block hash: {e}"))?;
        Ok(rows.first().map(|r| {
            let h: String = r.get(0);
            h.trim().to_string()
        }))
    }

    pub async fn delete_block_at_height(&self, height: i64) -> Result<(), String> {
        let client = self.client().await?;
        let h = height as i32;

        // Delete in correct order due to foreign keys
        client
            .execute(
                "DELETE FROM special_transactions WHERE txid IN (SELECT txid FROM transactions WHERE block_hash IN (SELECT hash FROM blocks WHERE height = $1))",
                &[&h],
            )
            .await
            .map_err(|e| format!("Failed to delete special_transactions: {e}"))?;

        client
            .execute(
                "DELETE FROM tx_outputs WHERE txid IN (SELECT txid FROM transactions WHERE block_hash IN (SELECT hash FROM blocks WHERE height = $1))",
                &[&h],
            )
            .await
            .map_err(|e| format!("Failed to delete tx_outputs: {e}"))?;

        client
            .execute(
                "DELETE FROM tx_inputs WHERE txid IN (SELECT txid FROM transactions WHERE block_hash IN (SELECT hash FROM blocks WHERE height = $1))",
                &[&h],
            )
            .await
            .map_err(|e| format!("Failed to delete tx_inputs: {e}"))?;

        client
            .execute(
                "DELETE FROM transactions WHERE block_hash IN (SELECT hash FROM blocks WHERE height = $1)",
                &[&h],
            )
            .await
            .map_err(|e| format!("Failed to delete transactions: {e}"))?;

        client
            .execute("DELETE FROM blocks WHERE height = $1", &[&h])
            .await
            .map_err(|e| format!("Failed to delete block: {e}"))?;

        debug!(height, "Deleted block data for reorg handling");
        Ok(())
    }

    pub async fn insert_block(
        &self,
        hash: &str,
        height: i64,
        timestamp: i64,
        prev_hash: Option<&str>,
        merkle_root: &str,
        size: i64,
        nonce: i64,
        difficulty: f64,
        chainwork: &str,
        tx_count: i32,
    ) -> Result<(), String> {
        let client = self.client().await?;

        let chrono_timestamp = chrono::DateTime::from_timestamp_secs(timestamp).expect("Could not decode timestamp");

        client
            .execute(
                "INSERT INTO blocks (hash, height, timestamp, prev_hash, merkle_root, size, nonce, difficulty, chainwork, tx_count)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT (hash) DO NOTHING",
                &[
                    &hash,
                    &(height as i32),
                    &chrono_timestamp,
                    &prev_hash,
                    &merkle_root,
                    &(size as i32),
                    &nonce,
                    &difficulty,
                    &chainwork,
                    &tx_count,
                ],
            )
            .await
            .map_err(|e| format!("Failed to insert block: {e}"))?;
        Ok(())
    }

    pub async fn insert_transaction(
        &self,
        txid: &str,
        block_hash: &str,
        version: i32,
        tx_type: i16,
        size: i64,
        locktime: i64,
        is_coinbase: bool,
    ) -> Result<(), String> {
        let client = self.client().await?;
        client
            .execute(
                "INSERT INTO transactions (txid, block_hash, version, tx_type, size, locktime, is_coinbase)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (txid) DO NOTHING",
                &[
                    &txid,
                    &block_hash,
                    &version,
                    &tx_type,
                    &(size as i32),
                    &locktime,
                    &is_coinbase,
                ],
            )
            .await
            .map_err(|e| format!("Failed to insert transaction: {e}"))?;
        Ok(())
    }

    pub async fn insert_tx_input(
        &self,
        txid: &str,
        vin_index: i32,
        prev_txid: Option<&str>,
        prev_vout_index: Option<i32>,
        coinbase_data: Option<&str>,
    ) -> Result<(), String> {
        let client = self.client().await?;
        client
            .execute(
                "INSERT INTO tx_inputs (txid, vin_index, prev_txid, prev_vout_index, coinbase_data)
                 VALUES ($1, $2, $3, $4, $5)",
                &[&txid, &vin_index, &prev_txid, &prev_vout_index, &coinbase_data],
            )
            .await
            .map_err(|e| format!("Failed to insert tx_input: {e}"))?;
        Ok(())
    }

    pub async fn insert_tx_output(
        &self,
        txid: &str,
        vout_index: i32,
        value: i64,
        script_pub_key: Option<&str>,
        script_type: Option<&str>,
        address: Option<&str>,
    ) -> Result<(), String> {
        let client = self.client().await?;
        client
            .execute(
                "INSERT INTO tx_outputs (txid, vout_index, value, script_pub_key, script_type, address)
                 VALUES ($1, $2, $3, $4, $5, $6)",
                &[&txid, &vout_index, &value, &script_pub_key, &script_type, &address],
            )
            .await
            .map_err(|e| format!("Failed to insert tx_output: {e}"))?;
        Ok(())
    }

    pub async fn upsert_address(
        &self,
        address: &str,
        first_seen_tx: &str,
        first_seen_block: i64,
    ) -> Result<(), String> {
        let client = self.client().await?;
        client
            .execute(
                "INSERT INTO addresses (address, first_seen_tx, first_seen_block)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (address) DO NOTHING",
                &[&address, &first_seen_tx, &(first_seen_block as i32)],
            )
            .await
            .map_err(|e| format!("Failed to upsert address: {e}"))?;
        Ok(())
    }

    pub async fn insert_special_transaction(
        &self,
        txid: &str,
        tx_type: i16,
        payload: &Value,
    ) -> Result<(), String> {
        let client = self.client().await?;
        client
            .execute(
                "INSERT INTO special_transactions (txid, tx_type, payload)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (txid) DO NOTHING",
                &[&txid, &tx_type, &payload],
            )
            .await
            .map_err(|e| format!("Failed to insert special_transaction: {e}"))?;
        Ok(())
    }
}
