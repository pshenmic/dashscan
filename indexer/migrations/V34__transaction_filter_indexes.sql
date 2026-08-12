-- V20's single-column indexes on type/coinjoin/multisig don't fit the query:
--
--   WHERE block_height IS NOT NULL AND <filter>
--   ORDER BY block_height <order>, is_coinbase DESC, id ASC LIMIT n OFFSET m
--
-- They're low-selectivity (type is 0 for almost every row, the others are
-- booleans) and carry no block_height, so the sort can't come from the index —
-- Postgres reads the whole matching set and sorts it to return one page.
-- Equality column first, sort column second fixes both. No DESC needed; a btree
-- scans either way, which matters because `order` is caller-supplied.
DROP INDEX IF EXISTS idx_transaction_type;
DROP INDEX IF EXISTS idx_transaction_coinjoin;
DROP INDEX IF EXISTS idx_transaction_multisig;

-- Also supersedes idx_transaction_type: `type` is the prefix.
CREATE INDEX idx_transactions_type_block_height
    ON transactions (type, block_height);

-- Partial on the selective side only. The false side is most of the table,
-- where the planner is better off with transaction_block_height plus a filter
-- than with a near-full index maintained on every insert.
CREATE INDEX idx_transactions_coinjoin_block_height
    ON transactions (block_height) WHERE coinjoin;

CREATE INDEX idx_transactions_multisig_block_height
    ON transactions (block_height) WHERE multisig;

-- On a live node build these with CREATE INDEX CONCURRENTLY (outside a
-- transaction) instead — plain CREATE INDEX takes a write lock, as V23 warns.
