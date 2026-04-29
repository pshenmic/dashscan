use std::collections::HashMap;

/// Per-commit-batch cache that lets consecutive blocks inside the same DB
/// transaction skip redundant reads when resolving input addresses.
///
/// Populated as each block writes its transactions and outputs; consulted
/// before the prev-tx-hash → id → address lookup in `write_transaction_data`.
/// Cleared at each commit boundary to keep memory bounded.
#[derive(Default)]
pub(super) struct BatchCache {
    /// tx_hash → tx_id for transactions written during this batch.
    pub tx_ids: HashMap<String, i32>,
    /// (tx_id, vout_index) → address_id for outputs written during this batch.
    pub output_addresses: HashMap<(i32, i32), i32>,
}

impl BatchCache {
    pub fn clear(&mut self) {
        self.tx_ids.clear();
        self.output_addresses.clear();
    }
}