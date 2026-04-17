use std::collections::HashMap;
use deadpool_postgres::PoolError;
use tokio_postgres::types::ToSql;
use tokio_postgres::GenericClient;

use super::{Database, BATCH_SIZE, build_placeholders};
use crate::rpc::Transaction as RpcTransaction;

impl Database {
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
            for (vout_index, vout) in tx.vout.iter().enumerate() {
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
                "INSERT INTO tx_outputs \
                 (tx_id, vout_index, value, script_pub_key, script_type, address_id) \
                 VALUES {} ON CONFLICT DO NOTHING",
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
}