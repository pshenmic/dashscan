use deadpool_postgres::PoolError;
use futures::pin_mut;
use tokio_postgres::Transaction;
use tokio_postgres::binary_copy::BinaryCopyInWriter;
use tokio_postgres::types::{ToSql, Type};

use super::Database;

impl Database {
    /// Bulk-insert per-address transaction rows feeding the masternode/address
    /// transaction listings. Rows are pre-deduped per (address_id, tx_id) by the
    /// caller; ON CONFLICT DO NOTHING keeps replays and reorgs idempotent.
    pub async fn insert_address_transactions_batch(
        &self,
        client: &Transaction<'_>,
        rows: &[(i32, i32, i32)],
    ) -> Result<(), PoolError> {
        if rows.is_empty() {
            return Ok(());
        }

        client
            .batch_execute(
                "CREATE TEMP TABLE IF NOT EXISTS address_transactions_stage (\
                    address_id INT, \
                    tx_id INT, \
                    block_height INT\
                 ); \
                 TRUNCATE address_transactions_stage",
            )
            .await?;

        let sink = client
            .copy_in(
                "COPY address_transactions_stage (address_id, tx_id, block_height) FROM STDIN BINARY",
            )
            .await?;
        let types = [Type::INT4, Type::INT4, Type::INT4];
        let writer = BinaryCopyInWriter::new(sink, &types);
        pin_mut!(writer);

        for (address_id, tx_id, block_height) in rows {
            let values: [&(dyn ToSql + Sync); 3] = [address_id, tx_id, block_height];
            writer.as_mut().write(&values).await?;
        }
        writer.finish().await?;

        client
            .execute(
                "INSERT INTO address_transactions (address_id, tx_id, block_height) \
                 SELECT address_id, tx_id, block_height FROM address_transactions_stage \
                 ON CONFLICT (address_id, tx_id) DO NOTHING",
                &[],
            )
            .await?;

        Ok(())
    }
}