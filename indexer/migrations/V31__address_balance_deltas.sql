-- Per-address daily net flow, feeding GET /address/:address/balance/chart:
-- sum the days before the window for the opening balance, then a running sum
-- over the days inside it.
--
-- Keyed (address_id, day), unlike address_activity's (day, address_id) — always
-- read as "every day for one address". That key order is also why this is a
-- separate table and not two more columns on address_activity, where widening
-- rows would cost the index-only scans /addresses/active depends on.
--
-- Sub-day chart intervals stay live off the raw tables for the window's partial
-- edges, the same stitching getAddressesActivity does.
--
-- Backfill once, indexer stopped:
--
--   INSERT INTO address_balance_deltas (address_id, day, received, sent)
--   SELECT address_id, day, SUM(received), SUM(sent) FROM (
--     SELECT o.address_id, b.timestamp::date AS day, o.value AS received, 0 AS sent
--     FROM tx_outputs o
--     JOIN transactions t ON t.id = o.tx_id
--     JOIN blocks b ON b.height = t.block_height
--     WHERE o.address_id IS NOT NULL
--     UNION ALL
--     SELECT i.address_id, b.timestamp::date, 0, p.value
--     FROM tx_inputs i
--     JOIN tx_outputs p ON p.tx_id = i.prev_tx_id AND p.vout_index = i.prev_vout_index
--     JOIN transactions t ON t.id = i.tx_id
--     JOIN blocks b ON b.height = t.block_height
--     WHERE i.address_id IS NOT NULL
--   ) f GROUP BY 1, 2;
CREATE TABLE address_balance_deltas (
    address_id INTEGER NOT NULL,
    day        DATE    NOT NULL,
    received   BIGINT  NOT NULL,
    sent       BIGINT  NOT NULL
);

-- Doubles as the ON CONFLICT arbiter. No separate PRIMARY KEY: it would be a
-- second index on the same columns, the duplication V8 removed.
CREATE UNIQUE INDEX address_balance_deltas_address_id_day_idx
    ON address_balance_deltas (address_id, day) INCLUDE (received, sent);
