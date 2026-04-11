use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::mpsc;
use crate::db::Database;
use crate::errors::database_error::DatabaseError;
use crate::miner_pool::MinerPool;
use crate::p2p::{P2PClient, P2PError};
use crate::p2p_converter;
use crate::rpc::{Block, DashRpcClient, Transaction};
use chrono::{DateTime, Utc};
use deadpool_postgres::Client;
use serde_json::Value;
use tokio_postgres::GenericClient;
use tracing::{debug, info};
use dashcore::consensus::encode::deserialize_partial;
use crate::config::{Config, superblock_interval};
use crate::errors::block_index_error::BlockIndexError;


pub struct BlockProcessor {
    pub rpc: DashRpcClient,
    pub db: Database,
    pub superblock_interval: i64,
    pub miner_pools: Vec<MinerPool>,
    pub miner_pool_ids: HashMap<String, i32>,
}

impl BlockProcessor {
    pub fn new(
        rpc: DashRpcClient,
        db: Database,
        network: dashcore::Network,
        miner_pools: Vec<MinerPool>,
        miner_pool_ids: HashMap<String, i32>,
    ) -> Self {
        Self {
            rpc,
            db,
            superblock_interval: superblock_interval(network),
            miner_pools,
            miner_pool_ids,
        }
    }

    /// Match coinbase data against known miner pool search strings.
    /// Returns (pool_db_id, optional miner nickname extracted from "Mined by <name>").
    fn identify_miner(&self, coinbase_hex: &str) -> (Option<i32>, Option<String>) {
        let bytes = match hex::decode(coinbase_hex) {
            Ok(b) => b,
            Err(_) => return (None, None),
        };
        let coinbase_text = String::from_utf8_lossy(&bytes);

        let mut pool_id: Option<i32> = None;

        for pool in &self.miner_pools {
            for search in &pool.search_strings {
                if coinbase_text.contains(search.as_str()) {
                    pool_id = self.miner_pool_ids.get(&pool.pool_name).copied();
                    break;
                }
            }
            if pool_id.is_some() {
                break;
            }
        }

        // Extract miner nickname from "Mined by <name>/" pattern
        // Strip null bytes and control chars
        let miner_name = coinbase_text
            .find("Mined by ")
            .map(|start| &coinbase_text[start + 9..])
            .and_then(|rest| rest.find('/').map(|end| &rest[..end]))
            .map(|name| name.replace('\0', ""))
            .map(|name| name.trim().to_string())
            .filter(|name| !name.is_empty());

        (pool_id, miner_name)
    }

    pub async fn index_block_by_hash(&self, hash: &str) -> Result<Option<String>, BlockIndexError> {
        // Acquire one connection reused for both the existence check and the transaction.
        let mut client = self.db.begin().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        if self.db.get_block_by_hash(&**client, hash).await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?
            .is_some()
        {
            debug!(hash = %hash, "Block already indexed, skipping");
            return Ok(None);
        }

        let block = self.rpc.get_block(hash).await
            .map_err(|e| BlockIndexError::from(e))?;

        self.process_block(&mut client, block).await?;

        Ok(Some(hash.to_string()))
    }

    pub async fn index_block_by_height(&self, height: i64) -> Result<Option<String>, BlockIndexError> {
        let hash = self.rpc.get_block_hash(height).await
            .map_err(|e| BlockIndexError::from(e))?;

        self.index_block_by_hash(&hash).await
    }

    /// Indexes a block using an already-acquired pool connection.
    /// Opens a transaction on that connection, writes everything, and commits.
    /// Used by live sync (single-block commits) — chain_locked is false,
    /// set later via rawchainlocksig.
    async fn process_block(&self, client: &mut Client, block: Block) -> Result<(), BlockIndexError> {
        let db_tx = client.transaction().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        self.write_block(&*db_tx, block, false).await?;

        db_tx.commit().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        Ok(())
    }

    /// Writes a single block and all its data into the given client/transaction.
    /// Does NOT commit — the caller controls transaction boundaries.
    async fn write_block(&self, client: &impl GenericClient, block: Block, chain_locked: bool) -> Result<(), BlockIndexError> {
        let tx_count = block.tx.len() as i32;

        let timestamp = DateTime::<Utc>::from_timestamp(block.time, 0)
            .ok_or_else(|| BlockIndexError::UnexpectedError("Invalid block timestamp".to_string()))?;

        let is_superblock = (block.height % self.superblock_interval) == 0;

        // Identify miner pool and nickname from coinbase data
        let (miner_id, miner_name) = block.tx.first()
            .and_then(|tx| tx.vin.first())
            .and_then(|vin| vin.coinbase.as_deref())
            .map(|cb| self.identify_miner(cb))
            .unwrap_or((None, None));

        let miner_name_id = match miner_name {
            Some(ref name) => Some(
                self.db.upsert_miner_name(client, name).await
                    .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?
            ),
            None => None,
        };

        // Extract cb_tx fields before consuming block.cb_tx
        let mn_list_root: Option<String>             = block.cb_tx.as_ref().map(|cb| cb.merkle_root_mn_list.clone());
        let credit_pool_balance: Option<f64>         = block.cb_tx.as_ref().and_then(|cb| cb.credit_pool_balance);
        let cbtx_version: Option<i32>                = block.cb_tx.as_ref().map(|cb| cb.version);
        let cbtx_height: Option<i32>                 = block.cb_tx.as_ref().map(|cb| cb.height);
        let cbtx_merkle_root_quorums: Option<String> = block.cb_tx.as_ref().and_then(|cb| cb.merkle_root_quorums.clone());
        let cbtx_best_cl_height_diff: Option<i64>    = block.cb_tx.as_ref().and_then(|cb| cb.best_cl_height_diff);
        let cbtx_best_cl_signature: Option<String>   = block.cb_tx.as_ref().and_then(|cb| cb.best_cl_signature.clone());

        // Insert block header
        self.db
            .insert_block(
                client,
                &block.hash,
                block.height,
                block.version,
                timestamp,
                block.previous_block_hash,
                &block.merkle_root,
                block.size,
                block.nonce,
                block.difficulty,
                &block.chainwork,
                tx_count,
                mn_list_root.as_deref(),
                credit_pool_balance,
                cbtx_version,
                cbtx_height,
                cbtx_merkle_root_quorums.as_deref(),
                cbtx_best_cl_height_diff,
                cbtx_best_cl_signature.as_deref(),
                Some(is_superblock),
                miner_id,
                miner_name_id,
            )
            .await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        if !block.tx.is_empty() {
            // One INSERT for all transactions
            let tx_map = self.db
                .insert_transactions_batch(client, &block.tx, block.height, chain_locked)
                .await
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

            // One INSERT for all inputs
            self.db
                .insert_tx_inputs_batch(client, &block.tx, &tx_map)
                .await
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

            // Collect unique (address -> (tx_id, height)) for batch upsert,
            // and remember which (vout_index, txid) pairs map to which address.
            let mut upsert_records: Vec<(String, i32, Option<i32>)> = Vec::new();
            let mut seen_addresses: HashMap<String, usize> = HashMap::new();
            let mut vout_to_address: Vec<((i32, String), String)> = Vec::new();

            let h = Some(block.height as i32);
            for tx in &block.tx {
                for (vout_index, vout) in tx.vout.iter().enumerate() {
                    if let Some(ref addr) = vout.script_pub_key.first_address() {
                        let tx_id = tx_map[&tx.txid];
                        // Keep the last-seen tx_id for each address (last wins)
                        if let Some(&idx) = seen_addresses.get(addr.as_str()) {
                            upsert_records[idx] = (addr.clone(), tx_id, h);
                        } else {
                            seen_addresses.insert(addr.clone(), upsert_records.len());
                            upsert_records.push((addr.clone(), tx_id, h));
                        }
                        vout_to_address.push(((vout_index as i32, tx.txid.clone()), addr.clone()));
                    }
                }
            }

            let addr_id_map = self.db
                .upsert_addresses_batch(client, &upsert_records)
                .await
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

            // Build (vout_index, tx_hash) -> address_id map
            let mut addresses_map: HashMap<(i32, String), i32> = HashMap::new();
            for ((vout_idx, txid), addr) in vout_to_address {
                let id = *addr_id_map.get(&addr).ok_or_else(|| {
                    BlockIndexError::UnexpectedError(format!("Missing address id for {}", addr))
                })?;
                addresses_map.insert((vout_idx, txid), id);
            }

            // One INSERT for all outputs
            self.db
                .insert_tx_outputs_batch(client, &block.tx, &addresses_map, &tx_map)
                .await
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

            // One INSERT for all special transactions (type > 0)
            let special_records: Vec<(i32, i16, Value)> = block.tx
                .iter()
                .filter(|tx| tx.tx_type.unwrap_or(0) > 0)
                .map(|tx| (tx_map[&tx.txid], tx.tx_type.unwrap(), self.build_special_tx_payload(tx)))
                .collect();

            self.db
                .insert_special_transactions_batch(client, &special_records)
                .await
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
        }

        info!(
            height = block.height,
            hash = %block.hash,
            txs = tx_count,
            "Indexed block"
        );
        Ok(())
    }

    pub async fn index_pending_transaction(
        &self,
        raw_bytes: Vec<u8>,
        network: dashcore::Network,
    ) -> Result<bool, BlockIndexError> {
        let (raw_tx, _): (dashcore::blockdata::transaction::Transaction, usize) = deserialize_partial(&raw_bytes)
            .map_err(|e| BlockIndexError::UnexpectedError(format!("Failed to deserialize rawtx: {e}")))?;

        let tx = p2p_converter::convert_transaction(&raw_tx, network);

        let mut client = self.db.begin().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
        let db_tx = client.transaction().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        let inserted = if let Some(tx_id) = self.db
            .insert_pending_transaction(&*db_tx, &tx)
            .await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?
        {
            let tx_map = HashMap::from([(tx.txid.clone(), tx_id)]);

            self.db
                .insert_tx_inputs_batch(&*db_tx, &[tx.clone()], &tx_map)
                .await
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

            let mut upsert_records: Vec<(String, i32, Option<i32>)> = Vec::new();
            let mut vout_to_address: Vec<((i32, String), String)> = Vec::new();
            for (vout_index, vout) in tx.vout.iter().enumerate() {
                if let Some(ref addr) = vout.script_pub_key.first_address() {
                    if !upsert_records.iter().any(|(a, _, _)| a == addr) {
                        upsert_records.push((addr.clone(), tx_id, None));
                    }
                    vout_to_address.push(((vout_index as i32, tx.txid.clone()), addr.clone()));
                }
            }

            let addr_id_map = self.db
                .upsert_addresses_batch(&*db_tx, &upsert_records)
                .await
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

            let mut addresses_map: HashMap<(i32, String), i32> = HashMap::new();
            for ((vout_idx, txid), addr) in vout_to_address {
                if let Some(&id) = addr_id_map.get(&addr) {
                    addresses_map.insert((vout_idx, txid), id);
                }
            }

            self.db
                .insert_tx_outputs_batch(&*db_tx, &[tx.clone()], &addresses_map, &tx_map)
                .await
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

            true
        } else {
            false
        };

        db_tx.commit().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        Ok(inserted)
    }

    /// Store the raw ISLOCK hex on the matching transaction.
    pub async fn apply_instant_lock(&self, txid: String, lock_hex: String) -> Result<(), BlockIndexError> {
        let client = self.db.begin().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        let updated = self.db
            .update_transaction_instant_lock(&**client, &txid, &lock_hex)
            .await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        if updated == 0 {
            debug!(txid = %txid, "instant_lock: transaction not yet indexed, skipping");
        } else {
            info!(txid = %txid, "Applied instant lock");
        }

        Ok(())
    }

    /// Set chain_locked = TRUE for all transactions at the given block height.
    pub async fn apply_chain_lock(&self, block_height: i32) -> Result<(), BlockIndexError> {
        let client = self.db.begin().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        let updated = self.db
            .set_chain_locked_for_block(&**client, block_height)
            .await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        info!(height = block_height, rows = updated, "Applied chain lock");

        Ok(())
    }

    pub async fn sync_masternodes(&self) -> Result<(), BlockIndexError> {
        let entries = self.rpc.get_masternode_list().await.map_err(BlockIndexError::from)?;

        let mut client = self.db.begin().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
        let db_tx = client.transaction().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        self.db.upsert_masternodes_batch(&*db_tx, &entries).await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        db_tx.commit().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        info!(count = entries.len(), "Synced masternode list");
        Ok(())
    }

    fn build_special_tx_payload(&self, tx: &Transaction) -> Value {
        let special_keys: &[&str] = &[
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
        for key in special_keys {
            if let Some(val) = tx.extra.get(*key) {
                payload.insert((*key).to_string(), val.clone());
            }
        }

        if payload.is_empty() {
            if let Some(ref ep) = tx.extra_payload {
                payload.insert("extraPayload".to_string(), Value::String(ep.clone()));
            }
        }

        Value::Object(payload)
    }

    /// Catch up from last indexed block to current chain tip via P2P.
    ///
    /// 1. Sync headers from the peer to discover block hashes
    /// 2. Stream blocks through a channel for concurrent fetch + processing
    pub async fn catch_up(&self, config: &Config) -> Result<i64, BlockIndexError> {
        let chain_height = self.rpc.get_block_count().await
            .map_err(BlockIndexError::from)?;

        let mut db_height: i64 = self.db.get_max_block_height().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        if db_height == 0 {
            db_height = config.start_height;
        }

        if db_height >= chain_height {
            info!(chain_height, db_height, "Already up to date");
            self.sync_masternodes().await?;
            return Ok(chain_height);
        }

        let start = db_height + 1;
        let total = chain_height - db_height;

        info!(from = start, to = chain_height, blocks = total, "Catching up via P2P");

        let p2p_addr: SocketAddr = format!("{}:{}", config.p2p_host, config.p2p_port)
            .parse()
            .map_err(|e| BlockIndexError::UnexpectedError(format!("Invalid P2P address: {}", e)))?;

        // Get the starting block hash from RPC so P2P can skip straight to it
        let start_hash_str = self.rpc.get_block_hash(start).await
            .map_err(BlockIndexError::from)?;
        let start_hash: dashcore::BlockHash = start_hash_str.parse()
            .map_err(|e| BlockIndexError::UnexpectedError(format!("Failed to parse block hash: {:?}", e)))?;

        let block_batch_size = config.p2p_batch_size.clone();

        let (tx, rx) = mpsc::sync_channel::<(i64, dashcore::block::Block)>(block_batch_size*2);

        let start_h = u64::try_from(start)
            .map_err(|_| BlockIndexError::UnexpectedError(format!("Invalid start height: {}", start)))?;
        let end_h = u64::try_from(chain_height)
            .map_err(|_| BlockIndexError::UnexpectedError(format!("Invalid chain height: {}", chain_height)))?;

        let network = config.network.clone();

        // P2P fetching in a blocking thread
        let p2p_handle = tokio::task::spawn_blocking(move || -> Result<(), P2PError> {
            let mut p2p = P2PClient::connect(p2p_addr, network)?;
            p2p.stream_blocks(start_h, start_hash, end_h, &tx, block_batch_size)?;
            Ok(())
        });

        // Process blocks as they arrive from P2P.
        // Single connection reused; blocks are batched into multi-block transactions
        // to amortize WAL flush cost (1 fsync per CATCH_UP_BATCH_SIZE blocks).
        let mut client = self.db.begin().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
        let mut indexed: i64 = 0;
        let mut last_height = db_height;
        let mut batch_count: usize = 0;
        let mut db_tx = client.transaction().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        while let Ok((height, raw_block)) = rx.recv() {
            // P2P streams blocks in order from start_height; skip already-indexed heights
            if height <= last_height {
                debug!(height, "Block already indexed, skipping");
                continue;
            }

            let block = p2p_converter::convert_block(&raw_block, height, network);
            self.write_block(&*db_tx, block, true).await?;

            last_height = height;
            indexed += 1;
            batch_count += 1;

            if batch_count >= config.catch_up_batch_size {
                db_tx.commit().await
                    .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

                info!(
                    indexed,
                    height = last_height,
                    remaining = total - indexed,
                    batch = config.catch_up_batch_size,
                    "Committed batch"
                );

                db_tx = client.transaction().await
                    .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
                batch_count = 0;
            }
        }

        // Commit remaining blocks in the last partial batch
        if batch_count > 0 {
            db_tx.commit().await
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
        }

        // Check P2P thread result and propagate any error
        match p2p_handle.await {
            Ok(Ok(())) => {}
            Ok(Err(e)) => return Err(BlockIndexError::from(e)),
            Err(e) => return Err(BlockIndexError::UnexpectedError(format!("P2P thread panicked: {}", e))),
        }

        self.sync_masternodes().await?;

        // Backfill chain_locked for any confirmed transactions that were indexed
        // during a previous continuous sync before their chainlock arrived.
        let backfill_client = self.db.begin().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
        let backfilled = self.db
            .backfill_chain_locks(&**backfill_client)
            .await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
        if backfilled > 0 {
            info!(rows = backfilled, "Backfilled chain locks for previously unlocked transactions");
        }

        info!(chain_height, indexed, "Catch-up complete");
        Ok(chain_height)
    }
}
