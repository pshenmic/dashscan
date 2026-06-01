use std::collections::HashMap;

use chrono::NaiveDateTime;
use deadpool_postgres::PoolError;
use tokio_postgres::GenericClient;
use tokio_postgres::types::ToSql;

use super::{BATCH_SIZE, Database, build_placeholders};

#[derive(Debug, Clone)]
pub struct ProposalRow {
    pub hash: String,
    pub name: Option<String>,
}

#[derive(Debug, Clone)]
pub struct VoteRow {
    pub vote_hash: String,
    pub proposal_id: i32,
    pub masternode_outpoint: String,
    pub pro_tx_hash: Option<String>,
    pub vote_time: NaiveDateTime,
    pub outcome: String,
    pub signal: String,
    pub seen_at_block: i32,
}

impl Database {
    /// Upsert proposal identity rows. `updated_at_block` only advances when
    /// the display name actually changes; `first_seen_block` is set on first
    /// insert and never moved. Returns a `hash → id` map for all rows.
    pub async fn upsert_proposals(
        &self,
        client: &impl GenericClient,
        rows: &[ProposalRow],
        block_height: i32,
    ) -> Result<HashMap<String, i32>, PoolError> {
        if rows.is_empty() {
            return Ok(HashMap::new());
        }

        for chunk in rows.chunks(BATCH_SIZE) {
            let query = format!(
                "INSERT INTO proposals (hash, name, first_seen_block, updated_at_block) \
                 VALUES {} \
                 ON CONFLICT (hash) DO UPDATE SET \
                   name = EXCLUDED.name, \
                   updated_at_block = EXCLUDED.updated_at_block \
                 WHERE proposals.name IS DISTINCT FROM EXCLUDED.name",
                build_placeholders(chunk.len(), 4)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk.len() * 4);
            for r in chunk {
                params.push(&r.hash);
                params.push(&r.name);
                params.push(&block_height);
                params.push(&block_height);
            }

            client.execute(query.as_str(), &params).await?;
        }

        let hashes: Vec<&str> = rows.iter().map(|r| r.hash.as_str()).collect();
        let id_rows = client
            .query(
                "SELECT hash, id FROM proposals WHERE hash = ANY($1)",
                &[&hashes],
            )
            .await?;

        Ok(id_rows
            .iter()
            .map(|row| (row.get::<_, String>(0), row.get::<_, i32>(1)))
            .collect())
    }

    /// Append-only insert of vote rows; existing `vote_hash` rows are skipped.
    pub async fn insert_votes(
        &self,
        client: &impl GenericClient,
        rows: &[VoteRow],
    ) -> Result<u64, PoolError> {
        if rows.is_empty() {
            return Ok(0);
        }

        let mut total: u64 = 0;

        for chunk in rows.chunks(BATCH_SIZE) {
            let query = format!(
                "INSERT INTO proposal_votes \
                 (vote_hash, proposal_id, masternode_outpoint, pro_tx_hash, \
                  vote_time, outcome, signal, seen_at_block) \
                 VALUES {} \
                 ON CONFLICT (vote_hash) DO NOTHING",
                build_placeholders(chunk.len(), 8)
            );

            let mut params: Vec<&(dyn ToSql + Sync)> = Vec::with_capacity(chunk.len() * 8);
            for r in chunk {
                params.push(&r.vote_hash);
                params.push(&r.proposal_id);
                params.push(&r.masternode_outpoint);
                params.push(&r.pro_tx_hash);
                params.push(&r.vote_time);
                params.push(&r.outcome);
                params.push(&r.signal);
                params.push(&r.seen_at_block);
            }

            total += client.execute(query.as_str(), &params).await?;
        }

        Ok(total)
    }
}