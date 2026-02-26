use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::atomic::{AtomicU64, Ordering};
use tracing::{debug, warn};

pub struct DashRpcClient {
    client: Client,
    host: String,
    port: String,
    user: String,
    password: String,
    request_id: AtomicU64,
}

#[derive(Serialize)]
struct RpcRequest {
    jsonrpc: &'static str,
    id: u64,
    method: String,
    params: Vec<Value>,
}

#[derive(Deserialize)]
struct RpcResponse {
    result: Option<Value>,
    error: Option<RpcError>,
}

#[derive(Deserialize, Debug)]
struct RpcError {
    code: i64,
    message: String,
}

// --- Block types ---

#[derive(Deserialize, Debug, Clone)]
pub struct Block {
    pub hash: String,
    pub height: i64,
    pub time: i64,
    #[serde(rename = "previousblockhash")]
    pub previous_block_hash: Option<String>,
    #[serde(rename = "merkleroot")]
    pub merkle_root: String,
    pub size: i64,
    pub nonce: i64,
    pub difficulty: f64,
    pub chainwork: String,
    pub tx: Vec<Transaction>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct Transaction {
    pub txid: String,
    pub version: i32,
    #[serde(rename = "type")]
    pub tx_type: Option<i16>,
    pub size: i64,
    pub locktime: i64,
    pub vin: Vec<Vin>,
    pub vout: Vec<Vout>,
    #[serde(rename = "extraPayloadSize")]
    pub extra_payload_size: Option<i32>,
    #[serde(rename = "extraPayload")]
    pub extra_payload: Option<String>,
    // Parsed special tx payload (varies by type)
    #[serde(flatten)]
    pub extra: serde_json::Map<String, Value>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct Vin {
    pub txid: Option<String>,
    pub vout: Option<i32>,
    pub coinbase: Option<String>,
    #[serde(rename = "scriptSig")]
    pub script_sig: Option<ScriptSig>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct ScriptSig {
    pub asm: String,
    pub hex: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct Vout {
    pub value: f64,
    pub n: i32,
    #[serde(rename = "scriptPubKey")]
    pub script_pub_key: ScriptPubKey,
}

#[derive(Deserialize, Debug, Clone)]
pub struct ScriptPubKey {
    pub asm: String,
    pub hex: Option<String>,
    #[serde(rename = "type")]
    pub script_type: Option<String>,
    pub addresses: Option<Vec<String>>,
    pub address: Option<String>,
}

impl ScriptPubKey {
    pub fn first_address(&self) -> Option<String> {
        if let Some(ref addr) = self.address {
            return Some(addr.clone());
        }
        if let Some(ref addrs) = self.addresses {
            return addrs.first().cloned();
        }
        None
    }
}

impl DashRpcClient {
    pub fn new(host: &str, port: &str, user: &str, password: &str) -> Self {
        Self {
            client: Client::new(),
            host: host.to_string(),
            port: port.to_string(),
            user: user.to_string(),
            password: password.to_string(),
            request_id: AtomicU64::new(0),
        }
    }

    async fn call(&self, method: &str, params: Vec<Value>) -> Result<Value, String> {
        let id = self.request_id.fetch_add(1, Ordering::Relaxed);
        let request = RpcRequest {
            jsonrpc: "1.0",
            id,
            method: method.to_string(),
            params,
        };

        let response = self
            .client
            .post(format!("http://{}:{}", self.host, self.port))
            .basic_auth(&self.user, Some(&self.password))
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("RPC request failed: {e}"))?;

        let rpc_response: RpcResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse RPC response: {e}"))?;

        if let Some(err) = rpc_response.error {
            return Err(format!("RPC error {}: {}", err.code, err.message));
        }

        rpc_response
            .result
            .ok_or_else(|| "RPC response has no result".to_string())
    }

    pub async fn get_block_count(&self) -> Result<i64, String> {
        let result = self.call("getblockcount", vec![]).await?;
        result
            .as_i64()
            .ok_or_else(|| "getblockcount: expected integer".to_string())
    }

    pub async fn get_block_hash(&self, height: i64) -> Result<String, String> {
        let result = self
            .call("getblockhash", vec![Value::from(height)])
            .await?;
        result
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "getblockhash: expected string".to_string())
    }

    pub async fn get_block(&self, hash: &str) -> Result<Block, String> {
        let result = self
            .call(
                "getblock",
                vec![Value::from(hash), Value::from(2)], // verbosity=2 for full tx data
            )
            .await?;

        debug!("Fetched block {hash}");
        serde_json::from_value(result).map_err(|e| format!("Failed to parse block: {e}"))
    }

    pub async fn get_block_by_height(&self, height: i64) -> Result<Block, String> {
        let hash = self.get_block_hash(height).await?;
        self.get_block(&hash).await
    }

    pub async fn get_blockchain_info(&self) -> Result<Value, String> {
        self.call("getblockchaininfo", vec![]).await
    }

    /// Test connectivity by calling getblockchaininfo
    pub async fn ping(&self) -> Result<(), String> {
        let info = self.get_blockchain_info().await?;
        let chain = info
            .get("chain")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let blocks = info
            .get("blocks")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        warn!(chain, blocks, "Connected to Dash Core");
        Ok(())
    }
}