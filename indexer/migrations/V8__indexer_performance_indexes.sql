-- Performance indexes for indexer operations.
--
-- 1. special_transactions has no indexes at all.
--    Reindex/rollback does: DELETE FROM special_transactions WHERE tx_id IN (...)
--    Without an index this is a sequential scan on every block rollback.
CREATE INDEX special_transactions_tx_id ON special_transactions(tx_id);

-- 2. blocks(height) already has a PRIMARY KEY + UNIQUE constraint + a redundant
--    UNIQUE INDEX (block_height). The redundant index wastes space and slows down
--    INSERTs. Drop it.
DROP INDEX IF EXISTS block_height;

-- 3. blocks(hash) already has a UNIQUE constraint (block_hash_unique) which
--    implicitly creates an index. The explicit CREATE UNIQUE INDEX block_hash is
--    a duplicate that slows writes. Drop it.
DROP INDEX IF EXISTS block_hash;

-- 4. addresses(address) same situation — UNIQUE constraint (address_unique)
--    already covers lookups. The explicit addresses_address index is redundant.
DROP INDEX IF EXISTS addresses_address;

-- 5. transactions(hash) same — UNIQUE constraint already creates an index.
DROP INDEX IF EXISTS transaction_hash;

-- 6. addresses.first_seen_block is used as a foreign key target.
--    Index it for faster cascade/join operations.
CREATE INDEX addresses_first_seen_block ON addresses(first_seen_block);