-- One row per hour summarizing every block and transaction in it. Replaces the
-- range aggregations behind three endpoints:
--
--   /transactions/stats        four COUNT(*) FILTER over a block_height range
--   /transactions/count-series SUM(blocks.tx_count) over a timestamp range
--   /blocks/tx-count-stats     AVG(blocks.tx_count), = tx_count / block_count
--
-- Hourly, not daily: this is global (one row per bucket, not per address), so a
-- decade is ~88k rows, and the finer grain also serves the 24h/7d windows these
-- are actually called with. Buckets partially overlapping the requested window
-- stay live off `blocks`.
--
-- Confirmed transactions only, counted in the hour of the block that confirmed
-- them. `normal` is the stats endpoint's complement
-- (type = 0 AND NOT coinjoin AND NOT multisig), so the four counters do not sum
-- to tx_count.
--
-- Backfill once, indexer stopped. Blocks and transactions are aggregated
-- separately and joined on the hour — summing block columns across a join to
-- transactions would multiply each block's size and difficulty by its tx count:
--
--   INSERT INTO chain_stats_hourly
--     (hour, block_count, tx_count, size, difficulty_sum,
--      normal, special, coinjoin, multisig)
--   WITH b AS (
--     SELECT date_trunc('hour', timestamp) AS hour, COUNT(*) AS block_count,
--            SUM(size)::bigint AS size, SUM(difficulty) AS difficulty_sum
--     FROM blocks GROUP BY 1),
--   t AS (
--     SELECT date_trunc('hour', bl.timestamp) AS hour, COUNT(*) AS tx_count,
--            COUNT(*) FILTER (WHERE tr.type = 0 AND NOT tr.coinjoin AND NOT tr.multisig) AS normal,
--            COUNT(*) FILTER (WHERE tr.type > 0) AS special,
--            COUNT(*) FILTER (WHERE tr.coinjoin) AS coinjoin,
--            COUNT(*) FILTER (WHERE tr.multisig) AS multisig
--     FROM transactions tr JOIN blocks bl ON bl.height = tr.block_height GROUP BY 1)
--   SELECT b.hour, b.block_count, COALESCE(t.tx_count, 0), b.size, b.difficulty_sum,
--          COALESCE(t.normal, 0), COALESCE(t.special, 0),
--          COALESCE(t.coinjoin, 0), COALESCE(t.multisig, 0)
--   FROM b LEFT JOIN t ON t.hour = b.hour;
CREATE TABLE chain_stats_hourly (
    hour           TIMESTAMP        NOT NULL,
    block_count    INTEGER          NOT NULL,
    tx_count       BIGINT           NOT NULL,
    size           BIGINT           NOT NULL,
    difficulty_sum DOUBLE PRECISION NOT NULL,
    normal         BIGINT           NOT NULL,
    special        BIGINT           NOT NULL,
    coinjoin       BIGINT           NOT NULL,
    multisig       BIGINT           NOT NULL
);

CREATE UNIQUE INDEX chain_stats_hourly_hour_idx ON chain_stats_hourly (hour);
