mod config;
mod db;
mod errors;
mod p2p;
mod p2p_converter;
mod processor;
mod rpc;
mod zmq;
mod miner_pool;
mod utils;

use db::Database;
use processor::BlockProcessor;
use rpc::DashRpcClient;
use std::ops::DerefMut;
use std::{env, process};
use zmq::{zmq_listener, zmq_rawtx_listener, zmq_rawchainlock_listener};

use crate::config::Config;
use dotenv::dotenv;
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{error, info, warn};
use crate::miner_pool::init_miners_pools;

#[tokio::main]
async fn main() {
    // Load .env file
    dotenv().ok();

    let args: Vec<String> = env::args().collect();

    if args.len() > 1 {
        let arg = args.get(1).unwrap();

        match arg.as_str() {
            "drop_db" => {
                let config = Config::from_env();
                let pg_config = config.pg_config();
                let pool = pg_config
                    .create_pool(
                        Some(deadpool_postgres::Runtime::Tokio1),
                        tokio_postgres::NoTls,
                    )
                    .expect("Failed to create database pool");

                let mut conn = pool.get().await.unwrap();
                let client = conn.deref_mut().deref_mut();

                client
                    .batch_execute(
                        "BEGIN; \
                         DROP TABLE IF EXISTS masternodes; \
                         DROP TABLE IF EXISTS special_transactions; \
                         DROP TABLE IF EXISTS tx_inputs; \
                         DROP TABLE IF EXISTS tx_outputs; \
                         DROP TABLE IF EXISTS addresses; \
                         DROP TABLE IF EXISTS transactions; \
                         DROP TABLE IF EXISTS blocks; \
                         DROP TABLE IF EXISTS miner_pools; \
                         DROP TABLE IF EXISTS miner_names; \
                         DROP TABLE IF EXISTS refinery_schema_history; \
                         COMMIT;",
                    )
                    .await
                    .expect("Failed to drop tables");

                println!("All tables dropped successfully");

                process::exit(0);
            }
            "migrate" => {
                let config = Config::from_env();
                let pg_config = config.pg_config();
                let pool = pg_config
                    .create_pool(
                        Some(deadpool_postgres::Runtime::Tokio1),
                        tokio_postgres::NoTls,
                    )
                    .expect("Failed to create database pool");

                let migrations = refinery::load_sql_migrations("./migrations")
                    .expect("Failed to load migrations");

                let mut conn = pool.get().await.unwrap();
                let client = conn.deref_mut().deref_mut();
                let runner = refinery::Runner::new(&migrations);

                let report = runner.run_async(client).await.expect("Migration failed");

                println!("{:?}", report);

                process::exit(0);
            }
            _ => panic!("Invalid argument"),
        }
    }

    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    info!("Dash Blockchain Indexer starting...");

    // Load config
    let config = Config::from_env();

    // Connect to PostgreSQL
    let pg_config = config.pg_config();
    let pool = pg_config
        .create_pool(
            Some(deadpool_postgres::Runtime::Tokio1),
            tokio_postgres::NoTls,
        )
        .expect("Failed to create database pool");

    let db = Database::new(pool);

    // Sync miner pools from embedded pools.json
    let (miner_pools, miner_pool_ids) = match init_miners_pools() {
        Ok(pools) => {
            match db.ensure_miner_pools(&pools).await {
                Ok(ids) => (pools, ids),
                Err(e) => {
                    error!("Failed to sync miner pools: {e}");
                    (pools, std::collections::HashMap::new())
                }
            }
        }
        Err(e) => {
            error!("Failed to load miner pools: {e:?}");
            (vec![], std::collections::HashMap::new())
        }
    };

    // Connect to Dash Core RPC
    let rpc = DashRpcClient::new(
        &config.rpc_host,
        &config.rpc_port,
        &config.rpc_user,
        &config.rpc_password,
    );

    // Test RPC connectivity
    if let Err(e) = rpc.ping().await {
        error!("Failed to connect to Dash Core: {e}");
        error!("Make sure Dash Core is running and RPC credentials are correct");
        std::process::exit(1);
    }

    // Create block processor
    let processor = Arc::new(BlockProcessor::new(rpc, db, config.network, miner_pools, miner_pool_ids));

    // Catch up with the blockchain
    let last_height = match processor.catch_up(&config).await {
        Ok(h) => h,
        Err(e) => {
            error!("Catch-up failed: {e}");
            std::process::exit(1);
        }
    };

    info!(last_height, "Starting continuous indexing...");

    // Channel for ZMQ block notifications
    let (zmq_tx, zmq_rx) = mpsc::channel::<String>(32);

    // Channel for ZMQ rawtx notifications
    let (rawtx_tx, rawtx_rx) = mpsc::channel::<Vec<u8>>(256);

    // Channel for ZMQ rawtxlock notifications: (txid_hex, islock_hex)
    let (rawtxlock_tx, rawtxlock_rx) = mpsc::channel::<(String, String)>(256);

    // Channel for ZMQ rawchainlock notifications: locked block height
    let (rawchainlock_tx, rawchainlock_rx) = mpsc::channel::<i32>(32);

    // Spawn ZMQ listeners
    let zmq_url = config.zmq_url.clone();
    tokio::spawn(async move {
        zmq_listener(zmq_url, zmq_tx).await;
    });

    let zmq_rawtx_url = config.zmq_url.clone();
    tokio::spawn(async move {
            zmq_rawtx_listener(zmq_rawtx_url, rawtx_tx, rawtxlock_tx).await;
    });

    let zmq_rawchainlock_url = config.zmq_url.clone();
    tokio::spawn(async move {
        zmq_rawchainlock_listener(zmq_rawchainlock_url, rawchainlock_tx).await;
    });

    // Spawn polling fallback
    let poll_processor = Arc::clone(&processor);
    let poll_interval = config.poll_interval_secs;
    let (poll_tx, poll_rx) = mpsc::channel::<()>(1);

    tokio::spawn(async move {
        polling_loop(poll_processor, poll_interval, poll_tx).await;
    });

    // Main loop: process ZMQ and poll events
    continuous_indexing(processor, zmq_rx, rawtx_rx, rawtxlock_rx, rawchainlock_rx, poll_rx, config).await;
}

async fn polling_loop(processor: Arc<BlockProcessor>, interval_secs: u64, tx: mpsc::Sender<()>) {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(interval_secs));

    loop {
        interval.tick().await;

        match processor.rpc.get_block_count().await {
            Ok(chain_height) => {
                let db_height: i64 = processor
                    .db
                    .get_max_block_height()
                    .await
                    .expect("Failed to get max block height from database");

                if chain_height > db_height {
                    info!(chain_height, db_height, "Polling: new blocks detected");
                    let _ = tx.send(()).await;
                }
            }
            Err(e) => {
                warn!("Polling: RPC error: {e}");
            }
        }
    }
}

async fn continuous_indexing(
    processor: Arc<BlockProcessor>,
    mut zmq_rx: mpsc::Receiver<String>,
    mut rawtx_rx: mpsc::Receiver<Vec<u8>>,
    mut rawtxlock_rx: mpsc::Receiver<(String, String)>,
    mut rawchainlock_rx: mpsc::Receiver<i32>,
    mut poll_rx: mpsc::Receiver<()>,
    config: Config,
) {
    loop {
        tokio::select! {
            Some(hash) = zmq_rx.recv() => {
                // ZMQ notified us of a new block — use the hash directly, no extra RPC call
                info!("ZMQ: new block detected: {}", hash);
                match processor.index_block_by_hash(&hash).await {
                    Ok(None) => info!("Block {} already indexed, skipping", hash),
                    Ok(Some(_)) => {
                        if let Err(e) = processor.sync_masternodes().await {
                            error!("Failed to sync masternode list: {}", e);
                        }
                    },
                    Err(e) => error!("Failed to index block {}: {}", hash, e),
                }

                backoff_sleep(1).await;
            }
            Some(raw_bytes) = rawtx_rx.recv() => {
                match processor.index_pending_transaction(raw_bytes, &config).await {
                    Ok(true)  => info!("Indexed pending transaction"),
                    Ok(false) => info!("Pending transaction already exists, skipping"),
                    Err(e)    => error!("Failed to index pending transaction: {e}"),
                }
            }
            Some((txid, lock_hex)) = rawtxlock_rx.recv() => {
                if let Err(e) = processor.apply_instant_lock(txid, lock_hex).await {
                    error!("Failed to apply instant lock: {e}");
                }
            }
            Some(height) = rawchainlock_rx.recv() => {
                if let Err(e) = processor.apply_chain_lock(height).await {
                    error!("Failed to apply chain lock: {e}");
                }
            }
            Some(()) = poll_rx.recv() => {
                // Polling detected new blocks
                info!("Polling: new blocks detected");
                index_new_blocks(&processor).await;
                backoff_sleep(1).await;
            }
        }
    }
}

async fn index_new_blocks(processor: &BlockProcessor) {
    let chain_height: i64 = processor.rpc.get_block_count().await
        .expect("Could not get block count from RPC");

    let db_height: i64 = processor.db.get_max_block_height().await
        .expect("Could not read max block height from database");

    for height in (db_height + 1)..=chain_height {
        match processor.index_block_by_height(height).await {
            Ok(None) => info!("Block {} already indexed, skipping", height),
            Ok(Some(hash)) => info!("Indexed live block {} ({})", height, hash),
            Err(e) => error!("Failed to index block with height {}: {}", height, e),
        }
    }

    if let Err(e) = processor.sync_masternodes().await {
        error!("Failed to sync masternode list: {}", e);
    }
}

async fn backoff_sleep(seconds: u64) {
    warn!(seconds, "Backing off before retry");
    tokio::time::sleep(std::time::Duration::from_secs(seconds)).await;
}
