use std::collections::HashMap;
use std::net::SocketAddr;
use dashcore::address::Address;
use dashcore::Txid;

use crate::config::Config;
use crate::errors::block_index_error::BlockIndexError;
use crate::p2p::P2PClient;
use crate::rpc::Transaction;

use super::BlockProcessor;

impl BlockProcessor {
    /// Collect which prev transactions need fetching and which vout indices are needed.
    pub(super) fn collect_prev_tx_needs(transactions: &[Transaction]) -> HashMap<String, Vec<i32>> {
        let mut needed: HashMap<String, Vec<i32>> = HashMap::new();
        for tx in transactions {
            for vin in &tx.vin {
                if let (Some(h), Some(vout)) = (&vin.txid, vin.vout) {
                    needed.entry(h.clone()).or_default().push(vout);
                }
            }
        }
        needed
    }

    /// Extract (prev_tx_hash, vout_index) -> address from fetched raw transactions.
    pub(super) fn extract_input_addresses(
        needed: &HashMap<String, Vec<i32>>,
        fetched: &HashMap<Txid, dashcore::blockdata::transaction::Transaction>,
        network: dashcore::Network,
    ) -> HashMap<(String, i32), String> {
        let mut result: HashMap<(String, i32), String> = HashMap::new();
        for (txid, raw_tx) in fetched {
            let txid_str = txid.to_string();
            if let Some(vout_indices) = needed.get(&txid_str) {
                for &vout_idx in vout_indices {
                    if let Some(output) = raw_tx.output.get(vout_idx as usize) {
                        let is_standard = output.script_pubkey.is_p2pkh() || output.script_pubkey.is_p2sh();
                        if is_standard {
                            if let Ok(addr) = Address::from_script(&output.script_pubkey, network) {
                                result.insert((txid_str.clone(), vout_idx), addr.to_string());
                            }
                        }
                    }
                }
            }
        }
        result
    }

    /// Fetch prev transactions via P2P (opens a fresh connection) and extract output addresses.
    /// Used for live sync where blocks arrive infrequently (~1 block/2.5 min).
    pub(super) async fn resolve_input_addresses(
        &self,
        transactions: &[Transaction],
        config: &Config,
    ) -> Result<HashMap<(String, i32), String>, BlockIndexError> {
        let needed = Self::collect_prev_tx_needs(transactions);
        if needed.is_empty() {
            return Ok(HashMap::new());
        }

        let txids: Vec<Txid> = needed
            .keys()
            .filter_map(|h| h.parse::<Txid>().ok())
            .collect();

        let p2p_addr: SocketAddr = format!("{}:{}", config.p2p_host, config.p2p_port)
            .parse()
            .map_err(|e| BlockIndexError::UnexpectedError(format!("Invalid P2P address: {}", e)))?;
        let network = config.network;

        let fetched = tokio::task::spawn_blocking(move || {
            let mut p2p = P2PClient::connect(p2p_addr, network)?;
            p2p.get_transactions(&txids)
        })
        .await
        .map_err(|e| BlockIndexError::UnexpectedError(format!("P2P task panicked: {}", e)))?
        .map_err(BlockIndexError::from)?;

        Ok(Self::extract_input_addresses(&needed, &fetched, network))
    }
}