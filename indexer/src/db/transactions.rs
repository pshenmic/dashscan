use std::collections::HashMap;
use deadpool_postgres::PoolError;
use serde_json::Value;
use tokio_postgres::types::ToSql;
use tokio_postgres::GenericClient;

use super::{Database, BATCH_SIZE, build_placeholders};
use crate::rpc::Transaction as RpcTransaction;
use crate::utils::transaction::TransactionUtils;

impl Database {
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
        let transaction_amount = tx.get_transaction_amount();
        let coinjoin = tx.check_coinjoin();

        let rows = client
            .query(
                "INSERT INTO transactions (hash, block_height, version, type, size, locktime, is_coinbase, amount, coinjoin, multisig) \
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) \
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
                    &transaction_amount,
                    &coinjoin,
                    &tx.multisig,
                ],
            )
            .await?;

        Ok(rows.first().map(|r| r.get(0)))
    }

    /// Delete pending transactions that spend an output already spent by a
    /// different confirmed transaction, together with their pending
    /// descendants. Such transactions can never be mined. Outputs that only
    /// the evicted transactions spent go back to the UTXO set.
    /// Returns the number of evicted transactions.
    pub async fn evict_conflicting_pending_transactions(
        &self,
        client: &impl GenericClient,
    ) -> Result<usize, PoolError> {
        let evicted: Vec<i32> = client
            .query(
                "WITH RECURSIVE evicted(id) AS ( \
                     SELECT i.tx_id \
                     FROM transactions t \
                     JOIN tx_inputs i ON i.tx_id = t.id \
                     JOIN tx_outputs o ON o.tx_id = i.prev_tx_id AND o.vout_index = i.prev_vout_index \
                     JOIN transactions s ON s.id = o.spent_by_tx_id \
                     WHERE t.block_height IS NULL \
                       AND s.block_height IS NOT NULL \
                       AND s.id <> i.tx_id \
                     UNION \
                     SELECT i.tx_id \
                     FROM evicted e \
                     JOIN tx_inputs i ON i.prev_tx_id = e.id \
                     JOIN transactions c ON c.id = i.tx_id AND c.block_height IS NULL \
                 ) \
                 SELECT id FROM evicted",
                &[],
            )
            .await?
            .iter()
            .map(|r| r.get(0))
            .collect();

        if evicted.is_empty() {
            return Ok(0);
        }

        client
            .execute(
                "WITH freed AS ( \
                     UPDATE tx_outputs \
                     SET spent_by_tx_id = NULL, spent_by_vin_index = NULL \
                     WHERE spent_by_tx_id = ANY($1) AND NOT tx_id = ANY($1) \
                     RETURNING tx_id, vout_index, address_id, value \
                 ) \
                 INSERT INTO utxo (tx_id, vout_index, address_id, amount) \
                 SELECT tx_id, vout_index, address_id, value FROM freed \
                 ON CONFLICT DO NOTHING",
                &[&evicted],
            )
            .await?;

        // Nullable FKs; without this the DELETE below fails at commit.
        client
            .execute(
                "UPDATE addresses SET \
                     first_seen_tx_id = CASE WHEN first_seen_tx_id = ANY($1) THEN NULL ELSE first_seen_tx_id END, \
                     last_seen_tx_id = CASE WHEN last_seen_tx_id = ANY($1) THEN NULL ELSE last_seen_tx_id END \
                 WHERE id IN (SELECT address_id FROM tx_outputs WHERE tx_id = ANY($1) \
                              UNION SELECT address_id FROM tx_inputs WHERE tx_id = ANY($1)) \
                   AND (first_seen_tx_id = ANY($1) OR last_seen_tx_id = ANY($1))",
                &[&evicted],
            )
            .await?;

        // utxo rows go with tx_outputs via ON DELETE CASCADE.
        client
            .execute("DELETE FROM tx_outputs WHERE tx_id = ANY($1)", &[&evicted])
            .await?;

        client
            .execute("DELETE FROM tx_inputs WHERE tx_id = ANY($1)", &[&evicted])
            .await?;

        client
            .execute("DELETE FROM transactions WHERE id = ANY($1)", &[&evicted])
            .await?;

        Ok(evicted.len())
    }

    /// Batch INSERT transactions from one or more blocks in a single call.
    /// Each tuple carries its own `(block_height, chain_locked)` so the caller
    /// can flatten multiple blocks' transactions into one insert.
    pub async fn insert_transactions_batch(
        &self,
        client: &impl GenericClient,
        tx_meta: &[(&RpcTransaction, i32, bool)],
    ) -> Result<HashMap<String, i32>, PoolError> {
        let mut tx_map: HashMap<String, i32> = HashMap::new();

        if tx_meta.is_empty() {
            return Ok(tx_map);
        }

        // type, size, coinbase, transfer amount, coinjoin
        let tx_infos: Vec<(i16, i32, bool, i64, bool, bool)> = tx_meta.iter().map(|(tx, _, _)| {
            (
                tx.tx_type.unwrap_or(0),
                tx.size as i32,
                tx.vin.first().map_or(false, |v| v.coinbase.is_some()),
                tx.get_transaction_amount(),
                tx.check_coinjoin(),
                tx.multisig,
            )
        }).collect();

        for (chunk_idx, chunk) in tx_meta.chunks(BATCH_SIZE).enumerate() {
            let base = chunk_idx * BATCH_SIZE;
            let query = format!(
                "INSERT INTO transactions (hash, block_height, version, type, size, locktime, is_coinbase, chain_locked, amount, coinjoin, multisig) VALUES {} \
                 ON CONFLICT (hash) DO UPDATE SET block_height = COALESCE(transactions.block_height, EXCLUDED.block_height) \
                 RETURNING id, hash",
                build_placeholders(chunk.len(), 11)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk.len() * 12);
            for (i, (tx, height, chain_locked)) in chunk.iter().enumerate() {
                let abs = base + i;

                let tx_info = &tx_infos[abs];

                params.push(&tx.txid);
                params.push(height);
                params.push(&tx.version);
                params.push(&tx_info.0);
                params.push(&tx_info.1);
                params.push(&tx.locktime);
                params.push(&tx_info.2);
                params.push(chain_locked);
                params.push(&tx_info.3);
                params.push(&tx_info.4);
                params.push(&tx_info.5);
            }

            let rows = client.query(query.as_str(), &params).await?;
            for row in rows {
                tx_map.insert(row.get("hash"), row.get("id"));
            }
        }

        Ok(tx_map)
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
    pub async fn backfill_chain_locks(&self, client: &impl GenericClient) -> Result<u64, PoolError> {
        let updated = client
            .execute(
                "UPDATE transactions SET chain_locked = TRUE \
                 WHERE block_height IS NOT NULL AND chain_locked = FALSE",
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