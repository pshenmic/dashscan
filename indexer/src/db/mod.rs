mod addresses;
mod blocks;
mod inputs;
mod masternodes;
mod outputs;
mod transactions;

use deadpool_postgres::{Client, Pool, PoolError};

/// Maximum rows per batched INSERT to stay under PostgreSQL's 32 767 parameter limit.
pub(crate) const BATCH_SIZE: usize = 1000;

/// Builds a placeholder string like `($1,$2,$3),($4,$5,$6)` for a batch INSERT.
pub(crate) fn build_placeholders(n_rows: usize, n_cols: usize) -> String {
    let mut s = String::with_capacity(n_rows * (n_cols * 4 + 3));

    for row in 0..n_rows {
        if row > 0 {
            s.push(',');
        }
        s.push('(');
        for col in 0..n_cols {
            if col > 0 {
                s.push(',');
            }
            s.push('$');
            s.push_str(&(row * n_cols + col + 1).to_string());
        }
        s.push(')');
    }
    s
}

pub struct Database {
    pool: Pool,
}

impl Database {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    /// Acquire a pool connection so the caller can open a transaction.
    pub async fn begin(&self) -> Result<Client, PoolError> {
        self.pool.get().await
    }
}