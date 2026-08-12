use chrono::NaiveDate;
use deadpool_postgres::PoolError;
use futures::pin_mut;
use tokio_postgres::Transaction;
use tokio_postgres::binary_copy::BinaryCopyInWriter;
use tokio_postgres::types::{ToSql, Type};

use super::Database;

impl Database {
    /// Add this batch's received/sent/tx_count onto the running per-address
    /// totals (V28), so GET /address/:address stops recomputing them from the
    /// address's whole history. Rows are pre-aggregated per address_id by the
    /// caller, so the UPDATE touches each target row once.
    pub async fn bump_address_stats_batch(
        &self,
        client: &Transaction<'_>,
        rows: &[(i32, i64, i64, i64)],
    ) -> Result<(), PoolError> {
        if rows.is_empty() {
            return Ok(());
        }

        client
            .batch_execute(
                "CREATE TEMP TABLE IF NOT EXISTS address_stats_stage (\
                    address_id INT, \
                    received BIGINT, \
                    sent BIGINT, \
                    tx_count BIGINT\
                 ); \
                 TRUNCATE address_stats_stage",
            )
            .await?;

        let sink = client
            .copy_in(
                "COPY address_stats_stage (address_id, received, sent, tx_count) FROM STDIN BINARY",
            )
            .await?;
        let types = [Type::INT4, Type::INT8, Type::INT8, Type::INT8];
        let writer = BinaryCopyInWriter::new(sink, &types);
        pin_mut!(writer);

        for (address_id, received, sent, tx_count) in rows {
            let values: [&(dyn ToSql + Sync); 4] = [address_id, received, sent, tx_count];
            writer.as_mut().write(&values).await?;
        }
        writer.finish().await?;

        client
            .execute(
                "UPDATE addresses a \
                 SET received = a.received + s.received, \
                     sent     = a.sent + s.sent, \
                     tx_count = a.tx_count + s.tx_count \
                 FROM address_stats_stage s \
                 WHERE a.id = s.address_id",
                &[],
            )
            .await?;

        Ok(())
    }

    /// Merge this batch's per-(address, day) net flow into
    /// `address_balance_deltas` (V31), which the balance chart reads instead of
    /// replaying the address's transaction history.
    pub async fn upsert_address_balance_deltas_batch(
        &self,
        client: &Transaction<'_>,
        rows: &[(i32, NaiveDate, i64, i64)],
    ) -> Result<(), PoolError> {
        if rows.is_empty() {
            return Ok(());
        }

        client
            .batch_execute(
                "CREATE TEMP TABLE IF NOT EXISTS address_balance_deltas_stage (\
                    address_id INT, \
                    day DATE, \
                    received BIGINT, \
                    sent BIGINT\
                 ); \
                 TRUNCATE address_balance_deltas_stage",
            )
            .await?;

        let sink = client
            .copy_in(
                "COPY address_balance_deltas_stage (address_id, day, received, sent) \
                 FROM STDIN BINARY",
            )
            .await?;
        let types = [Type::INT4, Type::DATE, Type::INT8, Type::INT8];
        let writer = BinaryCopyInWriter::new(sink, &types);
        pin_mut!(writer);

        for (address_id, day, received, sent) in rows {
            let values: [&(dyn ToSql + Sync); 4] = [address_id, day, received, sent];
            writer.as_mut().write(&values).await?;
        }
        writer.finish().await?;

        client
            .execute(
                "INSERT INTO address_balance_deltas (address_id, day, received, sent) \
                 SELECT address_id, day, received, sent FROM address_balance_deltas_stage \
                 ON CONFLICT (address_id, day) \
                 DO UPDATE SET received = address_balance_deltas.received + EXCLUDED.received, \
                               sent     = address_balance_deltas.sent + EXCLUDED.sent",
                &[],
            )
            .await?;

        Ok(())
    }
}
