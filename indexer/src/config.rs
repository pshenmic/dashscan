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
    pub database_url: String,
    pub poll_interval_secs: u64,
    pub catch_up_batch_size: usize,
    pub p2p_batch_size: usize,
}

pub fn superblock_interval(network: Network) -> i64 {
    match network {
        Network::Mainnet => 16616,
        Network::Testnet => 24,
        Network::Devnet => 24,
        Network::Regtest => 20,
        _ => 16616,
    }
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
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            start_height: env::var("START_HEIGHT")
                .unwrap_or_else(|_| "0".to_string())
                .parse()
                .expect("START_HEIGHT must be a number"),
            poll_interval_secs: env::var("POLL_INTERVAL_SECS")
                .unwrap_or_else(|_| "10".to_string())
                .parse()
                .expect("POLL_INTERVAL_SECS must be a number"),
            catch_up_batch_size: env::var("CATCH_UP_BATCH_SIZE")
                .unwrap_or_else(|_| "128".to_string())
                .parse()
                .expect("CATCH_UP_BATCH_SIZE must be a number"),
            p2p_batch_size: env::var("P2P_BATCH_SIZE")
                .unwrap_or_else(|_| "16".to_string())
                .parse()
                .expect("P2P_BATCH_SIZE must be a number"),
        }
    }

    pub fn pg_config(&self) -> deadpool_postgres::Config {
        let mut cfg = deadpool_postgres::Config::new();
        // Per-session GUCs applied to every pooled connection.
        //   client_min_messages=WARNING: suppress NOTICE spam from
        //     `CREATE TEMP TABLE IF NOT EXISTS` staging tables.
        //   synchronous_commit=off: indexer is restartable from chain state,
        //     so losing the last ~200ms of commits on crash just re-indexes
        //     a few blocks.
        cfg.options = Some("-c client_min_messages=WARNING -c synchronous_commit=off".to_string());
        // Parse postgres://user:password@host:port/dbname
        let without_scheme = self
            .database_url
            .as_str()
            .trim_start_matches("postgresql://")
            .trim_start_matches("postgres://");
        if let Some((userinfo, rest)) = without_scheme.split_once('@') {
            if let Some((user, pass)) = userinfo.split_once(':') {
                cfg.user = Some(user.to_string());
                cfg.password = Some(pass.to_string());
            } else {
                cfg.user = Some(userinfo.to_string());
            }
            let (hostport, dbname) = rest
                .split_once('/')
                .map(|(h, d)| (h, Some(d.to_string())))
                .unwrap_or((rest, None));
            cfg.dbname = dbname;
            if let Some((host, port)) = hostport.split_once(':') {
                cfg.host = Some(host.to_string());
                cfg.port = port.parse().ok();
            } else {
                cfg.host = Some(hostport.to_string());
            }
        }
        cfg
    }
}
