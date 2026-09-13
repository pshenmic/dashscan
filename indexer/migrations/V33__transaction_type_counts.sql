-- Exact totals for GET /transactions, which falls back to a real COUNT(*) over
-- the whole table whenever type/coinjoin/multisig is set (the unfiltered path
-- already uses the pg_class estimate).
--
-- A few dozen rows — `type` is a small enum — so any subset of the three
-- filters is answered by summing the matching rows.
--
-- Confirmed transactions only, matching the endpoint's whereNotNull: increment
-- at confirmation, not when a mempool transaction is first inserted, and
-- decrement on rollback. The blockHeight filter needs nothing here; blocks.tx_count
-- already answers it.
--
-- Backfill once, indexer stopped:
--
--   INSERT INTO transaction_type_counts (type, coinjoin, multisig, count)
--   SELECT type, coinjoin, multisig, COUNT(*)
--   FROM transactions WHERE block_height IS NOT NULL
--   GROUP BY 1, 2, 3;
CREATE TABLE transaction_type_counts (
    type     SMALLINT NOT NULL,
    coinjoin BOOLEAN  NOT NULL,
    multisig BOOLEAN  NOT NULL,
    count    BIGINT   NOT NULL,
    PRIMARY KEY (type, coinjoin, multisig)
);
