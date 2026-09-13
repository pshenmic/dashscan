-- Per-address transaction index feeding GET /masternode/:proTxHash/transactions
-- (and any address tx listing).
--
-- Listing a masternode's transactions previously built a UNION of every
-- tx_outputs + tx_inputs row for its addresses, deduped the whole set, then
-- sorted by block_height and took one page — work that scales with the
-- address's entire history, not the page size. This table holds one row per
-- (address_id, tx_id) with the transaction's block_height, so a page is a
-- single index range scan that stops at LIMIT rows.
--
-- Created empty and maintained incrementally by the indexer (block_writer
-- phase 7c) in the same DB transaction as the block. Never rebuilt from raw
-- tables. An address counts a transaction once even when it appears on both
-- the input and output side.
CREATE TABLE address_transactions (
    address_id   INTEGER NOT NULL REFERENCES addresses (id) DEFERRABLE INITIALLY DEFERRED,
    tx_id        INTEGER NOT NULL REFERENCES transactions (id) DEFERRABLE INITIALLY DEFERRED,
    block_height INTEGER NOT NULL REFERENCES blocks (height) DEFERRABLE INITIALLY DEFERRED,
    PRIMARY KEY (address_id, tx_id)
);

-- Serves the page query: WHERE address_id IN (...) ORDER BY block_height DESC.
-- INCLUDE (tx_id) keeps the scan index-only.
CREATE INDEX address_transactions_address_id_height_idx
    ON address_transactions (address_id, block_height DESC) INCLUDE (tx_id);