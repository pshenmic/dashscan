use clickhouse::{Client, Row};
use clickhouse::inserter::Inserter;
use serde::{Deserialize, Serialize};
use crate::rpc::{MasternodeEntry, Transaction as RpcTransaction};

// ---------------------------------------------------------------------------
// Row types — field names must match ClickHouse column names exactly
// ---------------------------------------------------------------------------

#[derive(Row, Serialize, Clone)]
pub struct BlockRow {
    pub hash: String,
    pub height: i32,
    pub version: i32,
    pub timestamp: u32,
    pub previous_block_hash: Option<String>,
    pub merkle_root: String,
    pub size: i32,
    pub nonce: i64,
    pub difficulty: f64,
    pub chainwork: String,
    pub tx_count: i32,
    pub merkle_root_mn_list: Option<String>,
    pub credit_pool_balance: Option<f64>,
    pub cbtx_version: Option<i32>,
    pub cbtx_height: Option<i32>,
    pub cbtx_merkle_root_quorums: Option<String>,
    pub cbtx_best_cl_height_diff: Option<i64>,
    pub cbtx_best_cl_signature: Option<String>,
}

#[derive(Row, Serialize, Clone)]
pub struct TransactionRow {
    pub hash: String,
    pub block_height: Option<i32>,
    pub version: i32,
    pub tx_type: i16,
    pub size: i32,
    pub locktime: i64,
    pub is_coinbase: bool,
}

#[derive(Row, Serialize, Clone)]
pub struct TxInputRow {
    pub tx_hash: String,
    pub vin_index: i32,
    pub prev_tx_hash: Option<String>,
    pub prev_vout_index: Option<i32>,
    pub coinbase_data: Option<String>,
}

#[derive(Row, Serialize, Clone)]
pub struct TxOutputRow {
    pub tx_hash: String,
    pub vout_index: i32,
    pub value: i64,
    pub script_pub_key: Option<String>,
    pub script_type: Option<String>,
    pub address: Option<String>,
}

#[derive(Row, Serialize, Clone)]
pub struct AddressRow {
    pub address: String,
    pub first_seen_tx_hash: String,
    pub first_seen_block: Option<i32>,
    pub last_seen_tx_hash: String,
    pub last_seen_block: Option<i32>,
}

#[derive(Row, Serialize, Clone)]
pub struct SpecialTransactionRow {
    pub tx_hash: String,
    pub tx_type: i16,
    pub payload: String,
}

#[derive(Row, Serialize, Clone)]
pub struct MasternodeRow {
    pub pro_tx_hash: String,
    pub address: String,
    pub payee: String,
    pub status: String,
    pub mn_type: String,
    pub pos_penalty_score: i32,
    pub consecutive_payments: i32,
    pub last_paid_time: i64,
    pub last_paid_block: i32,
    pub owner_address: String,
    pub voting_address: String,
    pub collateral_address: String,
    pub pub_key_operator: String,
}

// Used for read queries
#[derive(Row, Deserialize)]
struct HashRow {
    hash: String,
}

#[derive(Row, Deserialize)]
struct MaxHeightRow {
    max_height: i32,
}

// ---------------------------------------------------------------------------
// BlockBatchWriter — holds open Inserters across multiple blocks.
// Rows accumulate and are flushed automatically when chunk_size is reached.
// Call end() after the last block to flush remaining rows.
// ---------------------------------------------------------------------------

pub struct BlockBatchWriter {
    pub blocks: Inserter<BlockRow>,
    pub transactions: Inserter<TransactionRow>,
    pub tx_inputs: Inserter<TxInputRow>,
    pub tx_outputs: Inserter<TxOutputRow>,
    pub addresses: Inserter<AddressRow>,
    pub special_transactions: Inserter<SpecialTransactionRow>,
}

impl BlockBatchWriter {
    pub async fn commit(&mut self) -> Result<(), clickhouse::error::Error> {
        self.blocks.commit().await?;
        self.transactions.commit().await?;
        self.tx_inputs.commit().await?;
        self.tx_outputs.commit().await?;
        self.addresses.commit().await?;
        self.special_transactions.commit().await?;
        Ok(())
    }

    pub async fn end(self) -> Result<(), clickhouse::error::Error> {
        self.blocks.end().await?;
        self.transactions.end().await?;
        self.tx_inputs.end().await?;
        self.tx_outputs.end().await?;
        self.addresses.end().await?;
        self.special_transactions.end().await?;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

pub struct Database {
    pub client: Client,
    pub chunk_size: u64,
}

impl Database {
    pub fn new(client: Client, chunk_size: u64) -> Self {
        Self { client, chunk_size }
    }

    /// Create all tables if they do not exist. Idempotent — safe to run on startup.
    pub async fn create_tables(&self) -> Result<(), clickhouse::error::Error> {
        let ddl = vec![
            "CREATE TABLE IF NOT EXISTS blocks (
                hash                     String,
                height                   Int32,
                version                  Int32,
                timestamp                UInt32,
                previous_block_hash      Nullable(String),
                merkle_root              String,
                size                     Int32,
                nonce                    Int64,
                difficulty               Float64,
                chainwork                String,
                tx_count                 Int32,
                merkle_root_mn_list      Nullable(String),
                credit_pool_balance      Nullable(Float64),
                cbtx_version             Nullable(Int32),
                cbtx_height              Nullable(Int32),
                cbtx_merkle_root_quorums Nullable(String),
                cbtx_best_cl_height_diff Nullable(Int64),
                cbtx_best_cl_signature   Nullable(String)
            ) ENGINE = ReplacingMergeTree()
            ORDER BY hash",

            "CREATE TABLE IF NOT EXISTS transactions (
                hash         String,
                block_height Nullable(Int32),
                version      Int32,
                tx_type      Int16,
                size         Int32,
                locktime     Int64,
                is_coinbase  Bool
            ) ENGINE = ReplacingMergeTree()
            ORDER BY hash",

            "CREATE TABLE IF NOT EXISTS tx_inputs (
                tx_hash        String,
                vin_index      Int32,
                prev_tx_hash   Nullable(String),
                prev_vout_index Nullable(Int32),
                coinbase_data  Nullable(String)
            ) ENGINE = ReplacingMergeTree()
            ORDER BY (tx_hash, vin_index)",

            "CREATE TABLE IF NOT EXISTS tx_outputs (
                tx_hash    String,
                vout_index Int32,
                value      Int64,
                script_pub_key Nullable(String),
                script_type    Nullable(String),
                address        Nullable(String)
            ) ENGINE = ReplacingMergeTree()
            ORDER BY (tx_hash, vout_index)",

            "CREATE TABLE IF NOT EXISTS addresses (
                address             String,
                first_seen_tx_hash  String,
                first_seen_block    Nullable(Int32),
                last_seen_tx_hash   String,
                last_seen_block     Nullable(Int32)
            ) ENGINE = ReplacingMergeTree()
            ORDER BY address",

            "CREATE TABLE IF NOT EXISTS special_transactions (
                tx_hash  String,
                tx_type  Int16,
                payload  String
            ) ENGINE = ReplacingMergeTree()
            ORDER BY tx_hash",

            "CREATE TABLE IF NOT EXISTS masternodes (
                pro_tx_hash          String,
                address              String,
                payee                String,
                status               String,
                mn_type              String,
                pos_penalty_score    Int32,
                consecutive_payments Int32,
                last_paid_time       Int64,
                last_paid_block      Int32,
                owner_address        String,
                voting_address       String,
                collateral_address   String,
                pub_key_operator     String
            ) ENGINE = ReplacingMergeTree()
            ORDER BY pro_tx_hash",
        ];

        for stmt in ddl {
            self.client.query(stmt).execute().await?;
        }

        Ok(())
    }

    /// Drop all tables. Used by the `drop_db` CLI command.
    pub async fn drop_tables(&self) -> Result<(), clickhouse::error::Error> {
        let tables = [
            "masternodes",
            "special_transactions",
            "tx_inputs",
            "tx_outputs",
            "addresses",
            "transactions",
            "blocks",
        ];
        for table in tables {
            self.client
                .query(&format!("DROP TABLE IF EXISTS {table}"))
                .execute()
                .await?;
        }
        Ok(())
    }

    pub async fn get_max_block_height(&self) -> Result<i64, clickhouse::error::Error> {
        let row = self
            .client
            .query("SELECT max(height) AS max_height FROM blocks")
            .fetch_one::<MaxHeightRow>()
            .await?;
        Ok(row.max_height as i64)
    }

    pub async fn get_block_by_hash(
        &self,
        hash: &str,
    ) -> Result<Option<String>, clickhouse::error::Error> {
        let row = self
            .client
            .query("SELECT hash FROM blocks FINAL WHERE hash = ? LIMIT 1")
            .bind(hash)
            .fetch_optional::<HashRow>()
            .await?;
        Ok(row.map(|r| r.hash))
    }

    /// Create a BlockBatchWriter with open inserters for all block-related tables.
    /// Use this for both catch-up (one writer for all blocks) and live sync (one per block).
    pub fn batch_writer(&self) -> Result<BlockBatchWriter, clickhouse::error::Error> {
        Ok(BlockBatchWriter {
            blocks: self.client.inserter("blocks")?.with_max_rows(self.chunk_size),
            transactions: self.client.inserter("transactions")?.with_max_rows(self.chunk_size),
            tx_inputs: self.client.inserter("tx_inputs")?.with_max_rows(self.chunk_size),
            tx_outputs: self.client.inserter("tx_outputs")?.with_max_rows(self.chunk_size),
            addresses: self.client.inserter("addresses")?.with_max_rows(self.chunk_size),
            special_transactions: self.client.inserter("special_transactions")?.with_max_rows(self.chunk_size),
        })
    }

    pub async fn insert_pending_transaction(
        &self,
        tx: &RpcTransaction,
    ) -> Result<(), clickhouse::error::Error> {
        let row = TransactionRow {
            hash: tx.txid.clone(),
            block_height: None,
            version: tx.version,
            tx_type: tx.tx_type.unwrap_or(0),
            size: tx.size as i32,
            locktime: tx.locktime,
            is_coinbase: tx.vin.first().map_or(false, |v| v.coinbase.is_some()),
        };
        let mut insert = self.client.insert("transactions")?;
        insert.write(&row).await?;
        insert.end().await?;
        Ok(())
    }

    pub async fn insert_pending_tx_inputs(
        &self,
        tx: &RpcTransaction,
    ) -> Result<(), clickhouse::error::Error> {
        let mut insert = self.client.insert("tx_inputs")?;
        for (i, vin) in tx.vin.iter().enumerate() {
            insert.write(&TxInputRow {
                tx_hash: tx.txid.clone(),
                vin_index: i as i32,
                prev_tx_hash: vin.txid.clone(),
                prev_vout_index: vin.vout,
                coinbase_data: vin.coinbase.clone(),
            }).await?;
        }
        insert.end().await?;
        Ok(())
    }

    pub async fn insert_pending_addresses(
        &self,
        rows: &[AddressRow],
    ) -> Result<(), clickhouse::error::Error> {
        if rows.is_empty() {
            return Ok(());
        }
        let mut insert = self.client.insert("addresses")?;
        for row in rows {
            insert.write(row).await?;
        }
        insert.end().await?;
        Ok(())
    }

    pub async fn insert_pending_tx_outputs(
        &self,
        tx: &RpcTransaction,
        address_map: &std::collections::HashMap<(i32, String), String>,
    ) -> Result<(), clickhouse::error::Error> {
        let mut insert = self.client.insert("tx_outputs")?;
        for vout in &tx.vout {
            let address = address_map.get(&(vout.n, tx.txid.clone())).cloned();
            insert.write(&TxOutputRow {
                tx_hash: tx.txid.clone(),
                vout_index: vout.n,
                value: (vout.value * 100_000_000.0).round() as i64,
                script_pub_key: vout.script_pub_key.hex.clone(),
                script_type: vout.script_pub_key.script_type.clone(),
                address,
            }).await?;
        }
        insert.end().await?;
        Ok(())
    }

    pub async fn upsert_masternodes_batch(
        &self,
        masternodes: &[MasternodeEntry],
    ) -> Result<(), clickhouse::error::Error> {
        if masternodes.is_empty() {
            return Ok(());
        }
        let mut ins = self.client.inserter::<MasternodeRow>("masternodes")?
            .with_max_rows(self.chunk_size);

        for m in masternodes {
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
            ins.write(&row)?;
            ins.commit().await?;
        }
        ins.end().await?;
        Ok(())
    }
}