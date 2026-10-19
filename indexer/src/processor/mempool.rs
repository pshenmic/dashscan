use tracing::{error, info, warn};

use crate::config::Config;
use crate::errors::block_index_error::BlockIndexError;
use crate::processor::BlockProcessor;

const ISLOCKS_PER_CALL: usize = 100;

impl BlockProcessor {
    /// Fallback for the ZMQ rawtx feed: index mempool transactions and
    /// InstantSend locks it missed. Order doesn't matter, a child indexed
    /// before its parent is linked by `link_pending_children`.
    pub async fn sync_mempool(&self, config: &Config) -> Result<(), BlockIndexError> {
        let txids = self.rpc.get_raw_mempool().await?;
        if txids.is_empty() {
            return Ok(());
        }

        let lock_state = self.db.get_instant_lock_state(&txids).await?;

        let mut indexed = 0usize;
        for txid in txids.iter().filter(|t| !lock_state.contains_key(*t)) {
            // The transaction may have been mined or dropped since getrawmempool.
            let raw_bytes = match self.rpc.get_raw_transaction_bytes(txid).await {
                Ok(b) => b,
                Err(e) => {
                    warn!(txid = %txid, "Mempool sync: getrawtransaction failed: {e}");
                    continue;
                }
            };
            match self.index_pending_transaction(raw_bytes, config).await {
                Ok(true) => indexed += 1,
                Ok(false) => {}
                Err(e) => error!(txid = %txid, "Mempool sync: failed to index transaction: {e}"),
            }
        }

        let unlocked: Vec<String> = txids
            .into_iter()
            .filter(|t| lock_state.get(t) != Some(&true))
            .collect();

        let mut locked = 0usize;
        for chunk in unlocked.chunks(ISLOCKS_PER_CALL) {
            for (txid, lock_hex) in self.rpc.get_islocks(chunk).await? {
                self.apply_instant_lock(txid, lock_hex).await?;
                locked += 1;
            }
        }

        if indexed > 0 || locked > 0 {
            info!(indexed, locked, "Mempool sync: filled in what ZMQ missed");
        }
        Ok(())
    }
}
