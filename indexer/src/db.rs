use deadpool_postgres::{Client, Pool, PoolError};
use serde_json::Value;
use tokio_postgres::GenericClient;
use tracing::{debug, info};

const SCHEMA_SQL: &str = include_str!("schema.sql");

pub struct Database {
    pool: Pool,
}

impl Database {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    async fn client(&self) -> Result<Client, PoolError> {
        self.pool.get().await
    }

    /// Acquire a pool connection so the caller can open a transaction.
    pub async fn begin(&self) -> Result<Client, PoolError> {
        self.pool.get().await
    }

    pub async fn run_migrations(&self) -> Result<(), PoolError> {
        let client = self.client().await?;
        client
            .batch_execute(SCHEMA_SQL)
            .await?;

        info!("Database migrations applied");

        Ok(())
    }

    pub async fn get_max_block_height(&self) -> Result<i64, PoolError> {
        let client = self.client().await?;
        let row = client
            .query_one("SELECT MAX(height) FROM blocks", &[])
            .await?;

        let height: Option<i32> = row.get(0);

        Ok(height.map(|h| h as i64).unwrap_or(0))
    }

    pub async fn get_block_hash_at_height(&self, height: i64) -> Result<Option<String>, PoolError> {
        let client = self.client().await?;

        let rows = client
            .query(
                "SELECT hash FROM blocks WHERE height = $1",
                &[&(height as i32)],
            )
            .await?;

        Ok(rows.first().map(|r| {
            let h: String = r.get(0);
            h.trim().to_string()
        }))
    }

    pub async fn get_block_by_hash(&self, hash: &str) -> Result<Option<String>, PoolError> {
        let client = self.client().await?;

        let rows = client
            .query(
                "SELECT hash FROM blocks WHERE hash = $1",
                &[&hash],
            )
            .await?;

        Ok(rows.first().map(|r| {
            let h: String = r.get(0);
            h.trim().to_string()
        }))
    }

    pub async fn get_address(
        &self,
        client: &impl GenericClient,
        address: &str,
    ) -> Result<Option<String>, PoolError> {
        let rows = client
            .query(
                "SELECT address, first_seen_tx, first_seen_block, last_seen_tx, last_seen_block FROM addresses WHERE address = $1",
                &[&address],
            )
            .await?;

        Ok(rows.first().map(|r| {
            let h: String = r.get(0);
            h.trim().to_string()
        }))
    }

    pub async fn delete_block_at_height(&self, height: i64) -> Result<(), PoolError> {
        let client = self.client().await?;
        let h = height as i32;

        // Delete in correct order due to foreign keys
        client
            .execute(
                "DELETE FROM special_transactions WHERE txid IN (SELECT txid FROM transactions WHERE block_hash IN (SELECT hash FROM blocks WHERE height = $1))",
                &[&h],
            )
            .await?;

        client
            .execute(
                "DELETE FROM tx_outputs WHERE txid IN (SELECT txid FROM transactions WHERE block_hash IN (SELECT hash FROM blocks WHERE height = $1))",
                &[&h],
            )
            .await?;

        client
            .execute(
                "DELETE FROM tx_inputs WHERE txid IN (SELECT txid FROM transactions WHERE block_hash IN (SELECT hash FROM blocks WHERE height = $1))",
                &[&h],
            )
            .await?;

        client
            .execute(
                "DELETE FROM transactions WHERE block_hash IN (SELECT hash FROM blocks WHERE height = $1)",
                &[&h],
            )
            .await?;

        client
            .execute("DELETE FROM blocks WHERE height = $1", &[&h])
            .await?;

        debug!(height, "Deleted block data for reorg handling");
        Ok(())
    }

    pub async fn insert_block(
        &self,
        client: &impl GenericClient,
        hash: &str,
        height: i64,
        version: i32,
        timestamp: chrono::DateTime<chrono::Utc>,
        prev_hash: Option<String>,
        merkle_root: &str,
        size: i64,
        nonce: i64,
        difficulty: f64,
        chainwork: &str,
        tx_count: i32,
        credit_pool_balance: Option<f64>,
    ) -> Result<(), PoolError> {
        let naive_timestamp = timestamp.naive_utc();

        client
            .execute(
                "INSERT INTO blocks (hash, height, version, timestamp, previous_block_hash, merkle_root, size, nonce, difficulty, chainwork, tx_count, credit_pool_balance)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                 ON CONFLICT (hash) DO NOTHING",
                &[
                    &hash,
                    &(height as i32),
                    &version,
                    &naive_timestamp,
                    &prev_hash,
                    &merkle_root,
                    &(size as i32),
                    &nonce,
                    &difficulty,
                    &chainwork,
                    &tx_count,
                    &credit_pool_balance,
                ],
            )
            .await?;

        Ok(())
    }

    pub async fn insert_transaction(
        &self,
        client: &impl GenericClient,
        txid: &str,
        block_hash: &str,
        version: i32,
        tx_type: i16,
        size: i64,
        locktime: i64,
        is_coinbase: bool,
    ) -> Result<(), PoolError> {
        client
            .execute(
                "INSERT INTO transactions (txid, block_hash, version, type, size, locktime, is_coinbase)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)",
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
            .await?;

        Ok(())
    }

    pub async fn insert_tx_input(
        &self,
        client: &impl GenericClient,
        txid: &str,
        vin_index: i32,
        prev_txid: Option<&str>,
        prev_vout_index: Option<i32>,
        coinbase_data: Option<&str>,
    ) -> Result<(), PoolError> {
        client
            .execute(
                "INSERT INTO tx_inputs (txid, vin_index, prev_txid, prev_vout_index, coinbase_data)
                 VALUES ($1, $2, $3, $4, $5)",
                &[&txid, &vin_index, &prev_txid, &prev_vout_index, &coinbase_data],
            )
            .await?;

        Ok(())
    }

    pub async fn insert_tx_output(
        &self,
        client: &impl GenericClient,
        txid: &str,
        vout_index: i32,
        value: i64,
        script_pub_key: Option<&str>,
        script_type: Option<&str>,
        address: Option<&str>,
    ) -> Result<(), PoolError> {
        client
            .execute(
                "INSERT INTO tx_outputs (txid, vout_index, value, script_pub_key, script_type, address)
                 VALUES ($1, $2, $3, $4, $5, $6)",
                &[&txid, &vout_index, &value, &script_pub_key, &script_type, &address],
            )
            .await?;

        Ok(())
    }

    pub async fn insert_address(
        &self,
        client: &impl GenericClient,
        address: &str,
        first_seen_tx: &str,
        first_seen_block: i64,
    ) -> Result<(), PoolError> {
        client
            .execute(
                "INSERT INTO addresses (address, first_seen_tx, first_seen_block)
                 VALUES ($1, $2, $3)",
                &[&address, &first_seen_tx, &(first_seen_block as i32)],
            )
            .await?;

        Ok(())
    }

    pub async fn update_address(
        &self,
        client: &impl GenericClient,
        address: &str,
        last_seen_tx: &str,
        last_seen_block: i64,
    ) -> Result<(), PoolError> {
        client
            .execute(
                "UPDATE addresses
                          SET last_seen_tx = $2, last_seen_block = $3
                          WHERE address = $1;",
                &[&address, &last_seen_tx, &(last_seen_block as i32)],
            )
            .await?;

        Ok(())
    }

    pub async fn insert_special_transaction(
        &self,
        client: &impl GenericClient,
        txid: &str,
        tx_type: i16,
        payload: &Value,
    ) -> Result<(), PoolError> {
        client
            .execute(
                "INSERT INTO special_transactions (txid, tx_type, payload)
                 VALUES ($1, $2, $3)",
                &[&txid, &tx_type, &payload],
            )
            .await?;

        Ok(())
    }
}