-- Per-day address activity rollup feeding GET /addresses/active.
--
-- Ranking addresses live over tx_inputs/tx_outputs takes minutes for long
-- windows (1y+). This table folds that work into one row per (day, address)
-- with the number of distinct transactions the address appeared in that day,
-- so the API ranks a window by summing day buckets — an index range scan.
--
-- The table is created empty and is maintained incrementally by the indexer
-- (block_writer phase 7c) during both historical catch-up and live sync, one
-- upsert per commit batch inside the same DB transaction as the block itself.
-- It is never rebuilt from the raw tables.
CREATE TABLE address_activity (
    day        DATE    NOT NULL,
    address_id INTEGER NOT NULL,
    tx_count   BIGINT  NOT NULL
);

-- Arbiter index for the indexer's ON CONFLICT upsert. INCLUDE (tx_count) makes
-- the API's day-range scan index-only, skipping heap fetches across the tens of
-- millions of rows a multi-year window covers.
CREATE UNIQUE INDEX address_activity_day_address_id_idx
    ON address_activity (day, address_id) INCLUDE (tx_count);

CREATE INDEX address_activity_active_idx
    ON address_activity (day) INCLUDE (address_id, tx_count)
    WHERE tx_count > 2;