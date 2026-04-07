mod config;
mod db;
mod errors;
mod p2p;
mod p2p_converter;
mod processor;
mod rpc;
mod zmq;

use db::Database;
use processor::BlockProcessor;
use rpc::DashRpcClient;
use std::{env, process};
use zmq::{zmq_listener, zmq_rawtx_listener};

use crate::config::Config;
use dotenv::dotenv;
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{error, info, warn};

#[tokio::main]
async fn main() {
    dotenv().ok();

    let args: Vec<String> = env::args().collect();

    if args.len() > 1 {
        let arg = args.get(1).unwrap();

        // Initialize logging early for CLI commands
        tracing_subscriber::fmt()
            .with_env_filter(
                tracing_subscriber::EnvFilter::try_from_default_env()
                    .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
            )
            .init();

        let config = Config::from_env();
        let client = config.clickhouse_client();
        let db = Database::new(client, config.insert_chunk_size);

        match arg.as_str() {
            "drop_db" => {
                db.drop_tables().await.expect("Failed to drop tables");
                println!("All tables dropped successfully");
                process::exit(0);
            }
            "migrate" => {
                db.create_tables().await.expect("Failed to create tables");
                println!("Tables created successfully");
                process::exit(0);
            }
            _ => panic!("Invalid argument"),
        }
    }

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    info!("Dash Blockchain Indexer starting...");

    let config = Config::from_env();

    let client = config.clickhouse_client();
    let db = Database::new(client, config.insert_chunk_size);

    // Ensure schema exists
    db.create_tables().await.expect("Failed to create ClickHouse tables");

    let rpc = DashRpcClient::new(
        &config.rpc_host,
        &config.rpc_port,
        &config.rpc_user,
        &config.rpc_password,
    );

    if let Err(e) = rpc.ping().await {
        error!("Failed to connect to Dash Core: {e}");
        std::process::exit(1);
    }

    let processor = Arc::new(BlockProcessor::new(rpc, db));

    let last_height = match processor.catch_up(&config).await {
        Ok(h) => h,
        Err(e) => {
            error!("Catch-up failed: {e}");
            std::process::exit(1);
        }
    };

    info!(last_height, "Starting continuous indexing...");

    let (zmq_tx, zmq_rx) = mpsc::channel::<String>(32);
    let (rawtx_tx, rawtx_rx) = mpsc::channel::<Vec<u8>>(256);

    let zmq_url = config.zmq_url.clone();
    tokio::spawn(async move {
        zmq_listener(zmq_url, zmq_tx).await;
    });

    let zmq_rawtx_url = config.zmq_url.clone();
    tokio::spawn(async move {
        zmq_rawtx_listener(zmq_rawtx_url, rawtx_tx).await;
    });

    let poll_processor = Arc::clone(&processor);
    let poll_interval = config.poll_interval_secs;
    let (poll_tx, poll_rx) = mpsc::channel::<()>(1);

    tokio::spawn(async move {
        polling_loop(poll_processor, poll_interval, poll_tx).await;
    });

    continuous_indexing(processor, zmq_rx, rawtx_rx, poll_rx, config.network).await;
}

async fn polling_loop(processor: Arc<BlockProcessor>, interval_secs: u64, tx: mpsc::Sender<()>) {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(interval_secs));

    loop {
        interval.tick().await;

        match processor.rpc.get_block_count().await {
            Ok(chain_height) => {
                let db_height = processor.db.get_max_block_height().await
                    .expect("Failed to get max block height from database");

                if chain_height > db_height {
                    info!(chain_height, db_height, "Polling: new blocks detected");
                    let _ = tx.send(()).await;
                }
            }
            Err(e) => warn!("Polling: RPC error: {e}"),
        }
    }
}

async fn continuous_indexing(
    processor: Arc<BlockProcessor>,
    mut zmq_rx: mpsc::Receiver<String>,
    mut rawtx_rx: mpsc::Receiver<Vec<u8>>,
    mut poll_rx: mpsc::Receiver<()>,
    network: dashcore::Network,
) {
    loop {
        tokio::select! {
            Some(hash) = zmq_rx.recv() => {
                info!("ZMQ: new block detected: {}", hash);
                match processor.index_block_by_hash(&hash).await {
                    Ok(None) => info!("Block {} already indexed, skipping", hash),
                    Ok(Some(_)) => {
                        if let Err(e) = processor.sync_masternodes().await {
                            error!("Failed to sync masternode list: {}", e);
                        }
                    }
                    Err(e) => error!("Failed to index block {}: {}", hash, e),
                }
                backoff_sleep(1).await;
            }
            Some(raw_bytes) = rawtx_rx.recv() => {
                match processor.index_pending_transaction(raw_bytes, network).await {
                    Ok(true)  => info!("Indexed pending transaction"),
                    Ok(false) => info!("Pending transaction already exists, skipping"),
                    Err(e)    => error!("Failed to index pending transaction: {e}"),
                }
            }
            Some(()) = poll_rx.recv() => {
                info!("Polling: new blocks detected");
                index_new_blocks(&processor).await;
                backoff_sleep(1).await;
            }
        }
    }
}

async fn index_new_blocks(processor: &BlockProcessor) {
    let chain_height = processor.rpc.get_block_count().await
        .expect("Could not get block count from RPC");

    let db_height = processor.db.get_max_block_height().await
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