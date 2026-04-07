use clickhouse::Client;
use dashcore::Network;
use std::env;

#[derive(Clone)]
pub struct Config {
    pub rpc_host: String,
    pub rpc_port: String,
    pub rpc_user: String,
    pub rpc_password: String,
    pub p2p_host: String,
    pub p2p_port: u16,
    pub network: Network,
    pub start_height: i64,
    pub zmq_url: String,
    pub poll_interval_secs: u64,
    pub catch_up_batch_size: usize,
    pub p2p_batch_size: usize,
    pub clickhouse_url: String,
    pub clickhouse_user: String,
    pub clickhouse_password: String,
    pub clickhouse_db: String,
    pub insert_chunk_size: u64,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            rpc_host: env::var("CORE_RPC_HOST").expect("CORE_RPC_HOST must be set"),
            rpc_port: env::var("CORE_RPC_PORT").expect("CORE_RPC_PORT must be set"),
            rpc_user: env::var("CORE_RPC_USER").expect("CORE_RPC_USER must be set"),
            rpc_password: env::var("CORE_RPC_PASSWORD").expect("CORE_RPC_PASSWORD must be set"),
            p2p_host: env::var("CORE_P2P_HOST").expect("CORE_P2P_HOST must be set"),
            p2p_port: env::var("CORE_P2P_PORT")
                .expect("CORE_P2P_PORT must be set")
                .parse()
                .expect("CORE_P2P_PORT must be a number"),
            network: env::var("NETWORK")
                .unwrap_or_else(|_| "mainnet".to_string())
                .parse()
                .expect("Invalid network value"),
            zmq_url: env::var("CORE_ZMQ_URL").expect("CORE_ZMQ_URL must be set (tcp://....)"),
            poll_interval_secs: env::var("POLL_INTERVAL_SECS")
                .unwrap_or_else(|_| "10".to_string())
                .parse()
                .expect("POLL_INTERVAL_SECS must be a number"),
            start_height: env::var("START_HEIGHT")
                .unwrap_or_else(|_| "0".to_string())
                .parse()
                .expect("START_HEIGHT must be a number"),
            catch_up_batch_size: 250,
            p2p_batch_size: 128,
            clickhouse_url: env::var("CLICKHOUSE_URL")
                .unwrap_or_else(|_| "http://localhost:8123".to_string()),
            clickhouse_user: env::var("CLICKHOUSE_USER")
                .unwrap_or_else(|_| "default".to_string()),
            clickhouse_password: env::var("CLICKHOUSE_PASSWORD")
                .unwrap_or_else(|_| "".to_string()),
            clickhouse_db: env::var("CLICKHOUSE_DB")
                .unwrap_or_else(|_| "dashscan".to_string()),
            insert_chunk_size: env::var("INSERT_CHUNK_SIZE")
                .unwrap_or_else(|_| "10000".to_string())
                .parse()
                .expect("INSERT_CHUNK_SIZE must be a number"),
        }
    }

    pub fn clickhouse_client(&self) -> Client {
        Client::default()
            .with_url(&self.clickhouse_url)
            .with_user(&self.clickhouse_user)
            .with_password(&self.clickhouse_password)
            .with_database(&self.clickhouse_db)
    }
}