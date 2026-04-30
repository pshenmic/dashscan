ALTER TABLE transactions
    ADD COLUMN multisig BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_transaction_type ON transactions(type);
CREATE INDEX idx_transaction_coinjoin ON transactions(coinjoin);
CREATE INDEX idx_transaction_multisig ON transactions(multisig);