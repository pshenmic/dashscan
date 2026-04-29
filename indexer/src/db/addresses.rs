use std::collections::HashMap;
use deadpool_postgres::PoolError;
use tokio_postgres::types::ToSql;
use tokio_postgres::GenericClient;

use super::{Database, BATCH_SIZE, build_placeholders};

impl Database {
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
                "INSERT INTO addresses \
                 (address, first_seen_tx_id, first_seen_block, last_seen_tx_id, last_seen_block) \
                 VALUES {} \
                 ON CONFLICT (address) DO UPDATE \
                 SET last_seen_tx_id = EXCLUDED.last_seen_tx_id, \
                     last_seen_block = COALESCE(EXCLUDED.last_seen_block, addresses.last_seen_block) \
                 RETURNING id, address",
                build_placeholders(chunk.len(), 5)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk.len() * 5);
            for (addr, tx_id, height) in chunk.iter() {
                params.push(addr);
                params.push(tx_id);
                params.push(height);
                params.push(tx_id);
                params.push(height);
            }

            let rows = client.query(query.as_str(), &params).await?;
            for row in rows {
                address_map.insert(row.get("address"), row.get("id"));
            }
        }

        Ok(address_map)
    }
}