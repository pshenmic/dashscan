use std::collections::HashMap;
use deadpool_postgres::PoolError;
use tokio_postgres::types::ToSql;
use tokio_postgres::GenericClient;

use super::{Database, BATCH_SIZE, build_placeholders};
use crate::rpc::Transaction as RpcTransaction;

impl Database {
    /// Batch INSERT all inputs across every transaction in the block.
    ///
    /// `input_addresses` maps `(prev_tx_hash, prev_vout_index)` to an address_id,
    /// resolved by the caller from P2P data.
    pub async fn insert_tx_inputs_batch(
        &self,
        client: &impl GenericClient,
        transactions: &[RpcTransaction],
        tx_map: &HashMap<String, i32>,
        input_addresses: &HashMap<(String, i32), i32>,
    ) -> Result<(), PoolError> {
        // Collect unique prev tx hashes and resolve their IDs from the database.
        let mut unique_hashes: Vec<&str> = Vec::new();
        for tx in transactions {
            for vin in &tx.vin {
                if let Some(ref h) = vin.txid {
                    if !unique_hashes.contains(&h.as_str()) {
                        unique_hashes.push(h.as_str());
                    }
                }
            }
        }

        let mut prev_tx_map: HashMap<String, i32> = HashMap::new();
        for chunk in unique_hashes.chunks(BATCH_SIZE) {
            let placeholders: Vec<String> = (1..=chunk.len()).map(|i| format!("${}", i)).collect();
            let query = format!(
                "SELECT id, TRIM(hash) as hash FROM transactions WHERE TRIM(hash) IN ({})",
                placeholders.join(", ")
            );
            let params: Vec<&(dyn ToSql + Sync)> = chunk
                .iter()
                .map(|h| h as &(dyn ToSql + Sync))
                .collect();
            let rows = client.query(query.as_str(), &params).await?;
            for row in rows {
                prev_tx_map.insert(row.get("hash"), row.get("id"));
            }
        }

        // Flatten all inputs into parallel column vecs for stable references.
        let mut tx_ids: Vec<i32> = Vec::new();
        let mut vin_indices: Vec<i32> = Vec::new();
        let mut prev_tx_hashes: Vec<Option<&str>> = Vec::new();
        let mut prev_tx_ids: Vec<Option<i32>> = Vec::new();
        let mut prev_vouts: Vec<Option<i32>> = Vec::new();
        let mut coinbase_datas: Vec<Option<&str>> = Vec::new();
        let mut addr_ids: Vec<Option<i32>> = Vec::new();

        for tx in transactions {
            for (i, vin) in tx.vin.iter().enumerate() {
                tx_ids.push(tx_map[&tx.txid]);
                vin_indices.push(i as i32);
                prev_tx_hashes.push(vin.txid.as_deref());
                prev_tx_ids.push(
                    vin.txid
                        .as_ref()
                        .and_then(|h| prev_tx_map.get(h.as_str()).copied()),
                );
                prev_vouts.push(vin.vout);
                coinbase_datas.push(vin.coinbase.as_deref());
                addr_ids.push(
                    vin.txid
                        .as_ref()
                        .zip(vin.vout)
                        .and_then(|(h, v)| input_addresses.get(&(h.clone(), v)).copied()),
                );
            }
        }

        if tx_ids.is_empty() {
            return Ok(());
        }

        for chunk_start in (0..tx_ids.len()).step_by(BATCH_SIZE) {
            let end = (chunk_start + BATCH_SIZE).min(tx_ids.len());
            let chunk_len = end - chunk_start;

            let query = format!(
                "INSERT INTO tx_inputs \
                 (tx_id, vin_index, prev_tx_hash, prev_tx_id, prev_vout_index, coinbase_data, address_id) \
                 VALUES {} ON CONFLICT DO NOTHING",
                build_placeholders(chunk_len, 7)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk_len * 7);
            for i in chunk_start..end {
                params.push(&tx_ids[i]);
                params.push(&vin_indices[i]);
                params.push(&prev_tx_hashes[i]);
                params.push(&prev_tx_ids[i]);
                params.push(&prev_vouts[i]);
                params.push(&coinbase_datas[i]);
                params.push(&addr_ids[i]);
            }

            client.execute(query.as_str(), &params).await?;
        }

        Ok(())
    }
}