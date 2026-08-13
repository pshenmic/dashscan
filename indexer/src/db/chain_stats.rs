use chrono::NaiveDateTime;
use deadpool_postgres::PoolError;
use futures::pin_mut;
use tokio_postgres::Transaction;
use tokio_postgres::binary_copy::BinaryCopyInWriter;
use tokio_postgres::types::{ToSql, Type};

use super::Database;

/// One hour bucket of the global rollup (V32). Pre-aggregated per hour by the
/// caller and added onto whatever is already stored for that hour.
pub struct ChainStatsHour {
    pub hour: NaiveDateTime,
    pub block_count: i32,
    pub tx_count: i64,
    pub size: i64,
    pub difficulty_sum: f64,
    pub normal: i64,
    pub special: i64,
    pub coinjoin: i64,
    pub multisig: i64,
}

impl Database {
    /// Merge this batch's hourly chain totals into `chain_stats_hourly` (V32),
    /// which replaces the range scans behind /transactions/stats,
    /// /transactions/count-series and /blocks/tx-count-stats.
    ///
    /// Confirmed transactions only, and a block belongs to exactly one hour, so
    /// adding per-batch totals never double-counts across batches.
    pub async fn upsert_chain_stats_hourly_batch(
        &self,
        client: &Transaction<'_>,
        rows: &[ChainStatsHour],
    ) -> Result<(), PoolError> {
        if rows.is_empty() {
            return Ok(());
        }

        client
            .batch_execute(
                "CREATE TEMP TABLE IF NOT EXISTS chain_stats_hourly_stage (\
                    hour TIMESTAMP, \
                    block_count INT, \
                    tx_count BIGINT, \
                    size BIGINT, \
                    difficulty_sum DOUBLE PRECISION, \
                    normal BIGINT, \
                    special BIGINT, \
                    coinjoin BIGINT, \
                    multisig BIGINT\
                 ); \
                 TRUNCATE chain_stats_hourly_stage",
            )
            .await?;

        let sink = client
            .copy_in(
                "COPY chain_stats_hourly_stage \
                 (hour, block_count, tx_count, size, difficulty_sum, normal, special, coinjoin, multisig) \
                 FROM STDIN BINARY",
            )
            .await?;
        let types = [
            Type::TIMESTAMP,
            Type::INT4,
            Type::INT8,
            Type::INT8,
            Type::FLOAT8,
            Type::INT8,
            Type::INT8,
            Type::INT8,
            Type::INT8,
        ];
        let writer = BinaryCopyInWriter::new(sink, &types);
        pin_mut!(writer);

        for r in rows {
            let values: [&(dyn ToSql + Sync); 9] = [
                &r.hour,
                &r.block_count,
                &r.tx_count,
                &r.size,
                &r.difficulty_sum,
                &r.normal,
                &r.special,
                &r.coinjoin,
                &r.multisig,
            ];
            writer.as_mut().write(&values).await?;
        }
        writer.finish().await?;

        client
            .execute(
                "INSERT INTO chain_stats_hourly \
                 (hour, block_count, tx_count, size, difficulty_sum, normal, special, coinjoin, multisig) \
                 SELECT hour, block_count, tx_count, size, difficulty_sum, normal, special, coinjoin, multisig \
                 FROM chain_stats_hourly_stage \
                 ON CONFLICT (hour) DO UPDATE SET \
                    block_count    = chain_stats_hourly.block_count + EXCLUDED.block_count, \
                    tx_count       = chain_stats_hourly.tx_count + EXCLUDED.tx_count, \
                    size           = chain_stats_hourly.size + EXCLUDED.size, \
                    difficulty_sum = chain_stats_hourly.difficulty_sum + EXCLUDED.difficulty_sum, \
                    normal         = chain_stats_hourly.normal + EXCLUDED.normal, \
                    special        = chain_stats_hourly.special + EXCLUDED.special, \
                    coinjoin       = chain_stats_hourly.coinjoin + EXCLUDED.coinjoin, \
                    multisig       = chain_stats_hourly.multisig + EXCLUDED.multisig",
                &[],
            )
            .await?;

        Ok(())
    }

    /// Add this batch's confirmed transactions onto the per-filter totals (V33)
    /// that GET /transactions uses instead of COUNT(*) over the whole table.
    /// Rows are pre-aggregated per (type, coinjoin, multisig) by the caller.
    pub async fn bump_transaction_type_counts_batch(
        &self,
        client: &Transaction<'_>,
        rows: &[(i16, bool, bool, i64)],
    ) -> Result<(), PoolError> {
        if rows.is_empty() {
            return Ok(());
        }

        client
            .batch_execute(
                "CREATE TEMP TABLE IF NOT EXISTS transaction_type_counts_stage (\
                    type SMALLINT, \
                    coinjoin BOOLEAN, \
                    multisig BOOLEAN, \
                    count BIGINT\
                 ); \
                 TRUNCATE transaction_type_counts_stage",
            )
            .await?;

        let sink = client
            .copy_in(
                "COPY transaction_type_counts_stage (type, coinjoin, multisig, count) \
                 FROM STDIN BINARY",
            )
            .await?;
        let types = [Type::INT2, Type::BOOL, Type::BOOL, Type::INT8];
        let writer = BinaryCopyInWriter::new(sink, &types);
        pin_mut!(writer);

        for (tx_type, coinjoin, multisig, count) in rows {
            let values: [&(dyn ToSql + Sync); 4] = [tx_type, coinjoin, multisig, count];
            writer.as_mut().write(&values).await?;
        }
        writer.finish().await?;

        client
            .execute(
                "INSERT INTO transaction_type_counts (type, coinjoin, multisig, count) \
                 SELECT type, coinjoin, multisig, count FROM transaction_type_counts_stage \
                 ON CONFLICT (type, coinjoin, multisig) \
                 DO UPDATE SET count = transaction_type_counts.count + EXCLUDED.count",
                &[],
            )
            .await?;

        Ok(())
    }
}
