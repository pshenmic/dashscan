use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::mpsc;
use crate::db::{BlockBatchWriter, BlockRow, AddressRow, Database, MasternodeRow, SpecialTransactionRow, TransactionRow, TxInputRow, TxOutputRow};
use crate::errors::database_error::DatabaseError;
use crate::p2p::{P2PClient, P2PError};
use crate::p2p_converter;
use crate::rpc::{Block, DashRpcClient, Transaction};
use chrono::{DateTime, Utc};
use serde_json::Value;
use tracing::{debug, info};
use crate::config::Config;
use crate::errors::block_index_error::BlockIndexError;
use dashcore::consensus::encode::deserialize_partial;

pub struct BlockProcessor {
    pub rpc: DashRpcClient,
    pub db: Database,
}

impl BlockProcessor {
    pub fn new(rpc: DashRpcClient, db: Database) -> Self {
        Self { rpc, db }
    }

    pub async fn index_block_by_hash(&self, hash: &str) -> Result<Option<String>, BlockIndexError> {
        if self.db.get_block_by_hash(hash).await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?
            .is_some()
        {
            debug!(hash = %hash, "Block already indexed, skipping");
            return Ok(None);
        }

        let block = self.rpc.get_block(hash).await
            .map_err(BlockIndexError::from)?;

        // Live sync: one writer per block, flushed immediately after
        let mut writer = self.db.batch_writer()
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
        self.write_block(&mut writer, block).await?;
        writer.end().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        Ok(Some(hash.to_string()))
    }

    pub async fn index_block_by_height(&self, height: i64) -> Result<Option<String>, BlockIndexError> {
        let hash = self.rpc.get_block_hash(height).await
            .map_err(BlockIndexError::from)?;
        self.index_block_by_hash(&hash).await
    }

    /// Write a single block into the provided BatchWriter.
    /// Does NOT flush — caller controls when to commit/end.
    pub async fn write_block(
        &self,
        writer: &mut BlockBatchWriter,
        block: Block,
    ) -> Result<(), BlockIndexError> {
        let tx_count = block.tx.len() as i32;

        let timestamp = DateTime::<Utc>::from_timestamp(block.time, 0)
            .ok_or_else(|| BlockIndexError::UnexpectedError("Invalid block timestamp".to_string()))?;

        let block_row = BlockRow {
            hash: block.hash.clone(),
            height: block.height as i32,
            version: block.version,
            timestamp: timestamp.timestamp() as u32,
            previous_block_hash: block.previous_block_hash.clone(),
            merkle_root: block.merkle_root.clone(),
            size: block.size as i32,
            nonce: block.nonce,
            difficulty: block.difficulty,
            chainwork: block.chainwork.clone(),
            tx_count,
            merkle_root_mn_list: block.cb_tx.as_ref().map(|cb| cb.merkle_root_mn_list.clone()),
            credit_pool_balance: block.cb_tx.as_ref().and_then(|cb| cb.credit_pool_balance),
            cbtx_version: block.cb_tx.as_ref().map(|cb| cb.version),
            cbtx_height: block.cb_tx.as_ref().map(|cb| cb.height),
            cbtx_merkle_root_quorums: block.cb_tx.as_ref().and_then(|cb| cb.merkle_root_quorums.clone()),
            cbtx_best_cl_height_diff: block.cb_tx.as_ref().and_then(|cb| cb.best_cl_height_diff),
            cbtx_best_cl_signature: block.cb_tx.as_ref().and_then(|cb| cb.best_cl_signature.clone()),
        };

        writer.blocks.write(&block_row)
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        for tx in &block.tx {
            let tx_row = TransactionRow {
                hash: tx.txid.clone(),
                block_height: Some(block.height as i32),
                version: tx.version,
                tx_type: tx.tx_type.unwrap_or(0),
                size: tx.size as i32,
                locktime: tx.locktime,
                is_coinbase: tx.vin.first().map_or(false, |v| v.coinbase.is_some()),
            };
            writer.transactions.write(&tx_row)
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

            for (i, vin) in tx.vin.iter().enumerate() {
                let input_row = TxInputRow {
                    tx_hash: tx.txid.clone(),
                    vin_index: i as i32,
                    prev_tx_hash: vin.txid.clone(),
                    prev_vout_index: vin.vout,
                    coinbase_data: vin.coinbase.clone(),
                };
                writer.tx_inputs.write(&input_row)
                    .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
            }
        }

        // Collect (vout_index, txid) -> address and deduplicated address records
        let mut address_map: HashMap<(i32, String), String> = HashMap::new();
        let mut seen_addresses: HashMap<String, String> = HashMap::new();

        for tx in &block.tx {
            for vout in &tx.vout {
                if let Some(addr) = vout.script_pub_key.first_address() {
                    address_map.insert((vout.n, tx.txid.clone()), addr.clone());
                    seen_addresses.insert(addr, tx.txid.clone());
                }
            }
        }

        for (addr, tx_hash) in &seen_addresses {
            let addr_row = AddressRow {
                address: addr.clone(),
                first_seen_tx_hash: tx_hash.clone(),
                first_seen_block: Some(block.height as i32),
                last_seen_tx_hash: tx_hash.clone(),
                last_seen_block: Some(block.height as i32),
            };
            writer.addresses.write(&addr_row)
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
        }

        for tx in &block.tx {
            for vout in &tx.vout {
                let address = address_map.get(&(vout.n, tx.txid.clone())).cloned();
                let output_row = TxOutputRow {
                    tx_hash: tx.txid.clone(),
                    vout_index: vout.n,
                    value: (vout.value * 100_000_000.0).round() as i64,
                    script_pub_key: vout.script_pub_key.hex.clone(),
                    script_type: vout.script_pub_key.script_type.clone(),
                    address,
                };
                writer.tx_outputs.write(&output_row)
                    .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
            }

            if tx.tx_type.unwrap_or(0) > 0 {
                let special_row = SpecialTransactionRow {
                    tx_hash: tx.txid.clone(),
                    tx_type: tx.tx_type.unwrap(),
                    payload: serde_json::to_string(&self.build_special_tx_payload(tx))
                        .unwrap_or_default(),
                };
                writer.special_transactions.write(&special_row)
                    .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
            }
        }

        // Commit after each block: flushes to ClickHouse only if chunk_size is reached
        writer.commit().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        info!(height = block.height, hash = %block.hash, txs = tx_count, "Indexed block");
        Ok(())
    }

    pub async fn index_pending_transaction(
        &self,
        raw_bytes: Vec<u8>,
        network: dashcore::Network,
    ) -> Result<bool, BlockIndexError> {
        let (raw_tx, _): (dashcore::blockdata::transaction::Transaction, usize) =
            deserialize_partial(&raw_bytes)
                .map_err(|e| BlockIndexError::UnexpectedError(format!("Failed to deserialize rawtx: {e}")))?;

        let tx = p2p_converter::convert_transaction(&raw_tx, network);

        // Pending txs are individual — use direct inserts, not the batch writer
        self.db.insert_pending_transaction(&tx).await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        self.db.insert_pending_tx_inputs(&tx).await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        let mut address_map: HashMap<(i32, String), String> = HashMap::new();
        let mut address_rows: Vec<AddressRow> = Vec::new();
        for vout in &tx.vout {
            if let Some(addr) = vout.script_pub_key.first_address() {
                address_map.insert((vout.n, tx.txid.clone()), addr.clone());
                if !address_rows.iter().any(|r| r.address == addr) {
                    address_rows.push(AddressRow {
                        address: addr.clone(),
                        first_seen_tx_hash: tx.txid.clone(),
                        first_seen_block: None,
                        last_seen_tx_hash: tx.txid.clone(),
                        last_seen_block: None,
                    });
                }
            }
        }

        self.db.insert_pending_addresses(&address_rows).await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        self.db.insert_pending_tx_outputs(&tx, &address_map).await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        Ok(true)
    }

    pub async fn sync_masternodes(&self) -> Result<(), BlockIndexError> {
        let entries = self.rpc.get_masternode_list().await.map_err(BlockIndexError::from)?;

        let mut ins = self.db.client.inserter::<MasternodeRow>("masternodes")
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?
            .with_max_rows(self.db.chunk_size);

        for m in &entries {
            let row = MasternodeRow {
                pro_tx_hash: m.pro_tx_hash.clone(),
                address: m.address.clone(),
                payee: m.payee.clone(),
                status: m.status.clone(),
                mn_type: m.mn_type.clone(),
                pos_penalty_score: m.pospenaltyscore,
                consecutive_payments: m.consecutive_payments,
                last_paid_time: m.lastpaidtime,
                last_paid_block: m.lastpaidblock,
                owner_address: m.owneraddress.clone(),
                voting_address: m.votingaddress.clone(),
                collateral_address: m.collateraladdress.clone(),
                pub_key_operator: m.pubkeyoperator.clone(),
            };
            ins.write(&row)
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
            ins.commit().await
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
        }
        ins.end().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        info!(count = entries.len(), "Synced masternode list");
        Ok(())
    }

    fn build_special_tx_payload(&self, tx: &Transaction) -> Value {
        let special_keys: &[&str] = &[
            "proRegTx", "proUpServTx", "proUpRegTx", "proUpRevTx",
            "cbTx", "qcTx", "mnHfTx", "assetLockTx", "assetUnlockTx",
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
    /// One BlockBatchWriter is kept open across all blocks — rows flush only
    /// when chunk_size is reached, not after every block.
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

        let start_hash_str = self.rpc.get_block_hash(start).await
            .map_err(BlockIndexError::from)?;
        let start_hash: dashcore::BlockHash = start_hash_str.parse()
            .map_err(|e| BlockIndexError::UnexpectedError(format!("Failed to parse block hash: {:?}", e)))?;

        let block_batch_size = config.p2p_batch_size;
        let (tx, rx) = mpsc::sync_channel::<(i64, dashcore::block::Block)>(block_batch_size * 2);

        let start_h = u64::try_from(start)
            .map_err(|_| BlockIndexError::UnexpectedError(format!("Invalid start height: {}", start)))?;
        let end_h = u64::try_from(chain_height)
            .map_err(|_| BlockIndexError::UnexpectedError(format!("Invalid chain height: {}", chain_height)))?;

        let network = config.network;

        let p2p_handle = tokio::task::spawn_blocking(move || -> Result<(), P2PError> {
            let mut p2p = P2PClient::connect(p2p_addr, network)?;
            p2p.stream_blocks(start_h, start_hash, end_h, &tx, block_batch_size)?;
            Ok(())
        });

        // Single writer kept open across ALL blocks — flushes only when chunk_size is reached
        let mut writer = self.db.batch_writer()
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        let mut indexed: i64 = 0;
        let mut last_height = db_height;

        while let Ok((height, raw_block)) = rx.recv() {
            if height <= last_height {
                debug!(height, "Block already indexed, skipping");
                continue;
            }

            let block = p2p_converter::convert_block(&raw_block, height, network);
            self.write_block(&mut writer, block).await?;

            last_height = height;
            indexed += 1;

            if indexed % config.catch_up_batch_size as i64 == 0 {
                writer.end().await
                    .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

                writer = self.db.batch_writer()
                    .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
                
                info!(
                    indexed,
                    height = last_height,
                    remaining = total - indexed,
                    "Catch-up progress"
                );
            }
        }

        // Flush remaining rows in all inserters
        writer.end().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        match p2p_handle.await {
            Ok(Ok(())) => {}
            Ok(Err(e)) => return Err(BlockIndexError::from(e)),
            Err(e) => return Err(BlockIndexError::UnexpectedError(format!("P2P thread panicked: {}", e))),
        }

        self.sync_masternodes().await?;

        info!(chain_height, indexed, "Catch-up complete");
        Ok(chain_height)
    }
}