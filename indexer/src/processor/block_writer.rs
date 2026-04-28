use std::collections::{HashMap, HashSet};
use chrono::{DateTime, Utc};
use dashcore::consensus::encode::deserialize_partial;
use deadpool_postgres::Client;
use futures::stream::{self, StreamExt};
use serde_json::Value;
use tracing::{error, info};

/// Max concurrent `getrawtransaction` calls during the RPC fallback path.
/// Local Dash Core handles dozens of parallel JSON-RPC requests fine; this
/// just bounds memory and avoids pathological fan-out when a batch spends
/// hundreds of pre-indexed outputs.
const RPC_FALLBACK_CONCURRENCY: usize = 32;

use crate::config::Config;
use crate::db::BATCH_SIZE;
use crate::errors::block_index_error::BlockIndexError;
use crate::p2p_converter;
use crate::rpc::{Block, Transaction};

use super::utxo_cache::UtxoCache;
use super::BlockProcessor;

/// A parsed block enriched with its metadata, ready to be flushed as part of
/// a multi-block commit batch. Produced by `prepare_block` (no DB I/O).
pub(super) struct PendingBlock {
    pub block: Block,
    pub chain_locked: bool,
    pub is_superblock: bool,
    pub miner_id: Option<i32>,
    pub miner_name: Option<String>,
    pub timestamp: DateTime<Utc>,
}

impl BlockProcessor {
    /// Pure parse/enrich step — no DB I/O. Safe to call while accumulating.
    pub(super) fn prepare_block(
        &self,
        block: Block,
        chain_locked: bool,
    ) -> Result<PendingBlock, BlockIndexError> {
        let timestamp = DateTime::<Utc>::from_timestamp(block.time, 0).ok_or_else(|| {
            BlockIndexError::UnexpectedError("Invalid block timestamp".to_string())
        })?;

        let is_superblock = (block.height % self.superblock_interval) == 0;

        let (miner_id, miner_name) = block
            .tx
            .first()
            .and_then(|tx| tx.vin.first())
            .and_then(|vin| vin.coinbase.as_deref())
            .map(|cb| self.identify_miner(cb))
            .unwrap_or((None, None));

        Ok(PendingBlock {
            block,
            chain_locked,
            is_superblock,
            miner_id,
            miner_name,
            timestamp,
        })
    }

    /// Live-sync path: wraps prepare + single-block write_batch + commit.
    /// Uses a zero-capacity UtxoCache (no cross-call benefit) so the cache
    /// helpers compile-time inline to no-ops on this path.
    pub(super) async fn process_block(
        &self,
        client: &mut Client,
        block: Block,
    ) -> Result<(), BlockIndexError> {
        let pending = self.prepare_block(block, false)?;
        let db_tx = client.transaction().await?;
        let mut cache = UtxoCache::new(0);
        self.write_batch(&*db_tx, &[pending], &mut cache).await?;
        db_tx.commit().await?;
        Ok(())
    }

    /// Flush an entire commit batch with one bulk round-trip per table.
    ///
    /// 1. Upsert unique miner names.
    /// 2. INSERT block headers (per-block — cheap, 21 cols each).
    /// 3. INSERT all transactions (single batch, RETURNING id).
    /// 4. Upsert output addresses batch-wide.
    /// 5. COPY tx_outputs batch-wide.
    /// 6. Resolve input prev_tx_id + address_id: in-batch map → DB join → RPC.
    /// 7. COPY tx_inputs batch-wide.
    /// 8. INSERT special_transactions batch-wide.
    pub(super) async fn write_batch(
        &self,
        client: &tokio_postgres::Transaction<'_>,
        pending: &[PendingBlock],
        cache: &mut UtxoCache,
    ) -> Result<(), BlockIndexError> {
        if pending.is_empty() {
            return Ok(());
        }

        // ── 1. Miner names (typically 1–5 unique per batch; loop is fine)
        let mut unique_names: HashSet<&str> = HashSet::new();
        for p in pending {
            if let Some(n) = p.miner_name.as_deref() {
                unique_names.insert(n);
            }
        }
        let mut miner_name_ids: HashMap<String, i32> = HashMap::new();
        for name in unique_names {
            let id = self.db.upsert_miner_name(client, name).await?;
            miner_name_ids.insert(name.to_string(), id);
        }

        // ── 2. Block headers
        for p in pending {
            let name_id = p
                .miner_name
                .as_deref()
                .and_then(|n| miner_name_ids.get(n).copied());
            self.db
                .insert_block(
                    client,
                    &p.block,
                    p.timestamp,
                    p.is_superblock,
                    p.miner_id,
                    name_id,
                )
                .await?;
        }

        // ── 3. Transactions (one batched INSERT across every block)
        let mut tx_meta: Vec<(&Transaction, i32, bool)> = Vec::new();
        for p in pending {
            let h = p.block.height as i32;
            for tx in &p.block.tx {
                tx_meta.push((tx, h, p.chain_locked));
            }
        }
        if tx_meta.is_empty() {
            return Ok(());
        }
        let tx_map = self.db.insert_transactions_batch(client, &tx_meta).await?;
        let flat_txs: Vec<&Transaction> = tx_meta.iter().map(|(tx, _, _)| *tx).collect();

        // ── 4. Output addresses (batch-wide, deduped, last-block wins)
        let mut out_upserts: Vec<(String, i32, Option<i32>)> = Vec::new();
        let mut seen_addr: HashMap<String, usize> = HashMap::new();
        let mut vout_addr_pairs: Vec<((i32, String), String)> = Vec::new();

        for p in pending {
            let height = p.block.height as i32;
            for tx in &p.block.tx {
                let tx_id = tx_map[&tx.txid];
                for (vout_index, vout) in tx.vout.iter().enumerate() {
                    if let Some(addr) = vout.script_pub_key.first_address() {
                        if let Some(&idx) = seen_addr.get(addr.as_str()) {
                            out_upserts[idx] = (addr.clone(), tx_id, Some(height));
                        } else {
                            seen_addr.insert(addr.clone(), out_upserts.len());
                            out_upserts.push((addr.clone(), tx_id, Some(height)));
                        }
                        vout_addr_pairs.push(((vout_index as i32, tx.txid.clone()), addr));
                    }
                }
            }
        }

        let out_addr_id_map = self.db.upsert_addresses_batch(client, &out_upserts).await?;

        let mut addresses_map: HashMap<(i32, String), i32> = HashMap::new();
        for ((vout_idx, txid), addr) in vout_addr_pairs {
            if let Some(&id) = out_addr_id_map.get(&addr) {
                addresses_map.insert((vout_idx, txid), id);
            }
        }

        // ── 5. COPY tx_outputs
        self.db
            .insert_tx_outputs_batch(client, &flat_txs, &addresses_map, &tx_map)
            .await?;

        // ── 5b. Insert every newly-created output into the live UTXO set,
        // carrying address_id and value so address-scoped API queries hit
        // this small hot table instead of joining tx_outputs.
        let mut utxo_inserts: Vec<(i32, i32, Option<i32>, i64)> = Vec::new();
        for tx in &flat_txs {
            let tx_id = tx_map[&tx.txid];
            for vout in &tx.vout {
                let addr_id = addresses_map
                    .get(&(vout.n, tx.txid.clone()))
                    .copied();
                let amount = (vout.value * 100_000_000.0).round() as i64;
                utxo_inserts.push((tx_id, vout.n, addr_id, amount));
            }
        }
        self.db.insert_utxo_batch(client, &utxo_inserts).await?;

        // In-memory output index for resolving in-batch inputs without a DB hit.
        // Same loop also feeds the persistent UtxoCache so the *next* batch's
        // Phase 6a-bis can hit on these outputs without a DB round-trip.
        let mut output_cache: HashMap<(i32, i32), i32> = HashMap::new();
        for p in pending {
            for tx in &p.block.tx {
                let tx_id = tx_map[&tx.txid];
                let mut outputs_for_cache: Vec<(i32, i32)> = Vec::new();
                for vout in &tx.vout {
                    if let Some(addr) = vout.script_pub_key.first_address() {
                        if let Some(&addr_id) = out_addr_id_map.get(&addr) {
                            output_cache.insert((tx_id, vout.n), addr_id);
                            outputs_for_cache.push((vout.n, addr_id));
                        }
                    }
                }
                cache.insert(&tx.txid, tx_id, &outputs_for_cache);
            }
        }

        // ── 6. Input address resolution
        let mut needed: HashMap<String, Vec<i32>> = HashMap::new();
        for p in pending {
            for tx in &p.block.tx {
                for vin in &tx.vin {
                    if let (Some(h), Some(v)) = (&vin.txid, vin.vout) {
                        needed.entry(h.clone()).or_default().push(v);
                    }
                }
            }
        }

        let mut input_address_ids: HashMap<(String, i32), i32> = HashMap::new();
        let mut prev_tx_id_map: HashMap<String, i32> = HashMap::new();

        if !needed.is_empty() {
            // Phase 6 instrumentation: track where each input's prev-tx hash was
            // resolved (in-batch / cache / DB / RPC) and how long the DB join took.
            let needed_hashes = needed.len();
            let needed_pairs: usize = needed.values().map(|v| v.len()).sum();
            let mut inbatch_hits: usize = 0;
            let mut cache_hits: usize = 0;
            let mut db_misses: usize = 0;
            let mut db_rows: usize = 0;
            let mut db_query_us: u128 = 0;

            // 6a: in-batch resolution from tx_map + output_cache.
            let mut miss_hashes: HashSet<String> = HashSet::new();
            for (prev_hash, vouts) in &needed {
                if let Some(&prev_tx_id) = tx_map.get(prev_hash) {
                    prev_tx_id_map.insert(prev_hash.clone(), prev_tx_id);
                    for &vout_idx in vouts {
                        if let Some(&addr_id) = output_cache.get(&(prev_tx_id, vout_idx)) {
                            input_address_ids.insert((prev_hash.clone(), vout_idx), addr_id);
                            inbatch_hits += 1;
                        } else {
                            miss_hashes.insert(prev_hash.clone());
                        }
                    }
                } else {
                    miss_hashes.insert(prev_hash.clone());
                }
            }

            // 6a-bis: persistent UTXO cache lookup for everything missed in 6a.
            // A hash is dropped from `miss_hashes` only if every one of its
            // unresolved vouts hit the cache; partial hits leave the hash for
            // Phase 6b to handle.
            let mut still_miss: HashSet<String> = HashSet::with_capacity(miss_hashes.len());
            for prev_hash in miss_hashes {
                let Some(vouts) = needed.get(prev_hash.as_str()) else {
                    continue;
                };
                let mut all_resolved = true;
                for &vout_idx in vouts {
                    if input_address_ids.contains_key(&(prev_hash.clone(), vout_idx)) {
                        continue;
                    }
                    if let Some((prev_tx_id, addr_id)) = cache.lookup(&prev_hash, vout_idx) {
                        prev_tx_id_map.insert(prev_hash.clone(), prev_tx_id);
                        input_address_ids.insert((prev_hash.clone(), vout_idx), addr_id);
                        cache_hits += 1;
                    } else {
                        all_resolved = false;
                    }
                }
                if !all_resolved {
                    still_miss.insert(prev_hash);
                }
            }
            let miss_hashes = still_miss;

            // 6b: bulk DB join for hashes with at least one miss.
            // Empirically faster than per-pair UNNEST: sequential output reads
            // from cached pages beat the seek count of targeted lookups.
            if !miss_hashes.is_empty() {
                db_misses = miss_hashes.len();
                let miss_list: Vec<String> = miss_hashes.into_iter().collect();
                let query = "SELECT t.hash AS hash, t.id AS tx_id, \
                                    o.vout_index, o.address_id \
                             FROM transactions t \
                             LEFT JOIN tx_outputs o \
                                    ON o.tx_id = t.id AND o.address_id IS NOT NULL \
                             WHERE t.hash = ANY($1::bpchar[])";

                let phase6b_start = std::time::Instant::now();
                for chunk in miss_list.chunks(BATCH_SIZE) {
                    let chunk_refs: Vec<&str> = chunk.iter().map(|s| s.as_str()).collect();
                    for row in client.query(query, &[&chunk_refs]).await? {
                        db_rows += 1;
                        let hash: String = row.get("hash");
                        let tx_id: i32 = row.get("tx_id");
                        prev_tx_id_map.insert(hash.clone(), tx_id);

                        let vout_idx: Option<i32> = row.get("vout_index");
                        let addr_id: Option<i32> = row.get("address_id");
                        if let (Some(vout_idx), Some(addr_id)) = (vout_idx, addr_id) {
                            output_cache.insert((tx_id, vout_idx), addr_id);
                        }
                    }
                }
                db_query_us = phase6b_start.elapsed().as_micros();

                for (prev_hash, vout_indices) in &needed {
                    if let Some(&prev_tx_id) = prev_tx_id_map.get(prev_hash.as_str()) {
                        for &vout_idx in vout_indices {
                            if let Some(&addr_id) = output_cache.get(&(prev_tx_id, vout_idx)) {
                                input_address_ids.insert((prev_hash.clone(), vout_idx), addr_id);
                            }
                        }
                    }
                }
            }

            // 6c: RPC fallback for pairs that are neither in-batch nor in the DB
            // (typically prev txs below START_HEIGHT during partial sync).
            let mut missing: HashMap<String, Vec<i32>> = HashMap::new();
            for (prev_hash, vout_indices) in &needed {
                for &vout_idx in vout_indices {
                    if !input_address_ids.contains_key(&(prev_hash.clone(), vout_idx)) {
                        missing.entry(prev_hash.clone()).or_default().push(vout_idx);
                    }
                }
            }
            let rpc_misses = missing.len();

            if !missing.is_empty() {
                // (prev_hash, vout) → (spending tx_id, spending block height)
                let mut spending_meta: HashMap<(String, i32), (i32, i32)> = HashMap::new();
                for p in pending {
                    let height = p.block.height as i32;
                    for tx in &p.block.tx {
                        for vin in &tx.vin {
                            if let (Some(h), Some(v)) = (vin.txid.as_deref(), vin.vout) {
                                spending_meta
                                    .insert((h.to_string(), v), (tx_map[&tx.txid], height));
                            }
                        }
                    }
                }

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
                            let Some(vout_indices) = missing.get(&prev_hash) else {
                                continue;
                            };
                            for &vout_idx in vout_indices {
                                if let Some(vout) = fetched_tx.vout.get(vout_idx as usize) {
                                    if let Some(addr) = vout.script_pub_key.first_address() {
                                        if seen_rpc.insert(addr.clone()) {
                                            let (spending_tx_id, height) = spending_meta
                                                .get(&(prev_hash.clone(), vout_idx))
                                                .copied()
                                                .unwrap_or((0, 0));
                                            rpc_upserts.push((
                                                addr.clone(),
                                                spending_tx_id,
                                                Some(height),
                                            ));
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

            // Mark every spent (prev_hash, vout_idx) in the persistent cache.
            // Idempotent: no-op for entries that aren't (or are no longer) cached.
            for (prev_hash, vouts) in &needed {
                for &vout_idx in vouts {
                    cache.mark_spent(prev_hash, vout_idx);
                }
            }

            info!(
                blocks = pending.len(),
                needed_pairs,
                needed_hashes,
                inbatch = inbatch_hits,
                cache = cache_hits,
                db_misses,
                db_rows,
                db_query_us,
                rpc = rpc_misses,
                cache_size = cache.len(),
                "Phase 6 input resolution"
            );
        }

        // ── 7. COPY tx_inputs
        self.db
            .insert_tx_inputs_batch(client, &flat_txs, &tx_map, &input_address_ids, &prev_tx_id_map)
            .await?;

        // ── 7b. Delete spent UTXOs. Skips coinbase (no prev) and prev txs that
        // weren't in our index (nothing to delete — they were never inserted).
        let mut utxo_deletes: Vec<(i32, i32)> = Vec::new();
        for tx in &flat_txs {
            for vin in &tx.vin {
                if let (Some(h), Some(v)) = (&vin.txid, vin.vout) {
                    if let Some(&prev_tx_id) = prev_tx_id_map.get(h) {
                        utxo_deletes.push((prev_tx_id, v));
                    }
                }
            }
        }
        self.db.delete_utxo_batch(client, &utxo_deletes).await?;

        // ── 8. Special transactions
        let mut special_records: Vec<(i32, i16, Value)> = Vec::new();
        for p in pending {
            for tx in &p.block.tx {
                if tx.tx_type.unwrap_or(0) > 0 {
                    special_records.push((
                        tx_map[&tx.txid],
                        tx.tx_type.unwrap(),
                        self.build_special_tx_payload(tx),
                    ));
                }
            }
        }
        if !special_records.is_empty() {
            self.db
                .insert_special_transactions_batch(client, &special_records)
                .await?;
        }

        for p in pending {
            info!(
                height = p.block.height,
                hash = %p.block.hash,
                txs = p.block.tx.len(),
                "Indexed block"
            );
        }

        Ok(())
    }

    /// Index a single mempool (pending) transaction. Shares the same DB
    /// helpers as the block path but drives them directly — no PendingBlock.
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

        let Some(tx_id) = self.db.insert_pending_transaction(&*db_tx, &tx).await? else {
            db_tx.commit().await?;
            return Ok(false);
        };

        let tx_map = HashMap::from([(tx.txid.clone(), tx_id)]);
        let flat_txs: Vec<&Transaction> = vec![&tx];

        // Outputs
        let mut out_upserts: Vec<(String, i32, Option<i32>)> = Vec::new();
        let mut seen_addr: HashMap<String, usize> = HashMap::new();
        let mut vout_addr_pairs: Vec<((i32, String), String)> = Vec::new();
        for (vout_index, vout) in tx.vout.iter().enumerate() {
            if let Some(addr) = vout.script_pub_key.first_address() {
                if let Some(&idx) = seen_addr.get(addr.as_str()) {
                    out_upserts[idx] = (addr.clone(), tx_id, None);
                } else {
                    seen_addr.insert(addr.clone(), out_upserts.len());
                    out_upserts.push((addr.clone(), tx_id, None));
                }
                vout_addr_pairs.push(((vout_index as i32, tx.txid.clone()), addr));
            }
        }
        let out_addr_id_map = self.db.upsert_addresses_batch(&*db_tx, &out_upserts).await?;
        let mut addresses_map: HashMap<(i32, String), i32> = HashMap::new();
        for ((vout_idx, txid), addr) in vout_addr_pairs {
            if let Some(&id) = out_addr_id_map.get(&addr) {
                addresses_map.insert((vout_idx, txid), id);
            }
        }
        self.db
            .insert_tx_outputs_batch(&*db_tx, &flat_txs, &addresses_map, &tx_map)
            .await?;

        // Inputs: DB join first, then RPC fallback
        let mut needed: HashMap<String, Vec<i32>> = HashMap::new();
        for vin in &tx.vin {
            if let (Some(h), Some(v)) = (&vin.txid, vin.vout) {
                needed.entry(h.clone()).or_default().push(v);
            }
        }
        let mut input_address_ids: HashMap<(String, i32), i32> = HashMap::new();
        let mut prev_tx_id_map: HashMap<String, i32> = HashMap::new();
        let mut output_cache: HashMap<(i32, i32), i32> = HashMap::new();

        if !needed.is_empty() {
            let miss_list: Vec<String> = needed.keys().cloned().collect();
            let query = "SELECT TRIM(t.hash) AS hash, t.id AS tx_id, \
                                o.vout_index, o.address_id \
                         FROM transactions t \
                         LEFT JOIN tx_outputs o \
                                ON o.tx_id = t.id AND o.address_id IS NOT NULL \
                         WHERE t.hash = ANY($1::bpchar[])";
            for chunk in miss_list.chunks(BATCH_SIZE) {
                let chunk_refs: Vec<&str> = chunk.iter().map(|s| s.as_str()).collect();
                for row in db_tx.query(query, &[&chunk_refs]).await? {
                    let hash: String = row.get("hash");
                    let tx_id_prev: i32 = row.get("tx_id");
                    prev_tx_id_map.insert(hash.clone(), tx_id_prev);
                    let vout_idx: Option<i32> = row.get("vout_index");
                    let addr_id: Option<i32> = row.get("address_id");
                    if let (Some(vout_idx), Some(addr_id)) = (vout_idx, addr_id) {
                        output_cache.insert((tx_id_prev, vout_idx), addr_id);
                    }
                }
            }
            for (prev_hash, vout_indices) in &needed {
                if let Some(&prev_tx_id) = prev_tx_id_map.get(prev_hash.as_str()) {
                    for &vout_idx in vout_indices {
                        if let Some(&addr_id) = output_cache.get(&(prev_tx_id, vout_idx)) {
                            input_address_ids.insert((prev_hash.clone(), vout_idx), addr_id);
                        }
                    }
                }
            }

            let mut missing: HashMap<String, Vec<i32>> = HashMap::new();
            for (prev_hash, vout_indices) in &needed {
                for &vout_idx in vout_indices {
                    if !input_address_ids.contains_key(&(prev_hash.clone(), vout_idx)) {
                        missing.entry(prev_hash.clone()).or_default().push(vout_idx);
                    }
                }
            }

            if !missing.is_empty() {
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
                            let Some(vout_indices) = missing.get(&prev_hash) else {
                                continue;
                            };
                            for &vout_idx in vout_indices {
                                if let Some(vout) = fetched_tx.vout.get(vout_idx as usize) {
                                    if let Some(addr) = vout.script_pub_key.first_address() {
                                        if seen_rpc.insert(addr.clone()) {
                                            rpc_upserts.push((addr.clone(), tx_id, None));
                                        }
                                        rpc_keys.push(((prev_hash.clone(), vout_idx), addr));
                                    }
                                }
                            }
                        }
                        Err(e) => error!("RPC fallback for {prev_hash}: {e}"),
                    }
                }
                if !rpc_upserts.is_empty() {
                    let rpc_id_map = self.db.upsert_addresses_batch(&*db_tx, &rpc_upserts).await?;
                    for ((prev_hash, vout_idx), addr) in rpc_keys {
                        if let Some(&id) = rpc_id_map.get(&addr) {
                            input_address_ids.insert((prev_hash, vout_idx), id);
                        }
                    }
                }
            }
        }

        self.db
            .insert_tx_inputs_batch(
                &*db_tx,
                &flat_txs,
                &tx_map,
                &input_address_ids,
                &prev_tx_id_map,
            )
            .await?;

        db_tx.commit().await?;
        Ok(true)
    }
}