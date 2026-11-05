use chrono::NaiveDateTime;
use deadpool_postgres::PoolError;

use super::Database;

pub struct NetworkSnapshot {
    pub hour: NaiveDateTime,
    pub masternodes: i32,
    pub masternodes_enabled: i32,
    pub evonodes: i32,
    pub evonodes_enabled: i32,
    pub peers: Option<i32>,
    pub utxo_count: Option<i64>,
    pub utxo_amount: Option<i64>,
}

impl Database {
    pub async fn insert_network_snapshot(&self, s: &NetworkSnapshot) -> Result<(), PoolError> {
        let client = self.pool.get().await?;

        client
            .execute(
                "INSERT INTO network_snapshots \
                 (hour, masternodes, masternodes_enabled, evonodes, evonodes_enabled, peers, utxo_count, utxo_amount) \
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) \
                 ON CONFLICT (hour) DO NOTHING",
                &[
                    &s.hour,
                    &s.masternodes,
                    &s.masternodes_enabled,
                    &s.evonodes,
                    &s.evonodes_enabled,
                    &s.peers,
                    &s.utxo_count,
                    &s.utxo_amount,
                ],
            )
            .await?;

        Ok(())
    }

    /// First block of each indexed day that has no snapshot yet, newest first.
    pub async fn days_without_snapshot(&self) -> Result<Vec<(NaiveDateTime, i32)>, PoolError> {
        let client = self.pool.get().await?;

        let rows = client
            .query(
                "SELECT date_trunc('day', timestamp) AS day, MIN(height) \
                 FROM blocks \
                 GROUP BY 1 \
                 HAVING date_trunc('day', timestamp) NOT IN (SELECT hour FROM network_snapshots) \
                 ORDER BY 1 DESC",
                &[],
            )
            .await?;

        Ok(rows.iter().map(|row| (row.get(0), row.get(1))).collect())
    }
}
