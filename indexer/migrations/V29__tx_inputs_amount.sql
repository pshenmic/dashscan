-- Value of the output this input spends, so the inputs aggregate stops joining
-- back to tx_outputs on (prev_tx_id, prev_vout_index) just to read one BIGINT.
-- The indexer already reads that row to fill tx_inputs.address_id (V14).
--
-- Nullable, no FK: coinbase inputs have no previous output.
--
-- Backfill once (batch by tx_id range on a large DB):
--
--   UPDATE tx_inputs i SET amount = o.value
--   FROM tx_outputs o
--   WHERE o.tx_id = i.prev_tx_id
--     AND o.vout_index = i.prev_vout_index
--     AND i.prev_tx_id IS NOT NULL
--     AND i.amount IS NULL;
ALTER TABLE tx_inputs
    ADD COLUMN amount BIGINT;
