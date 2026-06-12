-- Weekly tier of the address activity rollup (see V24).
--
-- Summing day rows is linear in window length, which makes long windows (1y+)
-- take seconds. Whole ISO weeks inside a window are served from this table
-- (7x fewer rows), with the daily table / live queries covering only the
-- partial stretches at the window edges.
--
-- `week` is the Monday the ISO week starts on (date_trunc('week', day)).
-- Not a materialized view: a matview can only be rebuilt with a full REFRESH
-- rescan, while this table is maintained incrementally by the same indexer
-- merge step that updates address_activity (db/address_activity.rs), in the
-- same DB transaction, by re-aggregating the already-staged per-day counts per
-- week. A transaction belongs to exactly one day and therefore one week, so
-- the weekly sums stay exact.
--
-- Created empty: history already present in address_activity must be folded in
-- once, manually (cheap — reads only the daily rollup, not the raw tables).
-- Run it while the indexer is NOT writing (before first start on this version,
-- or with the indexer stopped) so the indexer's own weekly upserts neither
-- overlap nor get missed:
--
--   INSERT INTO address_activity_weekly (week, address_id, tx_count)
--   SELECT date_trunc('week', day)::date, address_id, SUM(tx_count)
--   FROM address_activity
--   GROUP BY 1, 2;
CREATE TABLE address_activity_weekly (
    week       DATE    NOT NULL,
    address_id INTEGER NOT NULL,
    tx_count   BIGINT  NOT NULL
);

-- Arbiter index for the indexer's ON CONFLICT upsert; INCLUDE (tx_count) keeps
-- the API's week-range scans index-only.
CREATE UNIQUE INDEX address_activity_weekly_week_address_id_idx
    ON address_activity_weekly (week, address_id) INCLUDE (tx_count);

CREATE INDEX address_activity_weekly_active_idx
    ON address_activity_weekly (week) INCLUDE (address_id, tx_count)
    WHERE tx_count > 2;