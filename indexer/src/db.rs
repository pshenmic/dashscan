use std::collections::HashMap;
use deadpool_postgres::{Client, Pool, PoolError};
use serde_json::Value;
use tokio_postgres::types::ToSql;
use tokio_postgres::GenericClient;
use tracing::debug;
use crate::rpc::{MasternodeEntry, Transaction as RpcTransaction};

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

    /// acquires its own connection internally (removes begin() + &**client + drop(client) in code)
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
        let client = self.client().await?;

        let rows = client
            .query(
                "SELECT hash FROM blocks WHERE height = $1",
                &[&(height as i32)],
            )
            .await?;

        Ok(rows.first().map(|r| r.get(0)))
    }

    pub async fn get_block_by_hash(&self, client: &impl GenericClient, hash: &str) -> Result<Option<String>, PoolError> {
        let rows = client
            .query(
                "SELECT hash FROM blocks WHERE hash = $1",
                &[&hash],
            )
            .await?;

        Ok(rows.first().map(|r| r.get(0)))
    }

    #[allow(dead_code)]
    pub async fn delete_block_at_height(&self, height: i64) -> Result<(), PoolError> {
        let client = self.client().await?;
        let h = height as i32;

        // Delete in correct order due to foreign keys
        client
            .execute(
                "DELETE FROM special_transactions WHERE tx_id IN (SELECT id FROM transactions WHERE block_height = $1)",
                &[&h],
            )
            .await?;

        client
            .execute(
                "DELETE FROM tx_outputs WHERE tx_id IN (SELECT id FROM transactions WHERE block_height = $1)",
                &[&h],
            )
            .await?;

        client
            .execute(
                "DELETE FROM tx_inputs WHERE tx_id IN (SELECT id FROM transactions block_height = $1)",
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

    #[allow(dead_code)]
    pub async fn get_block_mn_list_hash(&self, block_hash: &str) -> Result<Option<String>, PoolError> {
        let client = self.client().await?;
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
        merkle_root_mn_list: Option<&str>,
        credit_pool_balance: Option<f64>,
        cbtx_version: Option<i32>,
        cbtx_height: Option<i32>,
        cbtx_merkle_root_quorums: Option<&str>,
        cbtx_best_cl_height_diff: Option<i64>,
        cbtx_best_cl_signature: Option<&str>,
        super_block: Option<bool>,
    ) -> Result<(), PoolError> {
        let naive_timestamp = timestamp.naive_utc();

        client
            .execute(
                "INSERT INTO blocks (
                    hash, height, version, timestamp, previous_block_hash, merkle_root,
                    size, nonce, difficulty, chainwork, tx_count,
                    merkle_root_mn_list, credit_pool_balance,
                    cbtx_version, cbtx_height, cbtx_merkle_root_quorums,
                    cbtx_best_cl_height_diff, cbtx_best_cl_signature,
                    super_block
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
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
                    &merkle_root_mn_list,
                    &credit_pool_balance,
                    &cbtx_version,
                    &cbtx_height,
                    &cbtx_merkle_root_quorums,
                    &cbtx_best_cl_height_diff,
                    &cbtx_best_cl_signature,
                    &super_block
                ],
            )
            .await?;

        Ok(())
    }

    pub async fn upsert_masternodes_batch(
        &self,
        client: &impl GenericClient,
        masternodes: &[MasternodeEntry],
    ) -> Result<(), PoolError> {
        if masternodes.is_empty() {
            return Ok(());
        }

        let last_paid_blocks: Vec<i32> = masternodes.iter().map(|m| m.lastpaidblock).collect();
        let pos_scores: Vec<i32> = masternodes.iter().map(|m| m.pospenaltyscore).collect();
        let consecutive: Vec<i32> = masternodes.iter().map(|m| m.consecutive_payments).collect();

        for (chunk_idx, chunk) in masternodes.chunks(BATCH_SIZE).enumerate() {
            let base = chunk_idx * BATCH_SIZE;
            let query = format!(
                "INSERT INTO masternodes (pro_tx_hash, address, payee, status, type, pos_penalty_score, consecutive_payments, last_paid_time, last_paid_block, owner_address, voting_address, collateral_address, pub_key_operator)
                 VALUES {}
                 ON CONFLICT (pro_tx_hash) DO UPDATE SET
                   address              = EXCLUDED.address,
                   payee                = EXCLUDED.payee,
                   status               = EXCLUDED.status,
                   type                 = EXCLUDED.type,
                   pos_penalty_score    = EXCLUDED.pos_penalty_score,
                   consecutive_payments = EXCLUDED.consecutive_payments,
                   last_paid_time       = EXCLUDED.last_paid_time,
                   last_paid_block      = EXCLUDED.last_paid_block,
                   owner_address        = EXCLUDED.owner_address,
                   voting_address       = EXCLUDED.voting_address,
                   collateral_address   = EXCLUDED.collateral_address,
                   pub_key_operator     = EXCLUDED.pub_key_operator,
                   updated_at           = NOW()",
                build_placeholders(chunk.len(), 13)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk.len() * 13);
            for (i, m) in chunk.iter().enumerate() {
                let abs = base + i;
                params.push(&m.pro_tx_hash);
                params.push(&m.address);
                params.push(&m.payee);
                params.push(&m.status);
                params.push(&m.mn_type);
                params.push(&pos_scores[abs]);
                params.push(&consecutive[abs]);
                params.push(&m.lastpaidtime);
                params.push(&last_paid_blocks[abs]);
                params.push(&m.owneraddress);
                params.push(&m.votingaddress);
                params.push(&m.collateraladdress);
                params.push(&m.pubkeyoperator);
            }

            client.execute(query.as_str(), &params).await?;
        }

        Ok(())
    }

    /// INSERT a single pending (mempool) transaction with NULL block_height.
    /// Returns the transaction's DB id, or None if it already exists.
    pub async fn insert_pending_transaction(
        &self,
        client: &impl GenericClient,
        tx: &RpcTransaction,
    ) -> Result<Option<i32>, PoolError> {
        let tx_type: i16 = tx.tx_type.unwrap_or(0);
        let size: i32 = tx.size as i32;
        let is_coinbase: bool = tx.vin.first().map_or(false, |v| v.coinbase.is_some());
        let block_height: Option<i32> = None;

        let rows = client
            .query(
                "INSERT INTO transactions (hash, block_height, version, type, size, locktime, is_coinbase) \
                 VALUES ($1, $2, $3, $4, $5, $6, $7) \
                 ON CONFLICT (hash) DO NOTHING \
                 RETURNING id",
                &[
                    &tx.txid,
                    &block_height,
                    &tx.version,
                    &tx_type,
                    &size,
                    &tx.locktime,
                    &is_coinbase,
                ],
            )
            .await?;

        Ok(rows.first().map(|r| r.get(0)))
    }

    /// Batch INSERT all transactions for a block in chunks of BATCH_SIZE.
    pub async fn insert_transactions_batch(
        &self,
        client: &impl GenericClient,
        transactions: &[RpcTransaction],
        block_height: i64,
        chain_locked: bool,
    ) -> Result<HashMap<String, i32>, PoolError> {

        let mut tx_map: HashMap<String, i32> = HashMap::new();

        // Precompute type-converted values so we can take stable references to them.
        let tx_types: Vec<i16> = transactions.iter().map(|tx| tx.tx_type.unwrap_or(0)).collect();
        let sizes: Vec<i32> = transactions.iter().map(|tx| tx.size as i32).collect();
        let is_coinbases: Vec<bool> = transactions
            .iter()
            .map(|tx| tx.vin.first().map_or(false, |v| v.coinbase.is_some()))
            .collect();
        let height = block_height as i32;

        for (chunk_idx, chunk) in transactions.chunks(BATCH_SIZE).enumerate() {
            let base = chunk_idx * BATCH_SIZE;
            let query = format!(
                "INSERT INTO transactions (hash, block_height, version, type, size, locktime, is_coinbase, chain_locked) VALUES {} \
                 ON CONFLICT (hash) DO UPDATE SET block_height = COALESCE(transactions.block_height, EXCLUDED.block_height) \
                 RETURNING id, hash",
                build_placeholders(chunk.len(), 8)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk.len() * 8);
            for (i, tx) in chunk.iter().enumerate() {
                let abs = base + i;
                params.push(&tx.txid);
                params.push(&height);
                params.push(&tx.version);
                params.push(&tx_types[abs]);
                params.push(&sizes[abs]);
                params.push(&tx.locktime);
                params.push(&is_coinbases[abs]);
                params.push(&chain_locked);
            }

            let rows = client.query(query.as_str(), &params).await?;

            for row in rows {
                let id: i32 = row.get("id");
                let hash: String = row.get("hash");
                tx_map.insert(hash, id);
            }
        }

        Ok(tx_map)
    }

    /// Batch INSERT all inputs across every transaction in the block.
    pub async fn insert_tx_inputs_batch(
        &self,
        client: &impl GenericClient,
        transactions: &[RpcTransaction],
        tx_map: &HashMap<String, i32>,
    ) -> Result<(), PoolError> {
        // Flatten all inputs into parallel column vecs for stable references.
        let mut tx_ids: Vec<i32> = Vec::new();
        let mut vin_indices: Vec<i32> = Vec::new();
        let mut prev_tx_hasehs: Vec<Option<&str>> = Vec::new();
        let mut prev_vouts: Vec<Option<i32>> = Vec::new();
        let mut coinbase_datas: Vec<Option<&str>> = Vec::new();

        for tx in transactions {
            for (i, vin) in tx.vin.iter().enumerate() {
                tx_ids.push(tx_map[&tx.txid]);
                vin_indices.push(i as i32);
                prev_tx_hasehs.push(vin.txid.as_deref());
                prev_vouts.push(vin.vout);
                coinbase_datas.push(vin.coinbase.as_deref());
            }
        }

        if tx_ids.is_empty() {
            return Ok(());
        }

        for chunk_start in (0..tx_ids.len()).step_by(BATCH_SIZE) {
            let end = (chunk_start + BATCH_SIZE).min(tx_ids.len());
            let chunk_len = end - chunk_start;

            let query = format!(
                "INSERT INTO tx_inputs (tx_id, vin_index, prev_tx_hash, prev_vout_index, coinbase_data) VALUES {} \
                 ON CONFLICT DO NOTHING",
                build_placeholders(chunk_len, 5)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk_len * 5);
            for i in chunk_start..end {
                params.push(&tx_ids[i]);
                params.push(&vin_indices[i]);
                params.push(&prev_tx_hasehs[i]);
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
        addresses_map: &HashMap<(i32, String), i32>,
        tx_map: &HashMap<String, i32>,
    ) -> Result<(), PoolError> {
        let mut tx_ids: Vec<i32> = Vec::new();
        let mut vout_indices: Vec<i32> = Vec::new();
        let mut values: Vec<i64> = Vec::new();
        let mut script_pub_keys: Vec<Option<&str>> = Vec::new();
        let mut script_types: Vec<Option<&str>> = Vec::new();
        let mut address_ids: Vec<Option<&i32>> = Vec::new();

        for tx in transactions {
            for (vout_index,vout) in (&tx.vout).iter().enumerate() {
                tx_ids.push(tx_map[&tx.txid]);
                vout_indices.push(vout.n);
                values.push((vout.value * 100_000_000.0).round() as i64);
                script_pub_keys.push(vout.script_pub_key.hex.as_deref());
                script_types.push(vout.script_pub_key.script_type.as_deref());
                address_ids.push(addresses_map.get(&(vout_index as i32, tx.txid.clone())));
            }
        }

        if tx_ids.is_empty() {
            return Ok(());
        }


        for chunk_start in (0..tx_ids.len()).step_by(BATCH_SIZE) {
            let end = (chunk_start + BATCH_SIZE).min(tx_ids.len());
            let chunk_len = end - chunk_start;

            let query = format!(
                "INSERT INTO tx_outputs (tx_id, vout_index, value, script_pub_key, script_type, address_id) VALUES {} \
                 ON CONFLICT DO NOTHING",
                build_placeholders(chunk_len, 6)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk_len * 6);
            for i in chunk_start..end {
                params.push(&tx_ids[i]);
                params.push(&vout_indices[i]);
                params.push(&values[i]);
                params.push(&script_pub_keys[i]);
                params.push(&script_types[i]);
                params.push(&address_ids[i]);
            }

            client.execute(query.as_str(), &params).await?;
        }

        Ok(())
    }

    /// Batch UPSERT addresses.
    /// Returns a map from address string to its database id.
    pub async fn upsert_addresses_batch(
        &self,
        client: &impl GenericClient,
        records: &[(String, i32, Option<i32>)], // (address, tx_id, block_height)
    ) -> Result<HashMap<String, i32>, PoolError> {
        let mut address_map: HashMap<String, i32> = HashMap::new();

        if records.is_empty() {
            return Ok(address_map);
        }

        for chunk in records.chunks(BATCH_SIZE) {
            let query = format!(
                "INSERT INTO addresses (address, first_seen_tx_id, first_seen_block) VALUES {} \
                 ON CONFLICT (address) DO UPDATE \
                 SET last_seen_tx_id = EXCLUDED.first_seen_tx_id, \
                     last_seen_block = COALESCE(EXCLUDED.first_seen_block, addresses.last_seen_block) \
                 RETURNING id, address",
                build_placeholders(chunk.len(), 3)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk.len() * 3);
            for (addr, tx_id, height) in chunk.iter() {
                params.push(addr);
                params.push(tx_id);
                params.push(height);
            }

            let rows = client.query(query.as_str(), &params).await?;

            for row in rows {
                let id: i32 = row.get("id");
                let addr: String = row.get("address");
                address_map.insert(addr, id);
            }
        }

        Ok(address_map)
    }

    /// Update the `instant_lock` column for a single transaction by txid.
    pub async fn update_transaction_instant_lock(
        &self,
        client: &impl GenericClient,
        txid: &str,
        lock_hex: &str,
    ) -> Result<u64, PoolError> {
        let updated = client
            .execute(
                "UPDATE transactions SET instant_lock = $1 WHERE hash = $2",
                &[&lock_hex, &txid],
            )
            .await?;
        Ok(updated)
    }

    /// Set `chain_locked = TRUE` for all confirmed transactions that aren't already locked.
    /// Used after catch-up to fix any blocks that were indexed during continuous sync
    /// before their chainlock arrived, then the indexer restarted.
    pub async fn backfill_chain_locks(
        &self,
        client: &impl GenericClient,
    ) -> Result<u64, PoolError> {
        let updated = client
            .execute(
                "UPDATE transactions SET chain_locked = TRUE WHERE block_height IS NOT NULL AND chain_locked = FALSE",
                &[],
            )
            .await?;
        Ok(updated)
    }

    /// Set `chain_locked = TRUE` for all transactions at the given block height.
    pub async fn set_chain_locked_for_block(
        &self,
        client: &impl GenericClient,
        block_height: i32,
    ) -> Result<u64, PoolError> {
        let updated = client
            .execute(
                "UPDATE transactions SET chain_locked = TRUE WHERE block_height = $1",
                &[&block_height],
            )
            .await?;
        Ok(updated)
    }

    /// Batch INSERT special-transaction payloads for all type > 0 txns in the block.
    pub async fn insert_special_transactions_batch(
        &self,
        client: &impl GenericClient,
        records: &[(i32, i16, Value)],
    ) -> Result<(), PoolError> {
        if records.is_empty() {
            return Ok(());
        }

        for chunk in records.chunks(BATCH_SIZE) {
            let query = format!(
                "INSERT INTO special_transactions (tx_id, tx_type, payload) VALUES {}",
                build_placeholders(chunk.len(), 3)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk.len() * 3);
            for (tx_id, tx_type, payload) in chunk.iter() {
                params.push(tx_id);
                params.push(tx_type);
                params.push(payload);
            }

            client.execute(query.as_str(), &params).await?;
        }

        Ok(())
    }
}
