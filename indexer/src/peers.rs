use deadpool_redis::Pool;
use deadpool_redis::redis::AsyncCommands;
use serde::Serialize;

use crate::errors::redis_error::RedisError;

/// Hashes of `addr -> peer json` for the most recent completed crawl round,
/// split by reachability so callers can fetch each set independently.
const AVAILABLE_KEY: &str = "peers:available";
const UNAVAILABLE_KEY: &str = "peers:unavailable";
/// Unix-seconds timestamp of when the peer sets were last replaced.
const UPDATED_AT_KEY: &str = "peers:updated_at";

/// A peer discovered by the crawler, ready to be stored in Redis. Every
/// discovered address is stored — `available` records whether it completed a
/// handshake this round; the version-derived fields are present only when it
/// did.
#[derive(Debug, Clone, Serialize)]
pub struct StoredPeer {
    /// `ip:port`, also the Redis hash field.
    pub addr: String,
    /// Whether the peer answered the version handshake this round.
    pub available: bool,
    /// Protocol version the peer advertised (only when `available`).
    pub version: Option<u32>,
    /// Service bits the peer advertised (only when `available`).
    pub services: Option<u64>,
    /// User agent / subversion string, e.g. `/Dash Core:22.0.0/` (only when `available`).
    pub user_agent: Option<String>,
    /// The peer's reported block height at probe time (only when `available`).
    pub start_height: Option<i32>,
    pub last_seen: u32,
    /// When this crawler last probed the peer this round (unix seconds).
    pub probed_at: i64,
}

/// Redis-backed store for the network peer set.
///
/// Peers are volatile and historically worthless, so they live in Redis (not
/// Postgres) and the whole set is overwritten each crawl round — disconnected
/// or unreachable peers simply fall off. Mirrors [`DaoStore`](crate::dao::DaoStore).
#[derive(Clone)]
pub struct PeerStore {
    pool: Pool,
}

impl PeerStore {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    /// Replace both peer sets with the latest crawl results, routing each peer
    /// to the `peers:available` or `peers:unavailable` hash by reachability.
    ///
    /// `DEL` + `HSET` so peers absent from this round vanish immediately, as
    /// chosen for staleness handling. An empty round is treated as "no data
    /// yet" and left untouched rather than wiping good previous snapshots.
    pub async fn replace(&self, peers: &[StoredPeer]) -> Result<(), RedisError> {
        if peers.is_empty() {
            return Ok(());
        }

        let mut available: Vec<(String, String)> = Vec::new();
        let mut unavailable: Vec<(String, String)> = Vec::new();
        for p in peers {
            let entry = (p.addr.clone(), serde_json::to_string(p).unwrap_or_default());
            if p.available {
                available.push(entry);
            } else {
                unavailable.push(entry);
            }
        }

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or_default();

        let mut conn = self.pool.get().await?;
        // Clear both keys first, then repopulate; HSET errors on empty input,
        // so a set with no members this round is just left deleted.
        let _: () = conn.del(AVAILABLE_KEY).await?;
        let _: () = conn.del(UNAVAILABLE_KEY).await?;
        if !available.is_empty() {
            let _: () = conn.hset_multiple(AVAILABLE_KEY, &available).await?;
        }
        if !unavailable.is_empty() {
            let _: () = conn.hset_multiple(UNAVAILABLE_KEY, &unavailable).await?;
        }
        let _: () = conn.set(UPDATED_AT_KEY, now).await?;
        Ok(())
    }
}