use std::collections::{HashMap, HashSet};
use chrono::{DateTime, Utc};
use dashcore::consensus::encode::deserialize_partial;
use deadpool_postgres::Client;
use serde_json::Value;
use tokio_postgres::types::ToSql;
use tokio_postgres::GenericClient;
use tracing::{error, info, warn};

use crate::config::Config;
use crate::db::BATCH_SIZE;
use crate::errors::block_index_error::BlockIndexError;
use crate::p2p_converter;
use crate::rpc::{Block, Transaction};

use super::BlockProcessor;

impl BlockProcessor {
    /// Indexes a block using an already-acquired pool connection.
    /// Opens a DB transaction, writes everything, and commits.
    pub(super) async fn process_block(
        &self,
        client: &mut Client,
        block: Block,
    ) -> Result<(), BlockIndexError> {
        let db_tx = client.transaction().await?;
        self.write_block(&*db_tx, block, false).await?;
        db_tx.commit().await?;
        Ok(())
    }

    /// Writes a single block and all its data into the given client/transaction.
    /// Does NOT commit — the caller controls transaction boundaries.
    pub(super) async fn write_block(
        &self,
        client: &impl GenericClient,
        block: Block,
        chain_locked: bool,
    ) -> Result<(), BlockIndexError> {
        let timestamp = DateTime::<Utc>::from_timestamp(block.time, 0)
            .ok_or_else(|| BlockIndexError::UnexpectedError("Invalid block timestamp".to_string()))?;

        let is_superblock = (block.height % self.superblock_interval) == 0;

        let (miner_id, miner_name) = block.tx.first()
            .and_then(|tx| tx.vin.first())
            .and_then(|vin| vin.coinbase.as_deref())
            .map(|cb| self.identify_miner(cb))
            .unwrap_or((None, None));

        let miner_name_id = match miner_name {
            Some(ref name) => Some(self.db.upsert_miner_name(client, name).await?),
            None => None,
        };

        self.db
            .insert_block(client, &block, timestamp, is_superblock, miner_id, miner_name_id)
            .await?;

        if !block.tx.is_empty() {
            let tx_map = self.db
                .insert_transactions_batch(client, &block.tx, block.height, chain_locked)
                .await?;

            self.write_transaction_data(client, &block.tx, &tx_map, Some(block.height as i32))
                .await?;

            let special_records: Vec<(i32, i16, Value)> = block.tx
                .iter()
                .filter(|tx| tx.tx_type.unwrap_or(0) > 0)
                .map(|tx| (tx_map[&tx.txid], tx.tx_type.unwrap(), self.build_special_tx_payload(tx)))
                .collect();

            self.db
                .insert_special_transactions_batch(client, &special_records)
                .await?;
        }

        info!(height = block.height, hash = %block.hash, txs = block.tx.len(), "Indexed block");
        Ok(())
    }

    /// Shared pipeline for confirmed and pending transactions.
    ///
    /// Order of operations:
    ///   1. Upsert output addresses → insert tx_outputs  (so address_ids are in DB)
    ///   2. Resolve input address_ids: DB lookup first, RPC fallback for any gaps
    ///   3. Upsert RPC-fetched addresses → insert tx_inputs
    ///
    /// `block_height` is None for pending transactions.
    async fn write_transaction_data(
        &self,
        client: &impl GenericClient,
        txs: &[Transaction],
        tx_map: &HashMap<String, i32>,
        block_height: Option<i32>,
    ) -> Result<(), BlockIndexError> {
        // ── OUTPUTS ──────────────────────────────────────────────────────────
        let mut out_upserts: Vec<(String, i32, Option<i32>)> = Vec::new();
        let mut seen_out: HashMap<String, usize> = HashMap::new();
        let mut vout_to_address: Vec<((i32, String), String)> = Vec::new();

        for tx in txs {
            for (vout_index, vout) in tx.vout.iter().enumerate() {
                if let Some(ref addr) = vout.script_pub_key.first_address() {
                    let tx_id = tx_map[&tx.txid];
                    if let Some(&idx) = seen_out.get(addr.as_str()) {
                        out_upserts[idx] = (addr.clone(), tx_id, block_height);
                    } else {
                        seen_out.insert(addr.clone(), out_upserts.len());
                        out_upserts.push((addr.clone(), tx_id, block_height));
                    }
                    vout_to_address.push(((vout_index as i32, tx.txid.clone()), addr.clone()));
                }
            }
        }

        let out_addr_id_map = self.db.upsert_addresses_batch(client, &out_upserts).await?;

        let mut addresses_map: HashMap<(i32, String), i32> = HashMap::new();
        for ((vout_idx, txid), addr) in vout_to_address {
            let id = *out_addr_id_map.get(&addr).ok_or_else(|| {
                BlockIndexError::UnexpectedError(format!("Missing address id for {addr}"))
            })?;
            addresses_map.insert((vout_idx, txid), id);
        }

        self.db
            .insert_tx_outputs_batch(client, txs, &addresses_map, tx_map)
            .await?;

        // ── INPUT ADDRESS RESOLUTION ──────────────────────────────────────────
        // Collect all (prev_hash, vout_idx) pairs needed.
        let mut needed: HashMap<String, Vec<i32>> = HashMap::new();
        for tx in txs {
            for vin in &tx.vin {
                if let (Some(h), Some(v)) = (&vin.txid, vin.vout) {
                    needed.entry(h.clone()).or_default().push(v);
                }
            }
        }

        let mut input_address_ids: HashMap<(String, i32), i32> = HashMap::new();

        if !needed.is_empty() {
            // Step 1: resolve prev tx hashes → DB ids.
            // Use `hash = ANY($1::bpchar[])` so the unique index on transactions.hash
            // is usable — wrapping `hash` in TRIM() forces a sequential scan.
            let prev_hashes: Vec<&str> = needed.keys().map(|s| s.as_str()).collect();
            let mut prev_tx_id_map: HashMap<String, i32> = HashMap::new();

            for chunk in prev_hashes.chunks(BATCH_SIZE) {
                let query = "SELECT id, TRIM(hash) AS hash FROM transactions \
                             WHERE hash = ANY($1::bpchar[])";
                for row in client.query(query, &[&chunk]).await? {
                    prev_tx_id_map.insert(row.get("hash"), row.get("id"));
                }
            }

            // Step 2: for each resolved prev tx, fetch address_ids from tx_outputs.
            let prev_tx_ids: Vec<i32> = prev_tx_id_map.values().copied().collect();
            let mut addr_from_db: HashMap<(i32, i32), i32> = HashMap::new();

            for chunk in prev_tx_ids.chunks(BATCH_SIZE) {
                let placeholders = (1..=chunk.len())
                    .map(|i| format!("${i}"))
                    .collect::<Vec<_>>()
                    .join(", ");
                let query = format!(
                    "SELECT tx_id, vout_index, address_id FROM tx_outputs \
                     WHERE tx_id IN ({placeholders}) AND address_id IS NOT NULL"
                );
                let params: Vec<&(dyn ToSql + Sync)> =
                    chunk.iter().map(|id| id as &(dyn ToSql + Sync)).collect();
                for row in client.query(query.as_str(), &params).await? {
                    addr_from_db.insert(
                        (row.get("tx_id"), row.get("vout_index")),
                        row.get("address_id"),
                    );
                }
            }

            // Populate input_address_ids from DB data.
            for (prev_hash, vout_indices) in &needed {
                if let Some(&prev_tx_id) = prev_tx_id_map.get(prev_hash.as_str()) {
                    for &vout_idx in vout_indices {
                        if let Some(&addr_id) = addr_from_db.get(&(prev_tx_id, vout_idx)) {
                            input_address_ids.insert((prev_hash.clone(), vout_idx), addr_id);
                        }
                    }
                }
            }

            // Step 3: RPC fallback for (prev_hash, vout_idx) pairs still unresolved.
            // This happens when the prev tx is outside our indexed height range.
            let mut missing: HashMap<String, Vec<i32>> = HashMap::new();
            for (prev_hash, vout_indices) in &needed {
                for &vout_idx in vout_indices {
                    if !input_address_ids.contains_key(&(prev_hash.clone(), vout_idx)) {
                        missing.entry(prev_hash.clone()).or_default().push(vout_idx);
                    }
                }
            }

            if !missing.is_empty() {
                // Map (prev_hash, vout_idx) → spending tx_id for address upserts.
                let mut spending_tx_map: HashMap<(&str, i32), i32> = HashMap::new();
                for tx in txs {
                    for vin in &tx.vin {
                        if let (Some(h), Some(v)) = (vin.txid.as_deref(), vin.vout) {
                            spending_tx_map.insert((h, v), tx_map[&tx.txid]);
                        }
                    }
                }

                let mut rpc_upserts: Vec<(String, i32, Option<i32>)> = Vec::new();
                let mut rpc_keys: Vec<((String, i32), String)> = Vec::new();
                let mut seen_rpc: HashSet<String> = HashSet::new();

                for (prev_hash, vout_indices) in &missing {
                    match self.rpc.get_raw_transaction(prev_hash).await {
                        Ok(fetched_tx) => {
                            for &vout_idx in vout_indices {
                                if let Some(vout) = fetched_tx.vout.get(vout_idx as usize) {
                                    if let Some(addr) = vout.script_pub_key.first_address() {
                                        if seen_rpc.insert(addr.clone()) {
                                            let spending_tx_id = spending_tx_map
                                                .get(&(prev_hash.as_str(), vout_idx))
                                                .copied()
                                                .unwrap_or(0);
                                            rpc_upserts.push((addr.clone(), spending_tx_id, block_height));
                                        }
                                        rpc_keys.push(((prev_hash.clone(), vout_idx), addr));
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            error!("RPC fallback for {prev_hash}: {e}");
                        }
                    }
                }

                if !rpc_upserts.is_empty() {
                    let rpc_id_map = self.db.upsert_addresses_batch(client, &rpc_upserts).await?;
                    for ((prev_hash, vout_idx), addr) in rpc_keys {
                        if let Some(&id) = rpc_id_map.get(&addr) {
                            input_address_ids.insert((prev_hash, vout_idx), id);
                        }
                    }
                }
            }
        }

        // ── INPUTS ───────────────────────────────────────────────────────────
        self.db
            .insert_tx_inputs_batch(client, txs, tx_map, &input_address_ids)
            .await?;

        Ok(())
    }

    pub async fn index_pending_transaction(
        &self,
        raw_bytes: Vec<u8>,
        config: &Config,
    ) -> Result<bool, BlockIndexError> {
        let (raw_tx, _): (dashcore::blockdata::transaction::Transaction, usize) =
            deserialize_partial(&raw_bytes).map_err(|e| {
                BlockIndexError::UnexpectedError(format!("Failed to deserialize rawtx: {e}"))
            })?;

        let tx = p2p_converter::convert_transaction(&raw_tx, config.network);

        let mut client = self.db.begin().await?;
        let db_tx = client.transaction().await?;

        let inserted = if let Some(tx_id) = self.db.insert_pending_transaction(&*db_tx, &tx).await? {
            let tx_map = HashMap::from([(tx.txid.clone(), tx_id)]);
            self.write_transaction_data(&*db_tx, &[tx], &tx_map, None).await?;
            true
        } else {
            false
        };

        db_tx.commit().await?;

        Ok(inserted)
    }
}