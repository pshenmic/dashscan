use std::collections::{HashMap, HashSet};
use chrono::{DateTime, Utc};
use dashcore::consensus::encode::deserialize_partial;
use deadpool_postgres::Client;
use serde_json::Value;
use tokio_postgres::GenericClient;
use tracing::info;

use crate::config::Config;
use crate::errors::block_index_error::BlockIndexError;
use crate::p2p_converter;
use crate::rpc::{Block, Transaction};

use super::BlockProcessor;

impl BlockProcessor {
    /// Indexes a block using an already-acquired pool connection.
    /// Opens a DB transaction, writes everything, and commits.
    /// Used by live sync (single-block commits) — chain_locked is set later via rawchainlocksig.
    pub(super) async fn process_block(
        &self,
        client: &mut Client,
        block: Block,
        config: &Config,
    ) -> Result<(), BlockIndexError> {
        let db_tx = client.transaction().await?;

        let input_addresses = self.resolve_input_addresses(&block.tx, config).await?;
        self.write_block(&*db_tx, block, false, &input_addresses).await?;

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
        input_addresses: &HashMap<(String, i32), String>,
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

            self.write_transaction_data(
                client,
                &block.tx,
                &tx_map,
                input_addresses,
                Some(block.height as i32),
            )
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

    /// Shared pipeline: upsert input/output addresses, insert inputs and outputs.
    /// Used by both `write_block` (confirmed) and `index_pending_transaction` (mempool).
    /// `block_height` is None for pending transactions.
    async fn write_transaction_data(
        &self,
        client: &impl GenericClient,
        txs: &[Transaction],
        tx_map: &HashMap<String, i32>,
        input_addresses: &HashMap<(String, i32), String>,
        block_height: Option<i32>,
    ) -> Result<(), BlockIndexError> {
        // Upsert input addresses and build (prev_hash, vout_idx) -> address_id map
        let mut seen_input_addrs: HashSet<String> = HashSet::new();
        let mut input_addr_upserts: Vec<(String, i32, Option<i32>)> = Vec::new();
        let mut input_addr_keys: Vec<((String, i32), String)> = Vec::new();

        for ((prev_hash, vout_idx), addr) in input_addresses {
            if seen_input_addrs.insert(addr.clone()) {
                input_addr_upserts.push((addr.clone(), 0, block_height));
            }
            input_addr_keys.push(((prev_hash.clone(), *vout_idx), addr.clone()));
        }

        let input_addr_id_map = if !input_addr_upserts.is_empty() {
            self.db.upsert_addresses_batch(client, &input_addr_upserts).await?
        } else {
            HashMap::new()
        };

        let mut input_address_ids: HashMap<(String, i32), i32> = HashMap::new();
        for ((prev_hash, vout_idx), addr) in input_addr_keys {
            if let Some(&id) = input_addr_id_map.get(&addr) {
                input_address_ids.insert((prev_hash, vout_idx), id);
            }
        }

        self.db
            .insert_tx_inputs_batch(client, txs, tx_map, &input_address_ids)
            .await?;

        // Collect output addresses, keeping the last tx_id per address (last wins)
        let mut upsert_records: Vec<(String, i32, Option<i32>)> = Vec::new();
        let mut seen_addresses: HashMap<String, usize> = HashMap::new();
        let mut vout_to_address: Vec<((i32, String), String)> = Vec::new();

        for tx in txs {
            for (vout_index, vout) in tx.vout.iter().enumerate() {
                if let Some(ref addr) = vout.script_pub_key.first_address() {
                    let tx_id = tx_map[&tx.txid];
                    if let Some(&idx) = seen_addresses.get(addr.as_str()) {
                        upsert_records[idx] = (addr.clone(), tx_id, block_height);
                    } else {
                        seen_addresses.insert(addr.clone(), upsert_records.len());
                        upsert_records.push((addr.clone(), tx_id, block_height));
                    }
                    vout_to_address.push(((vout_index as i32, tx.txid.clone()), addr.clone()));
                }
            }
        }

        let addr_id_map = self.db.upsert_addresses_batch(client, &upsert_records).await?;

        let mut addresses_map: HashMap<(i32, String), i32> = HashMap::new();
        for ((vout_idx, txid), addr) in vout_to_address {
            let id = *addr_id_map.get(&addr).ok_or_else(|| {
                BlockIndexError::UnexpectedError(format!("Missing address id for {addr}"))
            })?;
            addresses_map.insert((vout_idx, txid), id);
        }

        self.db
            .insert_tx_outputs_batch(client, txs, &addresses_map, tx_map)
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
            let input_addresses = self.resolve_input_addresses(&[tx.clone()], config).await?;

            self.write_transaction_data(&*db_tx, &[tx], &tx_map, &input_addresses, None)
                .await?;

            true
        } else {
            false
        };

        db_tx.commit().await?;

        Ok(inserted)
    }
}