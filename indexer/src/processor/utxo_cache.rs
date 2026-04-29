use std::collections::HashMap;

/// Persistent cross-batch cache of recently-inserted outputs.
///
/// Populated after each commit-batch with the outputs we just COPYed; consulted
/// in Phase 6 of the next `write_batch` to skip the DB join for inputs spending
/// recently-created outputs (the empirical common case mid-chain).
///
/// Entries are dropped when their tx's refcount hits zero — i.e. when every
/// output of that tx has been spent by some later batch's input. A hard cap on
/// `by_id` size prevents unbounded growth: when reached, new inserts are
/// silently skipped (existing entries continue to serve hits).
pub(super) struct UtxoCache {
    /// prev_tx_hash → prev_tx_id
    hash_to_id: HashMap<String, i32>,
    /// (prev_tx_id, vout_idx) → address_id
    by_id: HashMap<(i32, i32), i32>,
    /// tx_id → unspent vouts remaining (drop entire tx when this hits 0)
    refcount: HashMap<i32, u32>,
    max_entries: usize,
}

impl UtxoCache {
    pub fn new(max_entries: usize) -> Self {
        Self {
            hash_to_id: HashMap::new(),
            by_id: HashMap::new(),
            refcount: HashMap::new(),
            max_entries,
        }
    }

    pub fn len(&self) -> usize {
        self.by_id.len()
    }

    /// Register a freshly-committed tx's address-bearing outputs.
    /// Skips when the cache is at capacity to keep memory bounded.
    pub fn insert(&mut self, tx_hash: &str, tx_id: i32, outputs: &[(i32, i32)]) {
        if outputs.is_empty() {
            return;
        }
        if self.by_id.len() + outputs.len() > self.max_entries {
            return;
        }
        self.hash_to_id.insert(tx_hash.to_string(), tx_id);
        for &(vout_idx, addr_id) in outputs {
            self.by_id.insert((tx_id, vout_idx), addr_id);
        }
        self.refcount.insert(tx_id, outputs.len() as u32);
    }

    /// Return `(prev_tx_id, address_id)` for `(prev_hash, vout_idx)` on hit.
    pub fn lookup(&self, prev_hash: &str, vout_idx: i32) -> Option<(i32, i32)> {
        let prev_tx_id = *self.hash_to_id.get(prev_hash)?;
        let addr_id = *self.by_id.get(&(prev_tx_id, vout_idx))?;
        Some((prev_tx_id, addr_id))
    }

    /// Decrement refcount for a spent output; drop the tx entry when its
    /// last output is spent. No-op if the entry isn't (or is no longer) cached.
    pub fn mark_spent(&mut self, prev_hash: &str, vout_idx: i32) {
        let Some(&prev_tx_id) = self.hash_to_id.get(prev_hash) else {
            return;
        };
        if self.by_id.remove(&(prev_tx_id, vout_idx)).is_none() {
            return;
        }
        if let Some(remaining) = self.refcount.get_mut(&prev_tx_id) {
            if *remaining > 0 {
                *remaining -= 1;
            }
            if *remaining == 0 {
                self.refcount.remove(&prev_tx_id);
                self.hash_to_id.remove(prev_hash);
            }
        }
    }
}