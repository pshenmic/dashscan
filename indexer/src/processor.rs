use crate::db::Database;
use crate::errors::database_error::DatabaseError;
use crate::rpc::{Block, DashRpcClient, Transaction};
use futures::future::join_all;
use chrono::{DateTime, Utc};
use deadpool_postgres::Client;
use serde_json::Value;
use tracing::{debug, info};
use crate::errors::block_index_error::BlockIndexError;

pub struct BlockProcessor {
    pub rpc: DashRpcClient,
    pub db: Database,
}

impl BlockProcessor {
    pub fn new(rpc: DashRpcClient, db: Database) -> Self {
        Self { rpc, db }
    }

    pub async fn index_block_by_hash(&self, hash: &str) -> Result<Option<String>, BlockIndexError> {
        // Acquire one connection reused for both the existence check and the transaction.
        let client = self.db.begin().await
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

        self.process_block(client, block).await?;

        Ok(Some(hash.to_string()))
    }

    pub async fn index_block_by_height(&self, height: i64) -> Result<Option<String>, BlockIndexError> {
        let hash = self.rpc.get_block_hash(height).await
            .map_err(|e| BlockIndexError::from(e))?;

        self.index_block_by_hash(&hash).await
    }

    /// Indexes a block using an already-acquired pool connection.
    /// Opens a transaction on that connection, writes everything, and commits.
    async fn process_block(&self, mut client: Client, block: Block) -> Result<(), BlockIndexError> {
        let tx_count = block.tx.len() as i32;

        let timestamp = DateTime::<Utc>::from_timestamp(block.time, 0)
            .ok_or_else(|| BlockIndexError::UnexpectedError("Invalid block timestamp".to_string()))?;

        // Extract cb_tx fields before consuming block.cb_tx
        let mn_list_root: Option<String>             = block.cb_tx.as_ref().map(|cb| cb.merkle_root_mn_list.clone());
        let credit_pool_balance: Option<f64>         = block.cb_tx.as_ref().and_then(|cb| cb.credit_pool_balance);
        let cbtx_version: Option<i32>                = block.cb_tx.as_ref().map(|cb| cb.version);
        let cbtx_height: Option<i32>                 = block.cb_tx.as_ref().map(|cb| cb.height);
        let cbtx_merkle_root_quorums: Option<String> = block.cb_tx.as_ref().and_then(|cb| cb.merkle_root_quorums.clone());
        let cbtx_best_cl_height_diff: Option<i64>    = block.cb_tx.as_ref().and_then(|cb| cb.best_cl_height_diff);
        let cbtx_best_cl_signature: Option<String>   = block.cb_tx.as_ref().and_then(|cb| cb.best_cl_signature.clone());

        let db_tx = client.transaction().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        // Insert block header
        self.db
            .insert_block(
                &*db_tx,
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
            )
            .await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        if !block.tx.is_empty() {
            // One INSERT for all transactions
            self.db
                .insert_transactions_batch(&*db_tx, &block.tx, &block.hash)
                .await
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

            // One INSERT for all inputs
            self.db
                .insert_tx_inputs_batch(&*db_tx, &block.tx)
                .await
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

            // One INSERT for all outputs
            self.db
                .insert_tx_outputs_batch(&*db_tx, &block.tx)
                .await
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

            // Upsert all addresses (one query per address — no SELECT needed)
            for tx in &block.tx {
                for vout in &tx.vout {
                    if let Some(ref addr) = vout.script_pub_key.first_address() {
                        self.db
                            .upsert_address(&*db_tx, addr, &tx.txid, block.height)
                            .await
                            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
                    }
                }
            }

            // One INSERT for all special transactions (type > 0)
            let special_records: Vec<(&str, i16, Value)> = block.tx
                .iter()
                .filter(|tx| tx.tx_type.unwrap_or(0) > 0)
                .map(|tx| (tx.txid.as_str(), tx.tx_type.unwrap(), self.build_special_tx_payload(tx)))
                .collect();

            self.db
                .insert_special_transactions_batch(&*db_tx, &special_records)
                .await
                .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;
        }

        db_tx.commit().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        info!(
            height = block.height,
            hash = %block.hash,
            txs = tx_count,
            "Indexed block"
        );
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

    /// Catch up from last indexed block to current chain tip.
    ///
    /// Pipeline per chunk:
    ///   1. One `getblockheaders` call  → N block hashes
    ///   2. N parallel `getblock` calls → N full blocks fetched concurrently
    ///   3. Sequential processing        → blocks written to DB in order
    pub async fn catch_up(&self) -> Result<i64, String> {
        const CHUNK: usize = 50;

        let chain_height = self.rpc.get_block_count().await.expect("Failed to get chain height");

        let client = self.db.begin().await.expect("Failed to acquire DB connection");
        let db_height: i64 = self.db.get_max_block_height(&**client).await.expect("Failed to get db height");
        drop(client);

        if db_height >= chain_height {
            info!(chain_height, db_height, "Already up to date");
            return Ok(chain_height);
        }

        let start = 1;
        let total = chain_height - db_height;
        info!(from = start, to = chain_height, blocks = total, "Catching up");

        // Bootstrap: get the starting hash for the first getblockheaders call.
        let start_hash = self.rpc.get_block_hash(start).await.map_err(|e| e.to_string())?;
        let mut next_hash: Option<String> = Some(start_hash);
        let mut indexed: i64 = 0;

        while let Some(chunk_start_hash) = next_hash {
            // ── Phase 1: one RPC call to get up to CHUNK hashes ──────────────
            let headers = self.rpc
                .get_block_headers(&chunk_start_hash, CHUNK)
                .await
                .map_err(|e| e.to_string())?;

            if headers.is_empty() {
                break;
            }

            // Chain to the next chunk via nextblockhash of the last header.
            next_hash = headers.last().and_then(|h| h.next_block_hash.clone());

            // ── Phase 2: fetch all full blocks in this chunk in parallel ─────
            let block_futures = headers.iter().map(|h| self.rpc.get_block(&h.hash));
            let block_results = join_all(block_futures).await;

            // ── Phase 3: process each block sequentially in height order ─────
            for (header, block_result) in headers.iter().zip(block_results) {
                let block = block_result.map_err(|e| e.to_string())?;

                let client = self.db.begin().await.map_err(|e| e.to_string())?;

                if self.db
                    .get_block_by_hash(&**client, &header.hash)
                    .await
                    .map_err(|e| e.to_string())?
                    .is_some()
                {
                    info!(height = header.height, "Block already indexed, skipping");
                    continue;
                }

                self.process_block(client, block).await.map_err(|e| e.to_string())?;
            }

            indexed += headers.len() as i64;

            if indexed % 500 == 0 || next_hash.is_none() {
                info!(
                    indexed,
                    remaining = (chain_height - db_height - indexed).max(0),
                    "Catch-up progress"
                );
            }

            // Stop once we've covered up to chain_height.
            if db_height + indexed >= chain_height {
                break;
            }
        }

        info!(chain_height, "Catch-up complete");
        Ok(chain_height)
    }
}
