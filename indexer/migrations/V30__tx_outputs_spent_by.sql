-- Which input spent this output, replacing the per-output LATERAL in the
-- outputs aggregate. The indexer knows this at spend time — same moment it
-- deletes the row from `utxo`.
--
-- Two rules the maintaining code must keep (they are what the LATERAL's
-- `ORDER BY block_height NULLS LAST` encoded):
--   1. An output can have a mempool spend and a mined spend at once. Confirmed
--      wins: write a mempool spender only while the column is NULL, and always
--      overwrite at confirmation.
--   2. Rollback must clear it for outputs whose spender is being removed.
--
-- fillfactor: tx_outputs is inserted once, then updated once at spend — reserve
-- page space so that update stays HOT, as V9 does for addresses.
--
-- Backfill once (batch by tx_id range):
--
--   UPDATE tx_outputs o
--   SET spent_by_tx_id = s.tx_id, spent_by_vin_index = s.vin_index
--   FROM (SELECT DISTINCT ON (i.prev_tx_id, i.prev_vout_index)
--                i.prev_tx_id, i.prev_vout_index, i.tx_id, i.vin_index
--         FROM tx_inputs i
--         JOIN transactions t ON t.id = i.tx_id
--         WHERE i.prev_tx_id IS NOT NULL
--         ORDER BY i.prev_tx_id, i.prev_vout_index, t.block_height NULLS LAST) s
--   WHERE o.tx_id = s.prev_tx_id
--     AND o.vout_index = s.prev_vout_index
--     AND o.spent_by_tx_id IS NULL;
ALTER TABLE tx_outputs
    ADD COLUMN spent_by_tx_id     INT,
    ADD COLUMN spent_by_vin_index INT;

ALTER TABLE tx_outputs SET (fillfactor = 90);
