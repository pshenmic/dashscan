use serde_json::Value;
use tracing::{debug, info};

use crate::dao::ProposalRow;
use crate::errors::block_index_error::BlockIndexError;
use crate::processor::BlockProcessor;

impl BlockProcessor {
    /// Sync governance state (proposals + votes) at the current chain tip into
    /// Redis.
    ///
    /// Governance objects are off-chain and cycle-scoped, so this is poll-based:
    /// every live-sync block we refresh proposals and pull `getcurrentvotes`
    /// per proposal. Votes are keyed by `vote_hash`, so repeated calls are
    /// idempotent. When the chain crosses a superblock boundary the previous
    /// cycle's objects are no longer relevant, so we drop the whole DAO set
    /// before re-syncing the new cycle.
    pub async fn sync_governance(&self, tip_height: i32) -> Result<(), BlockIndexError> {
        let current_cycle = tip_height as i64 / self.superblock_interval;

        if let Some(prev_cycle) = self.dao.get_cycle().await? {
            if prev_cycle != current_cycle {
                info!(prev_cycle, current_cycle, "Superblock crossed — dropping DAO state");
                self.dao.flush().await?;
            }
        }
        self.dao.set_cycle(current_cycle).await?;

        let raw_objects = self.rpc.get_governance_objects().await?;
        if raw_objects.is_empty() {
            debug!("No governance objects returned by RPC");
            return Ok(());
        }

        let proposal_rows: Vec<ProposalRow> = raw_objects
            .iter()
            .filter_map(|(_outer_key, obj)| parse_proposal_row(obj))
            .collect();

        if proposal_rows.is_empty() {
            debug!("No parseable governance proposals");
            return Ok(());
        }

        self.dao.upsert_proposals(&proposal_rows).await?;

        let mut votes_seen = 0usize;
        for row in &proposal_rows {
            let raw_votes = self.rpc.get_governance_object_votes(&row.hash).await?;
            let votes: Vec<(String, String)> = raw_votes.into_iter().collect();
            votes_seen += votes.len();
            self.dao.insert_votes(&row.hash, &votes).await?;
        }

        info!(
            proposals = proposal_rows.len(),
            votes_seen,
            cycle = current_cycle,
            tip_height,
            "Synced governance"
        );
        Ok(())
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