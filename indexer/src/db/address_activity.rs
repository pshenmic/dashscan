use chrono::NaiveDate;
use deadpool_postgres::PoolError;
use futures::pin_mut;
use tokio_postgres::Transaction;
use tokio_postgres::binary_copy::BinaryCopyInWriter;
use tokio_postgres::types::{ToSql, Type};

use super::Database;

impl Database {
    /// Bulk-upsert per-day address activity counts via COPY into a
    /// session-lifetime temp staging table, then merge into `address_activity`
    /// adding the new counts onto existing rows. Rows are pre-aggregated per
    /// (day, address_id) by the caller, so the merge hits each target row once.
    pub async fn upsert_address_activity_batch(
        &self,
        client: &Transaction<'_>,
        rows: &[(NaiveDate, i32, i64)],
    ) -> Result<(), PoolError> {
        if rows.is_empty() {
            return Ok(());
        }

        client
            .batch_execute(
                "CREATE TEMP TABLE IF NOT EXISTS address_activity_stage (\
                    day DATE, \
                    address_id INT, \
                    tx_count BIGINT\
                 ); \
                 TRUNCATE address_activity_stage",
            )
            .await?;

        let sink = client
            .copy_in(
                "COPY address_activity_stage (day, address_id, tx_count) FROM STDIN BINARY",
            )
            .await?;
        let types = [Type::DATE, Type::INT4, Type::INT8];
        let writer = BinaryCopyInWriter::new(sink, &types);
        pin_mut!(writer);

        for (day, address_id, tx_count) in rows {
            let values: [&(dyn ToSql + Sync); 3] = [day, address_id, tx_count];
            writer.as_mut().write(&values).await?;
        }
        writer.finish().await?;

        client
            .execute(
                "INSERT INTO address_activity (day, address_id, tx_count) \
                 SELECT day, address_id, tx_count FROM address_activity_stage \
                 ON CONFLICT (day, address_id) \
                 DO UPDATE SET tx_count = address_activity.tx_count + EXCLUDED.tx_count",
                &[],
            )
            .await?;

        // Weekly tier: fold the same staged counts per ISO week. A transaction
        // belongs to exactly one day and therefore one week, so adding batch
        // counts keeps the weekly sums exact.
        client
            .execute(
                "INSERT INTO address_activity_weekly (week, address_id, tx_count) \
                 SELECT date_trunc('week', day)::date, address_id, SUM(tx_count) \
                 FROM address_activity_stage \
                 GROUP BY 1, 2 \
                 ON CONFLICT (week, address_id) \
                 DO UPDATE SET tx_count = address_activity_weekly.tx_count + EXCLUDED.tx_count",
                &[],
            )
            .await?;

        Ok(())
    }
}
