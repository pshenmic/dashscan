-- Covering indexes for the xpub path (POST /xpub, /xpub/utxo).
--
-- Both endpoints resolve an extended key to its addresses and then aggregate
-- over them, and both spend most of their time on heap fetches that the index
-- could have answered on its own.
--
-- 1. addresses(address)
--
-- The BIP44 gap scan looks addresses up in batches of a hundred and needs only
-- (address, id) back. address_unique holds address alone, so every probe leaves
-- the index to read id from the heap — and the derived addresses are hashes, so
-- the probes land on unrelated pages. A cold wallet does fifty to a hundred of
-- these batches per branch, which is the bulk of a cold xpub request.
--
-- Carrying id in the index turns the batch into an index-only scan:
--   48.8ms -> 12.6ms per 100-address batch (3.9x), and 39.6ms -> 2.8ms once
--   random_page_cost and effective_cache_size match the hardware.
--
-- Replaces the UNIQUE CONSTRAINT with an equivalent UNIQUE INDEX. Uniqueness is
-- unchanged, nothing references the constraint by name, no foreign key points at
-- addresses(address), and the indexer's `ON CONFLICT (address) DO UPDATE`
-- infers its arbiter from the indexed column, so a covering unique index serves
-- it exactly as the constraint did (verified against this schema).
--
-- 2. utxo(address_id)
--
-- The wallet balance is SUM(amount) over every address of the xpub. The index
-- finds the rows but amount lives in the heap, so a two-thousand-address wallet
-- reads hundreds of scattered heap blocks to add up a few hundred values:
--   43.6ms -> 0.87ms (50x).
--
-- The partial predicate is kept as-is; it matches the query and keeps the index
-- off the rows that carry no address.
--
-- NOTE: plain CREATE INDEX takes a write lock while building. On a live node
-- build these with CREATE INDEX CONCURRENTLY (outside a transaction) instead,
-- as V23 warns. For addresses the order matters, so that a unique index on
-- address exists throughout and the indexer's upsert never loses its arbiter:
--
--   CREATE UNIQUE INDEX CONCURRENTLY address_unique_covering
--       ON addresses (address) INCLUDE (id);
--   ALTER TABLE addresses DROP CONSTRAINT address_unique;
--   ALTER INDEX address_unique_covering RENAME TO address_unique;

ALTER TABLE addresses DROP CONSTRAINT address_unique;

CREATE UNIQUE INDEX address_unique ON addresses (address) INCLUDE (id);

DROP INDEX IF EXISTS utxo_address_id_idx;

CREATE INDEX utxo_address_id_idx
    ON utxo (address_id) INCLUDE (amount) WHERE address_id IS NOT NULL;
