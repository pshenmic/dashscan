use std::collections::HashMap;
use deadpool_postgres::PoolError;
use futures::pin_mut;
use tokio_postgres::Transaction;
use tokio_postgres::binary_copy::BinaryCopyInWriter;
use tokio_postgres::types::{ToSql, Type};

use super::Database;
use crate::rpc::Transaction as RpcTransaction;

impl Database {
    /// Bulk-insert all outputs across every transaction in the block via
    /// `COPY ... FROM STDIN BINARY` into a session-lifetime temp staging
    /// table, then move to `tx_outputs` with `ON CONFLICT DO NOTHING`.
    ///
    /// The staging table is `CREATE TEMP TABLE IF NOT EXISTS` + `TRUNCATE`,
    /// so every call reuses it on the same pool connection without DDL.
    pub async fn insert_tx_outputs_batch(
        &self,
        client: &Transaction<'_>,
        transactions: &[&RpcTransaction],
        addresses_map: &HashMap<(i32, String), i32>,
        tx_map: &HashMap<String, i32>,
    ) -> Result<(), PoolError> {
        let mut rows: Vec<(i32, i32, i64, Option<&str>, Option<&str>, Option<i32>)> =
            Vec::new();

        for tx in transactions {
            let tx = *tx;
            let tx_id = tx_map[&tx.txid];
            for (vout_index, vout) in tx.vout.iter().enumerate() {
                let value = (vout.value * 100_000_000.0).round() as i64;
                let addr_id = addresses_map
                    .get(&(vout_index as i32, tx.txid.clone()))
                    .copied();
                rows.push((
                    tx_id,
                    vout.n,
                    value,
                    vout.script_pub_key.hex.as_deref(),
                    vout.script_pub_key.script_type.as_deref(),
                    addr_id,
                ));
            }
        }

        if rows.is_empty() {
            return Ok(());
        }

        client
            .batch_execute(
                "CREATE TEMP TABLE IF NOT EXISTS tx_outputs_stage (\
                    tx_id INT, \
                    vout_index INT, \
                    value BIGINT, \
                    script_pub_key TEXT, \
                    script_type VARCHAR(50), \
                    address_id INT\
                 ); \
                 TRUNCATE tx_outputs_stage",
            )
            .await?;

        let sink = client
            .copy_in(
                "COPY tx_outputs_stage \
                 (tx_id, vout_index, value, script_pub_key, script_type, address_id) \
                 FROM STDIN BINARY",
            )
            .await?;

        let types = [
            Type::INT4,
            Type::INT4,
            Type::INT8,
            Type::TEXT,
            Type::VARCHAR,
            Type::INT4,
        ];
        let writer = BinaryCopyInWriter::new(sink, &types);
        pin_mut!(writer);

        for (tx_id, vout_index, value, script_pub_key, script_type, address_id) in &rows {
            let values: [&(dyn ToSql + Sync); 6] = [
                tx_id,
                vout_index,
                value,
                script_pub_key,
                script_type,
                address_id,
            ];
            writer.as_mut().write(&values).await?;
        }
        writer.finish().await?;

        client
            .execute(
                "INSERT INTO tx_outputs \
                 (tx_id, vout_index, value, script_pub_key, script_type, address_id) \
                 SELECT tx_id, vout_index, value, script_pub_key, script_type, address_id \
                 FROM tx_outputs_stage \
                 ON CONFLICT DO NOTHING",
                &[],
            )
            .await?;

        Ok(())
    }

    /// Record which input spent each output, so the API's outputs aggregate
    /// stops running a LATERAL lookup per output (V30). Rows are
    /// `(prev_tx_id, prev_vout_index, spending_tx_id, vin_index)`.
    ///
    /// `confirmed` selects the precedence rule the LATERAL's
    /// `ORDER BY block_height NULLS LAST` used to encode: a confirmed spend
    /// always wins, a mempool spend is only recorded while the column is still
    /// NULL. Without that guard a mempool double-spend attempt would overwrite
    /// the mined spender.
    pub async fn mark_outputs_spent_batch(
        &self,
        client: &Transaction<'_>,
        rows: &[(i32, i32, i32, i32)],
        confirmed: bool,
    ) -> Result<(), PoolError> {
        if rows.is_empty() {
            return Ok(());
        }

        client
            .batch_execute(
                "CREATE TEMP TABLE IF NOT EXISTS tx_outputs_spent_stage (\
                    prev_tx_id INT, \
                    prev_vout_index INT, \
                    spent_by_tx_id INT, \
                    spent_by_vin_index INT\
                 ); \
                 TRUNCATE tx_outputs_spent_stage",
            )
            .await?;

        let sink = client
            .copy_in(
                "COPY tx_outputs_spent_stage \
                 (prev_tx_id, prev_vout_index, spent_by_tx_id, spent_by_vin_index) \
                 FROM STDIN BINARY",
            )
            .await?;
        let types = [Type::INT4, Type::INT4, Type::INT4, Type::INT4];
        let writer = BinaryCopyInWriter::new(sink, &types);
        pin_mut!(writer);

        for (prev_tx_id, prev_vout_index, spent_by_tx_id, spent_by_vin_index) in rows {
            let values: [&(dyn ToSql + Sync); 4] = [
                prev_tx_id,
                prev_vout_index,
                spent_by_tx_id,
                spent_by_vin_index,
            ];
            writer.as_mut().write(&values).await?;
        }
        writer.finish().await?;

        // DISTINCT ON: one batch can contain two inputs spending the same
        // outpoint only if it carries a double spend, but the staging table is
        // also replayed on retry. Collapsing here keeps the UPDATE single-valued.
        let sql = if confirmed {
            "UPDATE tx_outputs o \
             SET spent_by_tx_id = s.spent_by_tx_id, \
                 spent_by_vin_index = s.spent_by_vin_index \
             FROM (SELECT DISTINCT ON (prev_tx_id, prev_vout_index) * \
                   FROM tx_outputs_spent_stage \
                   ORDER BY prev_tx_id, prev_vout_index, spent_by_tx_id) s \
             WHERE o.tx_id = s.prev_tx_id AND o.vout_index = s.prev_vout_index"
        } else {
            "UPDATE tx_outputs o \
             SET spent_by_tx_id = s.spent_by_tx_id, \
                 spent_by_vin_index = s.spent_by_vin_index \
             FROM (SELECT DISTINCT ON (prev_tx_id, prev_vout_index) * \
                   FROM tx_outputs_spent_stage \
                   ORDER BY prev_tx_id, prev_vout_index, spent_by_tx_id) s \
             WHERE o.tx_id = s.prev_tx_id AND o.vout_index = s.prev_vout_index \
               AND o.spent_by_tx_id IS NULL"
        };

        client.execute(sql, &[]).await?;

        Ok(())
    }
}