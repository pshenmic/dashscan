use crate::db::Database;
use crate::rpc::{Block, Transaction, DashRpcClient};
use serde_json::Value;
use tracing::{debug, info, warn};

pub struct BlockProcessor {
    pub rpc: DashRpcClient,
    pub db: Database,
}

impl BlockProcessor {
    pub fn new(rpc: DashRpcClient, db: Database) -> Self {
        Self { rpc, db }
    }

    pub async fn index_block(&self, height: i64) -> Result<(), String> {
        // Check for reorg: if we have a block at this height, verify it matches
        if let Some(existing_hash) = self.db.get_block_hash_at_height(height).await? {
            let block = self.rpc.get_block_by_height(height).await?;
            if existing_hash == block.hash {
                debug!(height, "Block already indexed, skipping");
                return Ok(());
            }
            // Reorg detected — delete old block and re-index
            warn!(
                height,
                old_hash = %existing_hash,
                new_hash = %block.hash,
                "Reorg detected, re-indexing block"
            );
            self.db.delete_block_at_height(height).await?;
            return self.process_block(block).await;
        }

        let block = self.rpc.get_block_by_height(height).await?;
        self.process_block(block).await
    }

    async fn process_block(&self, block: Block) -> Result<(), String> {
        let tx_count = block.tx.len() as i32;

        self.db
            .insert_block(
                &block.hash,
                block.height,
                block.time,
                block.previous_block_hash.as_deref(),
                &block.merkle_root,
                block.size,
                block.nonce,
                block.difficulty,
                &block.chainwork,
                tx_count,
            )
            .await?;

        for tx in &block.tx {
            self.process_transaction(tx, &block.hash, block.height).await?;
        }

        info!(
            height = block.height,
            hash = %block.hash,
            txs = tx_count,
            "Indexed block"
        );
        Ok(())
    }

    async fn process_transaction(
        &self,
        tx: &Transaction,
        block_hash: &str,
        block_height: i64,
    ) -> Result<(), String> {
        let tx_type = tx.tx_type.unwrap_or(0);
        let is_coinbase = tx.vin.first().map_or(false, |v| v.coinbase.is_some());

        self.db
            .insert_transaction(
                &tx.txid,
                block_hash,
                tx.version,
                tx_type,
                tx.size,
                tx.locktime,
                is_coinbase,
            )
            .await?;

        // Process inputs
        for (i, vin) in tx.vin.iter().enumerate() {
            let prev_txid = vin.txid.as_deref();
            let prev_vout = vin.vout;
            let coinbase_data = vin.coinbase.as_deref();

            self.db
                .insert_tx_input(&tx.txid, i as i32, prev_txid, prev_vout, coinbase_data)
                .await?;
        }

        // Process outputs
        for vout in &tx.vout {
            let value_duffs = (vout.value * 100_000_000.0).round() as i64;
            let script_hex = vout.script_pub_key.hex.as_deref();
            let script_type = vout.script_pub_key.script_type.as_deref();
            let address = vout.script_pub_key.first_address();

            self.db
                .insert_tx_output(
                    &tx.txid,
                    vout.n,
                    value_duffs,
                    script_hex,
                    script_type,
                    address.as_deref(),
                )
                .await?;

            // Track address first seen
            if let Some(ref addr) = address {
                self.db
                    .upsert_address(addr, &tx.txid, block_height)
                    .await?;
            }
        }

        // Store special transaction payload if type > 0
        if tx_type > 0 {
            let payload = self.build_special_tx_payload(tx);
            self.db
                .insert_special_transaction(&tx.txid, tx_type, &payload)
                .await?;
            debug!(txid = %tx.txid, tx_type, "Stored special transaction");
        }

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

    /// Catch up from last indexed block to current chain tip
    pub async fn catch_up(&self) -> Result<i64, String> {
        let chain_height = self.rpc.get_block_count().await?;
        let db_height: i64 = self.db.get_max_block_height().await?.unwrap_or(-1);

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
            self.index_block(height).await?;

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
