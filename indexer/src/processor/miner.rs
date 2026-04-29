use serde_json::Value;

use crate::rpc::Transaction;

use super::BlockProcessor;

impl BlockProcessor {
    /// Match coinbase data against known miner pool search strings.
    /// Returns (pool_db_id, optional miner nickname extracted from "Mined by <name>/").
    pub(super) fn identify_miner(&self, coinbase_hex: &str) -> (Option<i32>, Option<String>) {
        let bytes = match hex::decode(coinbase_hex) {
            Ok(b) => b,
            Err(_) => return (None, None),
        };
        let coinbase_text = String::from_utf8_lossy(&bytes);

        let mut pool_id: Option<i32> = None;
        'outer: for pool in &self.miner_pools {
            for search in &pool.search_strings {
                if coinbase_text.contains(search.as_str()) {
                    pool_id = self.miner_pool_ids.get(&pool.pool_name).copied();
                    break 'outer;
                }
            }
        }

        // Extract miner nickname from "Mined by <name>/" pattern; strip null bytes
        let miner_name = coinbase_text
            .find("Mined by ")
            .map(|start| &coinbase_text[start + 9..])
            .and_then(|rest| rest.find('/').map(|end| &rest[..end]))
            .map(|name| name.replace('\0', ""))
            .map(|name| name.trim().to_string())
            .filter(|name| !name.is_empty());

        (pool_id, miner_name)
    }

    pub(super) fn build_special_tx_payload(&self, tx: &Transaction) -> Value {
        const SPECIAL_KEYS: &[&str] = &[
            "proRegTx",
            "proUpServTx",
            "proUpRegTx",
            "proUpRevTx",
            "cbTx",
            "qcTx",
            "mnHfTx",
            "assetLockTx",
            "assetUnlockTx",
        ];

        let mut payload = serde_json::Map::new();
        for &key in SPECIAL_KEYS {
            if let Some(val) = tx.extra.get(key) {
                payload.insert(key.to_string(), val.clone());
            }
        }

        if payload.is_empty() {
            if let Some(ref ep) = tx.extra_payload {
                payload.insert("extraPayload".to_string(), Value::String(ep.clone()));
            }
        }

        Value::Object(payload)
    }
}