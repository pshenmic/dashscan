use deadpool_postgres::PoolError;
use futures::pin_mut;
use tokio_postgres::Transaction;
use tokio_postgres::binary_copy::BinaryCopyInWriter;
use tokio_postgres::types::{ToSql, Type};

use super::Database;

impl Database {
    /// Bulk-insert newly-created UTXOs via COPY into a session-lifetime temp
    /// staging table, then move into `utxo` with `ON CONFLICT DO NOTHING`.
    pub async fn insert_utxo_batch(
        &self,
        client: &Transaction<'_>,
        rows: &[(i32, i32, Option<i32>, i64)],
    ) -> Result<(), PoolError> {
        if rows.is_empty() {
            return Ok(());
        }

        client
            .batch_execute(
                "CREATE TEMP TABLE IF NOT EXISTS utxo_insert_stage (\
                    tx_id INT, \
                    vout_index INT, \
                    address_id INT, \
                    amount BIGINT\
                 ); \
                 TRUNCATE utxo_insert_stage",
            )
            .await?;

        let sink = client
            .copy_in(
                "COPY utxo_insert_stage (tx_id, vout_index, address_id, amount) FROM STDIN BINARY",
            )
            .await?;
        let types = [Type::INT4, Type::INT4, Type::INT4, Type::INT8];
        let writer = BinaryCopyInWriter::new(sink, &types);
        pin_mut!(writer);

        for (tx_id, vout_index, address_id, amount) in rows {
            let values: [&(dyn ToSql + Sync); 4] = [tx_id, vout_index, address_id, amount];
            writer.as_mut().write(&values).await?;
        }
        writer.finish().await?;

        client
            .execute(
                "INSERT INTO utxo (tx_id, vout_index, address_id, amount) \
                 SELECT tx_id, vout_index, address_id, amount FROM utxo_insert_stage \
                 ON CONFLICT DO NOTHING",
                &[],
            )
            .await?;

        Ok(())
    }

    /// Bulk-delete spent UTXOs. Stages the (tx_id, vout_index) pairs via COPY,
    /// then `DELETE … USING` against the staging table — one round-trip
    /// regardless of batch size, scoped to the small hot UTXO table.
    pub async fn delete_utxo_batch(
        &self,
        client: &Transaction<'_>,
        rows: &[(i32, i32)],
    ) -> Result<(), PoolError> {
        if rows.is_empty() {
            return Ok(());
        }

        client
            .batch_execute(
                "CREATE TEMP TABLE IF NOT EXISTS utxo_delete_stage (\
                    tx_id INT, \
                    vout_index INT\
                 ); \
                 TRUNCATE utxo_delete_stage",
            )
            .await?;

        let sink = client
            .copy_in("COPY utxo_delete_stage (tx_id, vout_index) FROM STDIN BINARY")
            .await?;
        let types = [Type::INT4, Type::INT4];
        let writer = BinaryCopyInWriter::new(sink, &types);
        pin_mut!(writer);

        for (tx_id, vout_index) in rows {
            let values: [&(dyn ToSql + Sync); 2] = [tx_id, vout_index];
            writer.as_mut().write(&values).await?;
        }
        writer.finish().await?;

        client
            .execute(
                "DELETE FROM utxo \
                 USING utxo_delete_stage s \
                 WHERE utxo.tx_id = s.tx_id AND utxo.vout_index = s.vout_index",
                &[],
            )
            .await?;

        Ok(())
    }
}