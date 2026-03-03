use crate::db::Database;
use crate::errors::database_error::DatabaseError;
use crate::rpc::{Block, DashRpcClient, Transaction};
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

    pub async fn index_block(&self, height: i64) -> Result<Option<String>, BlockIndexError> {
        let hash = self.rpc.get_block_hash(height).await
            .map_err(|e| BlockIndexError::from(e))?;

        // Acquire one connection reused for both the existence check and the transaction.
        let mut client = self.db.begin().await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?;

        if self.db.get_block_by_hash(&**client, &hash).await
            .map_err(|e| BlockIndexError::DatabaseError(DatabaseError::from(e)))?
            .is_some()
        {
            debug!(height, hash = %hash, "Block already indexed, skipping");
            return Ok(None);
        }

        let block = self.rpc.get_block(&hash).await
            .map_err(|e| BlockIndexError::from(e))?;

        self.process_block(client, block).await?;

        Ok(Some(hash))
    }

    /// Indexes a block using an already-acquired pool connection.
    /// Opens a transaction on that connection, writes everything, and commits.
    async fn process_block(&self, mut client: Client, block: Block) -> Result<(), BlockIndexError> {
        let tx_count = block.tx.len() as i32;

        let timestamp = DateTime::<Utc>::from_timestamp(block.time, 0)
            .ok_or_else(|| BlockIndexError::UnexpectedError("Invalid block timestamp".to_string()))?;

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
                block.cb_tx.map(|cb_tx| cb_tx.credit_pool_balance),
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
    pub async fn catch_up(&self) -> Result<i64, String> {
        let chain_height = self.rpc.get_block_count().await.expect("Failed to get chain height");

        let client = self.db.begin().await.expect("Failed to acquire DB connection");
        let db_height: i64 = self.db.get_max_block_height(&**client).await.expect("Failed to get db height");
        drop(client);

        if db_height >= chain_height {
            info!(chain_height, db_height, "Already up to date");
            return Ok(chain_height);
        }

        let start = db_height + 1;
        let count = chain_height - db_height;
        info!(
            from = start,
            to = chain_height,
            blocks = count,
            "Catching up"
        );

        for height in start..=chain_height {
            self.index_block(height).await
                .map_err(|e| e.to_string())?;

            if (height - start) % 100 == 0 && height != start {
                info!(
                    height,
                    remaining = chain_height - height,
                    "Catch-up progress"
                );
            }
        }

        info!(chain_height, "Catch-up complete");
        Ok(chain_height)
    }
}