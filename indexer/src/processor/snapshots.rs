use chrono::{NaiveDateTime, Timelike, Utc};
use serde_json::Value;
use tracing::{error, info};

use crate::db::NetworkSnapshot;
use crate::errors::block_index_error::BlockIndexError;
use crate::peers::PeerStore;
use crate::processor::BlockProcessor;
use crate::utils::transaction::to_sat;

impl BlockProcessor {
    pub async fn snapshot_loop(&self, peers: PeerStore) {
        if let Err(e) = self.backfill_masternode_snapshots().await {
            error!("Failed to backfill masternode snapshots: {e}");
        }

        let mut interval = tokio::time::interval(std::time::Duration::from_secs(3600));
        loop {
            interval.tick().await;
            if let Err(e) = self.take_network_snapshot(&peers).await {
                error!("Failed to take network snapshot: {e}");
            }
        }
    }

    async fn take_network_snapshot(&self, peers: &PeerStore) -> Result<(), BlockIndexError> {
        let now = Utc::now().naive_utc();
        let hour = now
            .with_minute(0)
            .and_then(|t| t.with_second(0))
            .and_then(|t| t.with_nanosecond(0))
            .unwrap_or(now);

        let tip = self.rpc.get_block_count().await? as i32;
        let mut snapshot = self.masternode_snapshot(hour, tip).await?;
        snapshot.peers = peers.count_available().await.ok().filter(|&n| n > 0);

        let utxo = self.rpc.get_txoutset_info().await?;
        snapshot.utxo_count = utxo["txouts"].as_i64();
        snapshot.utxo_amount = utxo["total_amount"].as_f64().map(to_sat);

        self.db.insert_network_snapshot(&snapshot).await?;
        info!(%hour, "Took network snapshot");
        Ok(())
    }

    // Peers and UTXO have no history in Core, so backfilled days carry masternodes only
    async fn backfill_masternode_snapshots(&self) -> Result<(), BlockIndexError> {
        let days = self.db.days_without_snapshot().await?;
        if days.is_empty() {
            return Ok(());
        }

        info!(days = days.len(), "Backfilling masternode snapshots");
        // Newest first, so the first empty list is the DIP3 activation boundary
        for (day, height) in days {
            let snapshot = self.masternode_snapshot(day, height).await?;
            if snapshot.masternodes + snapshot.evonodes == 0 {
                break;
            }
            self.db.insert_network_snapshot(&snapshot).await?;
        }
        info!("Backfilled masternode snapshots");
        Ok(())
    }

    async fn masternode_snapshot(&self, hour: NaiveDateTime, height: i32) -> Result<NetworkSnapshot, BlockIndexError> {
        let list = self.rpc.get_protx_list(height).await?;

        let mut snapshot = NetworkSnapshot {
            hour,
            masternodes: 0,
            masternodes_enabled: 0,
            evonodes: 0,
            evonodes_enabled: 0,
            peers: None,
            utxo_count: None,
            utxo_amount: None,
        };

        for mn in &list {
            let enabled = mn["state"]["PoSeBanHeight"].as_i64() == Some(-1);
            if mn["type"] == Value::from("Evo") {
                snapshot.evonodes += 1;
                snapshot.evonodes_enabled += enabled as i32;
            } else {
                snapshot.masternodes += 1;
                snapshot.masternodes_enabled += enabled as i32;
            }
        }

        Ok(snapshot)
    }
}
