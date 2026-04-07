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

/// Listens to Dash Core ZMQ `rawtx` notifications and sends raw transaction
/// bytes to the provided channel.
pub async fn zmq_rawtx_listener(zmq_url: String, tx: mpsc::Sender<Vec<u8>>) {
    loop {
        match run_zmq_rawtx_subscriber(&zmq_url, &tx).await {
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
    tx: &mpsc::Sender<Vec<u8>>,
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

    info!(url = zmq_url, "ZMQ rawtx subscriber connected, listening for new transactions");

    loop {
        let msg = socket
            .recv()
            .await
            .map_err(|e| format!("ZMQ rawtx recv failed: {e}"))?;

        // ZMQ rawtx message: frame[0] = "rawtx", frame[1] = raw transaction bytes
        if msg.len() >= 2 {
            if let Some(raw_bytes) = msg.get(1).map(|f| f.to_vec()) {
                if !raw_bytes.is_empty() {
                    let txid = hex::encode(&raw_bytes[..32.min(raw_bytes.len())]);
                    info!(size = raw_bytes.len(), txid_prefix = %txid, "ZMQ: new rawtx notification");
                    if tx.send(raw_bytes).await.is_err() {
                        return Err("rawtx channel closed".to_string());
                    }
                }
            }
        }
    }
}
