use std::collections::HashMap;
use deadpool_postgres::PoolError;
use futures::pin_mut;
use tokio_postgres::Transaction;
use tokio_postgres::binary_copy::BinaryCopyInWriter;
use tokio_postgres::types::{ToSql, Type};

use super::Database;
use crate::rpc::Transaction as RpcTransaction;

impl Database {
    /// Bulk-insert all inputs across every transaction in the block via
    /// `COPY ... FROM STDIN BINARY` into a session-lifetime temp staging
    /// table, then move to `tx_inputs` with `ON CONFLICT DO NOTHING`.
    ///
    /// `input_addresses` maps `(prev_tx_hash, prev_vout_index)` → `address_id`
    /// and `prev_tx_ids` maps `prev_tx_hash` → `prev_tx_id`, both fully
    /// resolved by the caller (in-memory batch cache + single DB join +
    /// RPC fallback). This method does no DB reads.
    pub async fn insert_tx_inputs_batch(
        &self,
        client: &Transaction<'_>,
        transactions: &[&RpcTransaction],
        tx_map: &HashMap<String, i32>,
        input_addresses: &HashMap<(String, i32), i32>,
        prev_tx_ids: &HashMap<String, i32>,
    ) -> Result<(), PoolError> {
        let mut rows: Vec<(
            i32,
            i32,
            Option<&str>,
            Option<i32>,
            Option<i32>,
            Option<&str>,
            Option<i32>,
        )> = Vec::new();

        for tx in transactions {
            let tx = *tx;
            let tx_id = tx_map[&tx.txid];
            for (i, vin) in tx.vin.iter().enumerate() {
                let prev_hash = vin.txid.as_deref();
                let prev_tx_id = vin
                    .txid
                    .as_ref()
                    .and_then(|h| prev_tx_ids.get(h.as_str()).copied());
                let addr_id = vin
                    .txid
                    .as_ref()
                    .zip(vin.vout)
                    .and_then(|(h, v)| input_addresses.get(&(h.clone(), v)).copied());
                rows.push((
                    tx_id,
                    i as i32,
                    prev_hash,
                    prev_tx_id,
                    vin.vout,
                    vin.coinbase.as_deref(),
                    addr_id,
                ));
            }
        }

        if rows.is_empty() {
            return Ok(());
        }

        client
            .batch_execute(
                "CREATE TEMP TABLE IF NOT EXISTS tx_inputs_stage (\
                    tx_id INT, \
                    vin_index INT, \
                    prev_tx_hash CHAR(64), \
                    prev_tx_id INT, \
                    prev_vout_index INT, \
                    coinbase_data TEXT, \
                    address_id INT\
                 ); \
                 TRUNCATE tx_inputs_stage",
            )
            .await?;

        let sink = client
            .copy_in(
                "COPY tx_inputs_stage \
                 (tx_id, vin_index, prev_tx_hash, prev_tx_id, prev_vout_index, coinbase_data, address_id) \
                 FROM STDIN BINARY",
            )
            .await?;

        let types = [
            Type::INT4,
            Type::INT4,
            Type::BPCHAR,
            Type::INT4,
            Type::INT4,
            Type::TEXT,
            Type::INT4,
        ];
        let writer = BinaryCopyInWriter::new(sink, &types);
        pin_mut!(writer);

        for (tx_id, vin_index, prev_tx_hash, prev_tx_id, prev_vout_index, coinbase_data, address_id)
            in &rows
        {
            let values: [&(dyn ToSql + Sync); 7] = [
                tx_id,
                vin_index,
                prev_tx_hash,
                prev_tx_id,
                prev_vout_index,
                coinbase_data,
                address_id,
            ];
            writer.as_mut().write(&values).await?;
        }
        writer.finish().await?;

        client
            .execute(
                "INSERT INTO tx_inputs \
                 (tx_id, vin_index, prev_tx_hash, prev_tx_id, prev_vout_index, coinbase_data, address_id) \
                 SELECT tx_id, vin_index, prev_tx_hash, prev_tx_id, prev_vout_index, coinbase_data, address_id \
                 FROM tx_inputs_stage \
                 ON CONFLICT DO NOTHING",
                &[],
            )
            .await?;

        Ok(())
    }
}