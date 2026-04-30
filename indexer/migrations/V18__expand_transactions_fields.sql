ALTER TABLE transactions
    ADD COLUMN coinbase_amount BIGINT,
    ADD COLUMN transfer_amount BIGINT,
    ADD COLUMN coinjoin BOOLEAN NOT NULL DEFAULT FALSE;