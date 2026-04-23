use std::collections::{HashMap, HashSet};
use chrono::{DateTime, Utc};
use dashcore::consensus::encode::deserialize_partial;
use deadpool_postgres::Client;
use futures::stream::{self, StreamExt};
use serde_json::Value;
use tracing::{error, info};

/// Max concurrent `getrawtransaction` calls during the RPC fallback path.
/// Local Dash Core handles dozens of parallel JSON-RPC requests fine; this
/// just bounds memory and avoids pathological fan-out when a block spends
/// hundreds of pre-indexed outputs.
const RPC_FALLBACK_CONCURRENCY: usize = 32;

use crate::config::Config;
use crate::db::BATCH_SIZE;
use crate::errors::block_index_error::BlockIndexError;
use crate::p2p_converter;
use crate::rpc::{Block, Transaction};

use super::batch_cache::BatchCache;
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
        let mut cache = BatchCache::default();
        self.write_block(&*db_tx, block, false, &mut cache).await?;
        db_tx.commit().await?;
        Ok(())
    }

    /// Writes a single block and all its data into the given client/transaction.
    /// Does NOT commit — the caller controls transaction boundaries.
    ///
    /// `cache` is populated with the transactions and outputs inserted so
    /// later blocks in the same commit batch can resolve their inputs from
    /// memory instead of hitting the DB.
    pub(super) async fn write_block(
        &self,
        client: &tokio_postgres::Transaction<'_>,
        block: Block,
        chain_locked: bool,
        cache: &mut BatchCache,
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

            self.write_transaction_data(client, &block.tx, &tx_map, Some(block.height as i32), cache)
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
    ///   1. Upsert output addresses → insert tx_outputs  (populates cache)
    ///   2. Resolve input prev_tx_id + address_id from cache; single-join DB
    ///      query for any misses; RPC fallback for pairs still unresolved.
    ///   3. Insert tx_inputs with fully-resolved prev_tx_id + address_id.
    ///
    /// `block_height` is None for pending (mempool) transactions.
    async fn write_transaction_data(
        &self,
        client: &tokio_postgres::Transaction<'_>,
        txs: &[Transaction],
        tx_map: &HashMap<String, i32>,
        block_height: Option<i32>,
        cache: &mut BatchCache,
    ) -> Result<(), BlockIndexError> {
        // Publish the current block's tx ids into the batch cache so later
        // blocks in the same commit can resolve inputs referencing them.
        for (hash, id) in tx_map {
            cache.tx_ids.insert(hash.clone(), *id);
        }

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

        // Cache this block's outputs so in-batch descendants can resolve
        // inputs without a DB round-trip. Keyed by `vout.n` — the same
        // column `insert_tx_outputs_batch` writes and the input lookup
        // queries on — not by Vec position.
        for tx in txs {
            let tx_id = tx_map[&tx.txid];
            for vout in &tx.vout {
                if let Some(addr) = vout.script_pub_key.first_address() {
                    if let Some(&addr_id) = out_addr_id_map.get(&addr) {
                        cache.output_addresses.insert((tx_id, vout.n), addr_id);
                    }
                }
            }
        }

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
        let mut prev_tx_id_map: HashMap<String, i32> = HashMap::new();

        if !needed.is_empty() {
            // Phase 1: satisfy what we can from the in-memory batch cache.
            // A hash is a "miss" if either its tx_id isn't cached or any of
            // its required vout addresses aren't cached.
            let mut miss_hashes: HashSet<String> = HashSet::new();
            for (prev_hash, vouts) in &needed {
                if let Some(&prev_tx_id) = cache.tx_ids.get(prev_hash.as_str()) {
                    prev_tx_id_map.insert(prev_hash.clone(), prev_tx_id);
                    for &vout_idx in vouts {
                        if let Some(&addr_id) = cache.output_addresses.get(&(prev_tx_id, vout_idx)) {
                            input_address_ids.insert((prev_hash.clone(), vout_idx), addr_id);
                        } else {
                            miss_hashes.insert(prev_hash.clone());
                        }
                    }
                } else {
                    miss_hashes.insert(prev_hash.clone());
                }
            }

            // Phase 2: single join for the misses — replaces the previous
            // two-step (SELECT transactions, then SELECT tx_outputs) pair.
            // `hash = ANY($1::bpchar[])` so the unique index stays usable;
            // TRIM only on the returned column to strip CHAR(64) padding.
            if !miss_hashes.is_empty() {
                let miss_list: Vec<String> = miss_hashes.into_iter().collect();
                let query = "SELECT TRIM(t.hash) AS hash, t.id AS tx_id, \
                                    o.vout_index, o.address_id \
                             FROM transactions t \
                             LEFT JOIN tx_outputs o \
                                    ON o.tx_id = t.id AND o.address_id IS NOT NULL \
                             WHERE t.hash = ANY($1::bpchar[])";

                for chunk in miss_list.chunks(BATCH_SIZE) {
                    let chunk_refs: Vec<&str> = chunk.iter().map(|s| s.as_str()).collect();
                    for row in client.query(query, &[&chunk_refs]).await? {
                        let hash: String = row.get("hash");
                        let tx_id: i32 = row.get("tx_id");
                        prev_tx_id_map.insert(hash.clone(), tx_id);
                        cache.tx_ids.insert(hash.clone(), tx_id);

                        let vout_idx: Option<i32> = row.get("vout_index");
                        let addr_id: Option<i32> = row.get("address_id");
                        if let (Some(vout_idx), Some(addr_id)) = (vout_idx, addr_id) {
                            cache.output_addresses.insert((tx_id, vout_idx), addr_id);
                        }
                    }
                }

                // Fill input_address_ids from the refreshed cache for needed pairs.
                for (prev_hash, vout_indices) in &needed {
                    if let Some(&prev_tx_id) = prev_tx_id_map.get(prev_hash.as_str()) {
                        for &vout_idx in vout_indices {
                            if let Some(&addr_id) = cache.output_addresses.get(&(prev_tx_id, vout_idx)) {
                                input_address_ids.insert((prev_hash.clone(), vout_idx), addr_id);
                            }
                        }
                    }
                }
            }

            // Phase 3: RPC fallback for (prev_hash, vout_idx) pairs that are
            // neither cached nor in the DB — typically prev txs outside the
            // indexed height range.
            let mut missing: HashMap<String, Vec<i32>> = HashMap::new();
            for (prev_hash, vout_indices) in &needed {
                for &vout_idx in vout_indices {
                    if !input_address_ids.contains_key(&(prev_hash.clone(), vout_idx)) {
                        missing.entry(prev_hash.clone()).or_default().push(vout_idx);
                    }
                }
            }

            if !missing.is_empty() {
                let mut spending_tx_map: HashMap<(String, i32), i32> = HashMap::new();
                for tx in txs {
                    for vin in &tx.vin {
                        if let (Some(h), Some(v)) = (vin.txid.as_deref(), vin.vout) {
                            spending_tx_map.insert((h.to_string(), v), tx_map[&tx.txid]);
                        }
                    }
                }

                // Fire getrawtransaction concurrently (bounded) — this is the
                // hot path for partial-sync catch-ups where most prev txs
                // sit below START_HEIGHT and can never be served from DB.
                // Pre-regression throughput (~2000 TPS) was achievable only
                // because there was no per-block RPC round-trip at all.
                let hashes: Vec<String> = missing.keys().cloned().collect();
                let fetched: Vec<(String, Result<Transaction, _>)> = stream::iter(hashes)
                    .map(|h| async move {
                        let res = self.rpc.get_raw_transaction(&h).await;
                        (h, res)
                    })
                    .buffer_unordered(RPC_FALLBACK_CONCURRENCY)
                    .collect()
                    .await;

                let mut rpc_upserts: Vec<(String, i32, Option<i32>)> = Vec::new();
                let mut rpc_keys: Vec<((String, i32), String)> = Vec::new();
                let mut seen_rpc: HashSet<String> = HashSet::new();

                for (prev_hash, res) in fetched {
                    match res {
                        Ok(fetched_tx) => {
                            let Some(vout_indices) = missing.get(&prev_hash) else { continue; };
                            for &vout_idx in vout_indices {
                                if let Some(vout) = fetched_tx.vout.get(vout_idx as usize) {
                                    if let Some(addr) = vout.script_pub_key.first_address() {
                                        if seen_rpc.insert(addr.clone()) {
                                            let spending_tx_id = spending_tx_map
                                                .get(&(prev_hash.clone(), vout_idx))
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
            .insert_tx_inputs_batch(client, txs, tx_map, &input_address_ids, &prev_tx_id_map)
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
        let mut cache = BatchCache::default();

        let inserted = if let Some(tx_id) = self.db.insert_pending_transaction(&*db_tx, &tx).await? {
            let tx_map = HashMap::from([(tx.txid.clone(), tx_id)]);
            self.write_transaction_data(&*db_tx, &[tx], &tx_map, None, &mut cache).await?;
            true
        } else {
            false
        };

        db_tx.commit().await?;

        Ok(inserted)
    }
}