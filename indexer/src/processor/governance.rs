use std::collections::HashMap;

use chrono::DateTime;
use serde_json::Value;
use tracing::{debug, info, warn};

use crate::db::{ProposalRow, VoteRow};
use crate::errors::block_index_error::BlockIndexError;
use crate::processor::BlockProcessor;

impl BlockProcessor {
    /// Sync governance state (proposals + votes) at the current chain tip.
    ///
    /// Governance objects are off-chain and short-lived in Dash Core memory,
    /// so this is poll-based: every live-sync block we refresh proposals and
    /// pull `getcurrentvotes` per proposal. Vote rows are append-only keyed
    /// by `vote_hash`, so repeated calls are idempotent.
    pub async fn sync_governance(&self, tip_height: i32) -> Result<(), BlockIndexError> {
        let raw_objects = self.rpc.get_governance_objects().await?;
        if raw_objects.is_empty() {
            debug!("No governance objects returned by RPC");
            return Ok(());
        }

        let outpoint_map = self.build_outpoint_map().await?;

        let proposal_rows: Vec<ProposalRow> = raw_objects
            .iter()
            .filter_map(|(_outer_key, obj)| parse_proposal_row(obj))
            .collect();

        if proposal_rows.is_empty() {
            debug!("No parseable governance proposals");
            return Ok(());
        }

        let mut client = self.db.begin().await?;
        let db_tx = client.transaction().await?;

        let hash_to_id = self
            .db
            .upsert_proposals(&*db_tx, &proposal_rows, tip_height)
            .await?;

        let mut votes: Vec<VoteRow> = Vec::new();
        for row in &proposal_rows {
            let proposal_id = match hash_to_id.get(&row.hash) {
                Some(id) => *id,
                None => {
                    warn!(hash = %row.hash, "upsert_proposals did not return id for proposal");
                    continue;
                }
            };

            let raw_votes = self
                .rpc
                .get_governance_object_votes(&row.hash)
                .await?;

            for (vote_hash, raw) in raw_votes {
                if let Some(vote) = parse_vote_row(
                    vote_hash,
                    &raw,
                    proposal_id,
                    &outpoint_map,
                    tip_height,
                ) {
                    votes.push(vote);
                }
            }
        }

        let inserted = self.db.insert_votes(&*db_tx, &votes).await?;
        db_tx.commit().await?;

        info!(
            proposals = proposal_rows.len(),
            votes_seen = votes.len(),
            votes_inserted = inserted,
            tip_height,
            "Synced governance"
        );
        Ok(())
    }

    async fn build_outpoint_map(&self) -> Result<HashMap<String, String>, BlockIndexError> {
        let entries = self.rpc.get_masternode_list().await?;
        Ok(entries
            .into_iter()
            .filter(|e| !e.outpoint.is_empty())
            .map(|e| (e.outpoint, e.pro_tx_hash))
            .collect())
    }
}

/// Extract `(hash, name)` from a single `gobject list` entry. Returns `None`
/// if the entry lacks a hash or its `DataString` is unparseable — we drop
/// rather than poison the batch with placeholder rows.
fn parse_proposal_row(obj: &Value) -> Option<ProposalRow> {
    let hash = obj.get("Hash")?.as_str()?.to_string();
    let name = obj
        .get("DataString")
        .and_then(|v| v.as_str())
        .and_then(|s| serde_json::from_str::<Value>(s).ok())
        .and_then(|parsed| parsed.get("name").and_then(|n| n.as_str()).map(str::to_string));

    Some(ProposalRow { hash, name })
}

/// Parse a `vote_hash → "outpoint:time:outcome:signal"` pair into a `VoteRow`.
fn parse_vote_row(
    vote_hash: String,
    raw: &str,
    proposal_id: i32,
    outpoint_map: &HashMap<String, String>,
    seen_at_block: i32,
) -> Option<VoteRow> {
    let mut parts = raw.splitn(4, ':');
    let outpoint = parts.next()?.to_string();
    let time_str = parts.next()?;
    let outcome = parts.next()?.to_string();
    let signal = parts.next()?.to_string();

    let time_sec: i64 = time_str.parse().ok()?;
    let vote_time = DateTime::from_timestamp(time_sec, 0)?.naive_utc();

    let pro_tx_hash = outpoint_map.get(&outpoint).cloned();

    Some(VoteRow {
        vote_hash,
        proposal_id,
        masternode_outpoint: outpoint,
        pro_tx_hash,
        vote_time,
        outcome,
        signal,
        seen_at_block,
    })
}