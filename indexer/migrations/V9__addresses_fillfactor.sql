-- Lower fillfactor on addresses table to enable HOT (Heap-Only Tuple) updates.
--
-- The indexer constantly updates last_seen_tx_id and last_seen_block via
-- ON CONFLICT DO UPDATE. With the default fillfactor=100, every update creates
-- a new row version on a different page, requiring an index pointer update.
-- With fillfactor=80, ~20% of each page is reserved for updates, allowing
-- PostgreSQL to perform HOT updates that skip index maintenance entirely.
--
ALTER TABLE addresses SET (fillfactor = 80);