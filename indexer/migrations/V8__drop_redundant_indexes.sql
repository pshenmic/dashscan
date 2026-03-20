-- blocks.hash: block_hash_unique is the PK index — drop the extra one
DROP INDEX block_hash;

-- blocks.height: block_height_unique is the unique constraint index — drop the extra one
DROP INDEX block_height;

-- transactions.hash: transactions_pkey is the PK index — drop the extra one
DROP INDEX transaction_hash;

-- addresses.address: address_unique is the PK index — drop the extra one
DROP INDEX addresses_address;

-- addresses: drop FK constraints — these cause lookups into transactions/blocks on every upsert
ALTER TABLE addresses DROP CONSTRAINT addresses_first_seen_tx_fkey;
ALTER TABLE addresses DROP CONSTRAINT addresses_first_seen_block_fkey;
ALTER TABLE addresses DROP CONSTRAINT addresses_last_seen_tx_fkey;
ALTER TABLE addresses DROP CONSTRAINT addresses_last_seen_block_fkey;
