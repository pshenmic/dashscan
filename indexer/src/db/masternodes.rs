use std::collections::HashMap;
use deadpool_postgres::PoolError;
use tokio_postgres::types::ToSql;
use tokio_postgres::GenericClient;

use super::{Database, BATCH_SIZE, build_placeholders};
use crate::miner_pool::MinerPool;
use crate::rpc::MasternodeEntry;

impl Database {
    pub async fn ensure_miner_pools(
        &self,
        pools: &[MinerPool],
    ) -> Result<HashMap<String, i32>, PoolError> {
        let client = self.pool.get().await?;

        let existing: HashMap<String, i32> = client
            .query("SELECT id, name FROM miner_pools", &[])
            .await
            .unwrap_or_default()
            .iter()
            .map(|row| (row.get::<_, String>(1), row.get::<_, i32>(0)))
            .collect();

        for pool in pools {
            if !existing.contains_key(&pool.pool_name) {
                client
                    .execute(
                        "INSERT INTO miner_pools (name, url) VALUES ($1, $2)",
                        &[&pool.pool_name, &pool.url],
                    )
                    .await
                    .map_err(|e| {
                        tracing::error!("Failed to insert miner pool {}: {e}", pool.pool_name);
                    })
                    .ok();
            }
        }

        // Re-fetch to include newly inserted IDs
        let all: HashMap<String, i32> = client
            .query("SELECT id, name FROM miner_pools", &[])
            .await
            .unwrap_or_default()
            .iter()
            .map(|row| (row.get::<_, String>(1), row.get::<_, i32>(0)))
            .collect();

        Ok(all)
    }

    /// Upsert a miner name and return its ID.
    pub async fn upsert_miner_name(
        &self,
        client: &impl GenericClient,
        name: &str,
    ) -> Result<i32, PoolError> {
        let row = client
            .query_one(
                "INSERT INTO miner_names (name) VALUES ($1) \
                 ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name \
                 RETURNING id",
                &[&name],
            )
            .await?;

        Ok(row.get(0))
    }

    pub async fn upsert_masternodes_batch(
        &self,
        client: &impl GenericClient,
        masternodes: &[MasternodeEntry],
    ) -> Result<(), PoolError> {
        if masternodes.is_empty() {
            return Ok(());
        }

        let last_paid_blocks: Vec<i32> = masternodes.iter().map(|m| m.lastpaidblock).collect();
        let pos_scores: Vec<i32> = masternodes.iter().map(|m| m.pospenaltyscore).collect();
        let consecutive: Vec<i32> = masternodes.iter().map(|m| m.consecutive_payments).collect();

        for (chunk_idx, chunk) in masternodes.chunks(BATCH_SIZE).enumerate() {
            let base = chunk_idx * BATCH_SIZE;
            let query = format!(
                "INSERT INTO masternodes \
                 (pro_tx_hash, address, payee, status, type, pos_penalty_score, \
                  consecutive_payments, last_paid_time, last_paid_block, \
                  owner_address, voting_address, collateral_address, pub_key_operator) \
                 VALUES {} \
                 ON CONFLICT (pro_tx_hash) DO UPDATE SET \
                   address              = EXCLUDED.address, \
                   payee                = EXCLUDED.payee, \
                   status               = EXCLUDED.status, \
                   type                 = EXCLUDED.type, \
                   pos_penalty_score    = EXCLUDED.pos_penalty_score, \
                   consecutive_payments = EXCLUDED.consecutive_payments, \
                   last_paid_time       = EXCLUDED.last_paid_time, \
                   last_paid_block      = EXCLUDED.last_paid_block, \
                   owner_address        = EXCLUDED.owner_address, \
                   voting_address       = EXCLUDED.voting_address, \
                   collateral_address   = EXCLUDED.collateral_address, \
                   pub_key_operator     = EXCLUDED.pub_key_operator, \
                   updated_at           = NOW()",
                build_placeholders(chunk.len(), 13)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk.len() * 13);
            for (i, m) in chunk.iter().enumerate() {
                let abs = base + i;
                params.push(&m.pro_tx_hash);
                params.push(&m.address);
                params.push(&m.payee);
                params.push(&m.status);
                params.push(&m.mn_type);
                params.push(&pos_scores[abs]);
                params.push(&consecutive[abs]);
                params.push(&m.lastpaidtime);
                params.push(&last_paid_blocks[abs]);
                params.push(&m.owneraddress);
                params.push(&m.votingaddress);
                params.push(&m.collateraladdress);
                params.push(&m.pubkeyoperator);
            }

            client.execute(query.as_str(), &params).await?;
        }

        Ok(())
    }
}