ALTER TABLE transactions ADD COLUMN block_height INT;

UPDATE transactions t
SET block_height = b.height
FROM blocks b
WHERE b.hash = t.block_hash;

CREATE INDEX transaction_block_height ON transactions (block_height);