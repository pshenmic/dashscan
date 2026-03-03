use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::atomic::{AtomicU64, Ordering};
use tracing::{debug, warn};
use crate::errors::rpc_error::RpcError;
use crate::errors::unexpected_error::UnexpectedError;

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
    error: Option<DashRpcError>,
}

#[derive(Deserialize, Debug)]
struct DashRpcError {
    code: i64,
    message: String,
}
#[derive(Deserialize, Debug)]
pub struct CbTx {
    pub version: i32,

    #[serde(rename = "merkleRootMNList")]
    pub merkle_root_mn_list: String,

    #[serde(rename = "merkleRootQuorums")]
    pub merkle_root_quorums: String,

    #[serde(rename = "bestCLHeightDiff")]
    pub best_cl_height_diff: i64,

    #[serde(rename = "bestCLSignature")]
    pub best_cl_signature: String,

    #[serde(rename = "creditPoolBalance")]
    pub credit_pool_balance: f64
}

// --- Block types ---

#[derive(Deserialize, Debug)]
pub struct Block {
    pub hash: String,
    pub height: i64,
    pub time: i64,
    pub version: i32,
    #[serde(rename = "previousblockhash")]
    pub previous_block_hash: Option<String>,
    #[serde(rename = "merkleroot")]
    pub merkle_root: String,
    pub size: i64,
    pub nonce: i64,
    pub difficulty: f64,
    pub chainwork: String,
    pub tx: Vec<Transaction>,
    #[serde(rename = "cbTx")]
    pub cb_tx: Option<CbTx>
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

    async fn call(&self, method: &str, params: Vec<Value>) -> Result<Value, RpcError> {
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
            .map_err(|e| RpcError { code: 0, message: e.to_string()})?;

        let rpc_response: RpcResponse = response
            .json()
            .await
            .map_err(|e| RpcError { code: 0, message: e.to_string()})?;

        if let Some(err) = rpc_response.error {
            return Err(RpcError { code: err.code, message: err.message });
        }

        rpc_response
            .result.ok_or_else(|| RpcError { code: 0, message: "No result in JSON value response".to_string()})
    }

    pub async fn get_block_count(&self) -> Result<i64, RpcError> {
        let result = self.call("getblockcount", vec![]).await?;

        result
            .as_i64()
            .ok_or_else(|| RpcError { code: 0, message: "getblockcount: expected integer".to_string()})
    }

    pub async fn get_block_hash(&self, height: i64) -> Result<String, RpcError> {
        let result = self
            .call("getblockhash", vec![Value::from(height)])
            .await?;

        result
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| RpcError { code: 0, message: "getblockhash: expected string".to_string() })
    }

    pub async fn get_block(&self, hash: &str) -> Result<Block, RpcError> {
        let result = self
            .call(
                "getblock",
                vec![Value::from(hash), Value::from(2)], // verbosity=2 for full tx data
            )
            .await
            .map_err(|e| RpcError { code: 0, message: e.message })?;

        debug!("Fetched block {hash}");
        serde_json::from_value(result)
            .map_err(|e| RpcError { code: 0, message: format!("Failed to parse JSON respose with serde: {e}") })
    }

    pub async fn get_block_by_height(&self, height: i64) -> Result<Block, RpcError> {
        let hash = self.get_block_hash(height).await?;

        self.get_block(&hash)
            .await
            .map_err(|e| RpcError { code: 0, message: e.to_string() })
    }

    pub async fn get_blockchain_info(&self) -> Result<Value, RpcError> {
        self.call("getblockchaininfo", vec![]).await.map_err(|e| RpcError { code: 0, message: e.to_string() })
    }

    /// Test connectivity by calling getblockchaininfo
    pub async fn ping(&self) -> Result<(), RpcError> {
        let info = self.get_blockchain_info().await?;
        let chain = info
            .get("chain")
            .and_then(|v| v.as_str())
            .expect("Blockchain info missing 'chain' field");

        let blocks = info
            .get("blocks")
            .and_then(|v| v.as_i64())
            .expect("Blockchain info missing 'blocks' field");

        warn!(chain, blocks, "Connected to Dash Core");

        Ok(())
    }
}
