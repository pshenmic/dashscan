mod db;
mod processor;
mod rpc;
mod zmq;
mod config;

use std::{env, process};
use std::ops::DerefMut;
use db::Database;
use processor::BlockProcessor;
use rpc::DashRpcClient;
use zmq::zmq_listener;

use std::sync::Arc;
use dotenv::dotenv;
use tokio::sync::mpsc;
use tracing::{error, info, warn};
use crate::config::Config;

#[tokio::main]
async fn main() {
    // Load .env file
    dotenv().ok();

    let args: Vec<String> = env::args().collect();

    if args.len() > 2 {
        let arg = args.get(2).unwrap();

        match arg.as_str() {
            "migrate" => {
                let config = Config::from_env();
                let pg_config = config.pg_config();
                let pool = pg_config
                    .create_pool(
                        Some(deadpool_postgres::Runtime::Tokio1),
                        tokio_postgres::NoTls,
                    )
                    .expect("Failed to create database pool");

                let migrations =
                    refinery::load_sql_migrations("./migrations").expect("Failed to load migrations");

                let mut conn = pool.get().await.unwrap();
                let client = conn.deref_mut().deref_mut();
                let runner = refinery::Runner::new(&migrations);

                let report = runner
                    .run_async(client)
                    .await
                    .expect("Migration failed");

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

    // Connect to Dash Core RPC
    let rpc = DashRpcClient::new(&config.rpc_host,&config.rpc_port, &config.rpc_user, &config.rpc_password);

    // Test RPC connectivity
    if let Err(e) = rpc.ping().await {
        error!("Failed to connect to Dash Core: {e}");
        error!("Make sure Dash Core is running and RPC credentials are correct");
        std::process::exit(1);
    }

    // Create block processor
    let processor = Arc::new(BlockProcessor::new(rpc, db));

    // Catch up with the blockchain
    let last_height = match processor.catch_up().await {
        Ok(h) => h,
        Err(e) => {
            error!("Catch-up failed: {e}");
            std::process::exit(1);
        }
    };

    info!(last_height, "Starting continuous indexing...");

    // Channel for ZMQ block notifications
    let (zmq_tx, zmq_rx) = mpsc::channel::<String>(32);

    // Spawn ZMQ listener
    let zmq_url = config.zmq_url.clone();
    tokio::spawn(async move {
        zmq_listener(zmq_url, zmq_tx).await;
    });

    // Spawn polling fallback
    let poll_processor = Arc::clone(&processor);
    let poll_interval = config.poll_interval_secs;
    let (poll_tx, poll_rx) = mpsc::channel::<()>(1);

    tokio::spawn(async move {
        polling_loop(poll_processor, poll_interval, poll_tx).await;
    });

    // Main loop: process ZMQ and poll events
    continuous_indexing(processor, zmq_rx, poll_rx).await;
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
                    .unwrap_or(Some(-1))
                    .unwrap_or(-1);

                if chain_height > db_height {
                    info!(
                        chain_height,
                        db_height, "Polling: new blocks detected"
                    );
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
    mut poll_rx: mpsc::Receiver<()>,
) {
    loop {
        tokio::select! {
            Some(_hash) = zmq_rx.recv() => {
                // ZMQ notified us of a new block
                if let Err(e) = index_new_blocks(&processor).await {
                    error!("Failed to index new block (ZMQ): {e}");
                    backoff_sleep(1).await;
                }
            }
            Some(()) = poll_rx.recv() => {
                // Polling detected new blocks
                if let Err(e) = index_new_blocks(&processor).await {
                    error!("Failed to index new block (poll): {e}");
                    backoff_sleep(1).await;
                }
            }
        }
    }
}

async fn index_new_blocks(processor: &BlockProcessor) -> Result<(), String> {
    let chain_height = processor.rpc.get_block_count().await?;
    let db_height: i64 = processor
        .db
        .get_max_block_height()
        .await?
        .unwrap_or(-1);

    for height in (db_height + 1)..=chain_height {
        processor.index_block(height).await?;
    }

    Ok(())
}

async fn backoff_sleep(seconds: u64) {
    warn!(seconds, "Backing off before retry");
    tokio::time::sleep(std::time::Duration::from_secs(seconds)).await;
}
