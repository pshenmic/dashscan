use deadpool_redis::Pool;
use deadpool_redis::redis::AsyncCommands;

use crate::errors::redis_error::RedisError;

/// Tracks which superblock cycle the cached governance state belongs to.
const CYCLE_KEY: &str = "dao:cycle";
/// Hash of `proposal_hash -> name` for the current cycle's proposals.
const PROPOSALS_KEY: &str = "dao:proposals";

fn votes_key(proposal_hash: &str) -> String {
    format!("dao:votes:{proposal_hash}")
}

/// A governance proposal's identity row, parsed from `gobject list`.
#[derive(Debug, Clone)]
pub struct ProposalRow {
    pub hash: String,
    pub name: Option<String>,
}

/// Redis-backed store for DAO/governance state.
///
/// Governance objects are off-chain, cycle-scoped, and continuously re-served
/// by Dash Core, so we keep them in Redis (not Postgres) and drop the whole
/// set whenever the chain crosses a superblock boundary — see
/// [`BlockProcessor::sync_governance`](crate::processor::BlockProcessor).
#[derive(Clone)]
pub struct DaoStore {
    pool: Pool,
}

impl DaoStore {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    /// The superblock cycle the cached state belongs to, if any has been set.
    pub async fn get_cycle(&self) -> Result<Option<i64>, RedisError> {
        let mut conn = self.pool.get().await?;
        let cycle: Option<i64> = conn.get(CYCLE_KEY).await?;
        Ok(cycle)
    }

    /// Record the cycle the cached state now belongs to.
    pub async fn set_cycle(&self, cycle: i64) -> Result<(), RedisError> {
        let mut conn = self.pool.get().await?;
        let _: () = conn.set(CYCLE_KEY, cycle).await?;
        Ok(())
    }

    /// Drop the proposal registry and every per-proposal vote hash. The cycle
    /// marker is left untouched — the caller overwrites it after flushing.
    pub async fn flush(&self) -> Result<(), RedisError> {
        let mut conn = self.pool.get().await?;
        let hashes: Vec<String> = conn.hkeys(PROPOSALS_KEY).await?;
        for hash in &hashes {
            let _: () = conn.del(votes_key(hash)).await?;
        }
        let _: () = conn.del(PROPOSALS_KEY).await?;
        Ok(())
    }

    /// Upsert the `proposal_hash -> name` registry. Missing names are stored as
    /// empty strings so a hash is always present once seen.
    pub async fn upsert_proposals(&self, rows: &[ProposalRow]) -> Result<(), RedisError> {
        if rows.is_empty() {
            return Ok(());
        }

        let items: Vec<(&str, &str)> = rows
            .iter()
            .map(|r| (r.hash.as_str(), r.name.as_deref().unwrap_or("")))
            .collect();

        let mut conn = self.pool.get().await?;
        let _: () = conn.hset_multiple(PROPOSALS_KEY, &items).await?;
        Ok(())
    }

    /// Append votes for a proposal, keyed by `vote_hash` so repeated syncs are
    /// idempotent. Values are the raw `outpoint:time:outcome:signal` strings
    /// exactly as `gobject getcurrentvotes` returns them.
    pub async fn insert_votes(
        &self,
        proposal_hash: &str,
        votes: &[(String, String)],
    ) -> Result<(), RedisError> {
        if votes.is_empty() {
            return Ok(());
        }

        let items: Vec<(&str, &str)> = votes
            .iter()
            .map(|(vote_hash, raw)| (vote_hash.as_str(), raw.as_str()))
            .collect();

        let mut conn = self.pool.get().await?;
        let _: () = conn.hset_multiple(votes_key(proposal_hash), &items).await?;
        Ok(())
    }
}