use deadpool_postgres::{Client, Pool, PoolError};
use serde_json::Value;
use tokio_postgres::types::ToSql;
use tokio_postgres::GenericClient;
use tracing::{debug, info};
use crate::rpc::Transaction as RpcTransaction;

const SCHEMA_SQL: &str = include_str!("schema.sql");

/// Maximum rows per batched INSERT to stay under PostgreSQL's 32 767 parameter limit.
const BATCH_SIZE: usize = 1000;

/// Builds a placeholder string like `($1,$2,$3),($4,$5,$6)` for a batch INSERT.
fn build_placeholders(n_rows: usize, n_cols: usize) -> String {
    let mut s = String::with_capacity(n_rows * (n_cols * 4 + 3));
    for row in 0..n_rows {
        if row > 0 {
            s.push(',');
        }
        s.push('(');
        for col in 0..n_cols {
            if col > 0 {
                s.push(',');
            }
            s.push('$');
            s.push_str(&(row * n_cols + col + 1).to_string());
        }
        s.push(')');
    }
    s
}

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

    /// Batch INSERT all transactions for a block in chunks of BATCH_SIZE.
    pub async fn insert_transactions_batch(
        &self,
        client: &impl GenericClient,
        transactions: &[RpcTransaction],
        block_hash: &str,
    ) -> Result<(), PoolError> {
        if transactions.is_empty() {
            return Ok(());
        }

        // Precompute type-converted values so we can take stable references to them.
        let tx_types: Vec<i16> = transactions.iter().map(|tx| tx.tx_type.unwrap_or(0)).collect();
        let sizes: Vec<i32> = transactions.iter().map(|tx| tx.size as i32).collect();
        let is_coinbases: Vec<bool> = transactions
            .iter()
            .map(|tx| tx.vin.first().map_or(false, |v| v.coinbase.is_some()))
            .collect();

        for (chunk_idx, chunk) in transactions.chunks(BATCH_SIZE).enumerate() {
            let base = chunk_idx * BATCH_SIZE;
            let query = format!(
                "INSERT INTO transactions (txid, block_hash, version, type, size, locktime, is_coinbase) VALUES {}",
                build_placeholders(chunk.len(), 7)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk.len() * 7);
            for (i, tx) in chunk.iter().enumerate() {
                let abs = base + i;
                params.push(&tx.txid);
                params.push(&block_hash);
                params.push(&tx.version);
                params.push(&tx_types[abs]);
                params.push(&sizes[abs]);
                params.push(&tx.locktime);
                params.push(&is_coinbases[abs]);
            }

            client.execute(query.as_str(), &params).await?;
        }

        Ok(())
    }

    /// Batch INSERT all inputs across every transaction in the block.
    pub async fn insert_tx_inputs_batch(
        &self,
        client: &impl GenericClient,
        transactions: &[RpcTransaction],
    ) -> Result<(), PoolError> {
        // Flatten all inputs into parallel column vecs for stable references.
        let mut txids: Vec<&str> = Vec::new();
        let mut vin_indices: Vec<i32> = Vec::new();
        let mut prev_txids: Vec<Option<&str>> = Vec::new();
        let mut prev_vouts: Vec<Option<i32>> = Vec::new();
        let mut coinbase_datas: Vec<Option<&str>> = Vec::new();

        for tx in transactions {
            for (i, vin) in tx.vin.iter().enumerate() {
                txids.push(tx.txid.as_str());
                vin_indices.push(i as i32);
                prev_txids.push(vin.txid.as_deref());
                prev_vouts.push(vin.vout);
                coinbase_datas.push(vin.coinbase.as_deref());
            }
        }

        if txids.is_empty() {
            return Ok(());
        }

        for chunk_start in (0..txids.len()).step_by(BATCH_SIZE) {
            let end = (chunk_start + BATCH_SIZE).min(txids.len());
            let chunk_len = end - chunk_start;

            let query = format!(
                "INSERT INTO tx_inputs (txid, vin_index, prev_txid, prev_vout_index, coinbase_data) VALUES {}",
                build_placeholders(chunk_len, 5)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk_len * 5);
            for i in chunk_start..end {
                params.push(&txids[i]);
                params.push(&vin_indices[i]);
                params.push(&prev_txids[i]);
                params.push(&prev_vouts[i]);
                params.push(&coinbase_datas[i]);
            }

            client.execute(query.as_str(), &params).await?;
        }

        Ok(())
    }

    /// Batch INSERT all outputs across every transaction in the block.
    pub async fn insert_tx_outputs_batch(
        &self,
        client: &impl GenericClient,
        transactions: &[RpcTransaction],
    ) -> Result<(), PoolError> {
        let mut txids: Vec<&str> = Vec::new();
        let mut vout_indices: Vec<i32> = Vec::new();
        let mut values: Vec<i64> = Vec::new();
        let mut script_pub_keys: Vec<Option<&str>> = Vec::new();
        let mut script_types: Vec<Option<&str>> = Vec::new();
        let mut addresses: Vec<Option<String>> = Vec::new();

        for tx in transactions {
            for vout in &tx.vout {
                txids.push(tx.txid.as_str());
                vout_indices.push(vout.n);
                values.push((vout.value * 100_000_000.0).round() as i64);
                script_pub_keys.push(vout.script_pub_key.hex.as_deref());
                script_types.push(vout.script_pub_key.script_type.as_deref());
                addresses.push(vout.script_pub_key.first_address());
            }
        }

        if txids.is_empty() {
            return Ok(());
        }

        // Convert owned Option<String> → Option<&str> for ToSql.
        let addr_refs: Vec<Option<&str>> = addresses.iter().map(|a| a.as_deref()).collect();

        for chunk_start in (0..txids.len()).step_by(BATCH_SIZE) {
            let end = (chunk_start + BATCH_SIZE).min(txids.len());
            let chunk_len = end - chunk_start;

            let query = format!(
                "INSERT INTO tx_outputs (txid, vout_index, value, script_pub_key, script_type, address) VALUES {}",
                build_placeholders(chunk_len, 6)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk_len * 6);
            for i in chunk_start..end {
                params.push(&txids[i]);
                params.push(&vout_indices[i]);
                params.push(&values[i]);
                params.push(&script_pub_keys[i]);
                params.push(&script_types[i]);
                params.push(&addr_refs[i]);
            }

            client.execute(query.as_str(), &params).await?;
        }

        Ok(())
    }

    /// UPSERT a single address.
    /// On first encounter sets first_seen; on conflict updates last_seen.
    pub async fn upsert_address(
        &self,
        client: &impl GenericClient,
        address: &str,
        tx: &str,
        block_height: i64,
    ) -> Result<(), PoolError> {
        let h = block_height as i32;
        client
            .execute(
                "INSERT INTO addresses (address, first_seen_tx, first_seen_block)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (address) DO UPDATE
                 SET last_seen_tx    = EXCLUDED.first_seen_tx,
                     last_seen_block = EXCLUDED.first_seen_block",
                &[&address, &tx, &h],
            )
            .await?;
        Ok(())
    }

    /// Batch INSERT special-transaction payloads for all type > 0 txns in the block.
    pub async fn insert_special_transactions_batch(
        &self,
        client: &impl GenericClient,
        records: &[(&str, i16, Value)],
    ) -> Result<(), PoolError> {
        if records.is_empty() {
            return Ok(());
        }

        for chunk in records.chunks(BATCH_SIZE) {
            let query = format!(
                "INSERT INTO special_transactions (txid, tx_type, payload) VALUES {}",
                build_placeholders(chunk.len(), 3)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk.len() * 3);
            for (txid, tx_type, payload) in chunk.iter() {
                params.push(txid);
                params.push(tx_type);
                params.push(payload);
            }

            client.execute(query.as_str(), &params).await?;
        }

        Ok(())
    }
}
