use dashcore::blockdata::transaction::Transaction;
use dashcore::consensus::encode::{deserialize, deserialize_partial};
use dashcore::ephemerealdata::chain_lock::ChainLock;
use tokio::sync::mpsc;
use tracing::{error, info, warn};
use zeromq::{Socket, SocketRecv, SubSocket};

/// Listens to Dash Core ZMQ `hashblock` notifications and sends block hashes
/// to the provided channel.
pub async fn zmq_listener(zmq_url: String, tx: mpsc::Sender<String>) {
    loop {
        match run_zmq_subscriber(&zmq_url, &tx).await {
            Ok(()) => {
                warn!("ZMQ subscriber exited cleanly, reconnecting...");
            }
            Err(e) => {
                error!("ZMQ subscriber error: {e}, reconnecting in 5s...");
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            }
        }
    }
}

async fn run_zmq_subscriber(
    zmq_url: &str,
    tx: &mpsc::Sender<String>,
) -> Result<(), String> {
    let mut socket = SubSocket::new();
    socket
        .connect(zmq_url)
        .await
        .map_err(|e| format!("ZMQ connect failed: {e}"))?;

    socket
        .subscribe("hashblock")
        .await
        .map_err(|e| format!("ZMQ subscribe failed: {e}"))?;

    info!(url = zmq_url, "ZMQ subscriber connected, listening for new blocks");

    loop {
        let msg = socket
            .recv()
            .await
            .map_err(|e| format!("ZMQ recv failed: {e}"))?;

        // ZMQ hashblock message: frame[0] = "hashblock", frame[1] = 32-byte hash
        if msg.len() >= 2 {
            let hash_bytes = msg.get(1).map(|f| f.to_vec());
            if let Some(bytes) = hash_bytes {
                let hash = hex::encode(&bytes);
                if hash.len() == 64 {
                    info!(hash = %hash, "ZMQ: new block notification");
                    if tx.send(hash).await.is_err() {
                        return Err("Channel closed".to_string());
                    }
                }
            }
        }
    }
}

/// Listens to Dash Core ZMQ `rawtx` notifications.
/// Subscribing to "rawtx" prefix-matches `rawtx`, `rawtxlock`, and `rawtxlocksig`.
/// - `rawtx` → raw transaction bytes → sent to `rawtx_tx` for pending indexing
/// - `rawtxlock` → raw tx bytes of IS-locked tx → decoded for txid, buffered
/// - `rawtxlocksig` → raw ISLOCK bytes → paired with buffered txid → sent to `lock_tx`
pub async fn zmq_rawtx_listener(
    zmq_url: String,
    rawtx_tx: mpsc::Sender<Vec<u8>>,
    lock_tx: mpsc::Sender<(String, String)>,
) {
    loop {
        match run_zmq_rawtx_subscriber(&zmq_url, &rawtx_tx, &lock_tx).await {
            Ok(()) => {
                warn!("ZMQ rawtx subscriber exited cleanly, reconnecting...");
            }
            Err(e) => {
                error!("ZMQ rawtx subscriber error: {e}, reconnecting in 5s...");
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            }
        }
    }
}

async fn run_zmq_rawtx_subscriber(
    zmq_url: &str,
    rawtx_tx: &mpsc::Sender<Vec<u8>>,
    lock_tx: &mpsc::Sender<(String, String)>,
) -> Result<(), String> {
    let mut socket = SubSocket::new();
    socket
        .connect(zmq_url)
        .await
        .map_err(|e| format!("ZMQ rawtx connect failed: {e}"))?;

    socket
        .subscribe("rawtx")
        .await
        .map_err(|e| format!("ZMQ rawtx subscribe failed: {e}"))?;

    info!(url = zmq_url, "ZMQ rawtx subscriber connected (rawtx + rawtxlock + rawtxlocksig)");

    // Buffer: txid from the most recent `rawtxlock` message, waiting for its `rawtxlocksig` pair
    let mut pending_txid: Option<String> = None;
    let mut tx_cursor: Option<usize> = None;

    loop {
        let msg = socket
            .recv()
            .await
            .map_err(|e| format!("ZMQ rawtx recv failed: {e}"))?;

        if msg.len() < 2 {
            continue;
        }

        let topic = msg.get(0).map(|f| f.to_vec()).unwrap_or_default();
        let raw_bytes = msg.get(1).map(|f| f.to_vec()).unwrap_or_default();
        if raw_bytes.is_empty() {
            continue;
        }

        if topic.as_slice() == b"rawtx" {
            info!("ZMQ: new rawtx");
            if rawtx_tx.send(raw_bytes).await.is_err() {
                return Err("rawtx channel closed".to_string());
            }
        } else if topic.as_slice() == b"rawtxlock" {
            match deserialize_partial::<Transaction>(&raw_bytes) {
                Ok((raw_tx, cursor)) => {
                    tx_cursor = Some(cursor);
                    let txid = raw_tx.txid().to_string();
                    info!(txid = %txid, "ZMQ: rawtxlock (InstantSend locked tx)");
                    pending_txid = Some(txid);
                }
                Err(e) => {
                    warn!(len = raw_bytes.len(), err = %e, "ZMQ rawtxlock: failed to deserialize transaction");
                }
            }
        } else if topic.as_slice() == b"rawtxlocksig" {
            if let Some(txid) = pending_txid.take() && tx_cursor.is_some() {
                let isdlock = &raw_bytes[tx_cursor.unwrap()..];
                let isdlock_hex = hex::encode(&isdlock);

                info!(txid = %txid, "ZMQ: rawtxlocksig (ISLOCK received)");
                if lock_tx.send((txid, isdlock_hex)).await.is_err() {
                    return Err("rawtxlock channel closed".to_string());
                }
            } else {
                warn!(len = raw_bytes.len(), "ZMQ rawtxlocksig: received ISLOCK without matching rawtxlock txid");
            }
        }
    }
}

/// Listens to Dash Core ZMQ `rawchainlocksig` notifications.
/// Payload is raw block bytes + CLSIG (132 bytes) concatenated.
/// Sends the locked block height to the provided channel.
pub async fn zmq_rawchainlock_listener(zmq_url: String, tx: mpsc::Sender<i32>) {
    loop {
        match run_zmq_rawchainlock_subscriber(&zmq_url, &tx).await {
            Ok(()) => {
                warn!("ZMQ rawchainlock subscriber exited cleanly, reconnecting...");
            }
            Err(e) => {
                error!("ZMQ rawchainlock subscriber error: {e}, reconnecting in 5s...");
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            }
        }
    }
}

async fn run_zmq_rawchainlock_subscriber(
    zmq_url: &str,
    tx: &mpsc::Sender<i32>,
) -> Result<(), String> {
    let mut socket = SubSocket::new();
    socket
        .connect(zmq_url)
        .await
        .map_err(|e| format!("ZMQ rawchainlocksig connect failed: {e}"))?;

    socket
        .subscribe("rawchainlocksig")
        .await
        .map_err(|e| format!("ZMQ rawchainlocksig subscribe failed: {e}"))?;

    info!(url = zmq_url, "ZMQ rawchainlocksig subscriber connected");

    loop {
        let msg = socket
            .recv()
            .await
            .map_err(|e| format!("ZMQ rawchainlocksig recv failed: {e}"))?;

        // frame[0] = "rawchainlocksig", frame[1] = raw block + CLSIG (132 bytes) concatenated
        if msg.len() >= 2 {
            if let Some(raw_bytes) = msg.get(1).map(|f| f.to_vec()) {
                // CLSIG is 132 bytes: height(4) + block_hash(32) + sig(96)
                const CLSIG_SIZE: usize = 4 + 32 + 96;
                if raw_bytes.len() < CLSIG_SIZE {
                    warn!(len = raw_bytes.len(), "ZMQ rawchainlocksig: payload too small");
                    continue;
                }

                let clsig_bytes = &raw_bytes[raw_bytes.len() - CLSIG_SIZE..];
                match deserialize::<ChainLock>(clsig_bytes) {
                    Ok(clsig) => {
                        let height = clsig.block_height as i32;
                        info!(height, block_hash = %clsig.block_hash, "ZMQ: rawchainlocksig notification");
                        if tx.send(height).await.is_err() {
                            return Err("rawchainlocksig channel closed".to_string());
                        }
                    }
                    Err(e) => {
                        warn!(len = raw_bytes.len(), err = %e, "ZMQ rawchainlocksig: failed to deserialize ChainLock");
                    }
                }
            }
        }
    }
}
