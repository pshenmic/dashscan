CREATE TABLE special_transactions
(
    txid CHAR(64) NOT NULL REFERENCES transactions (txid) DEFERRABLE INITIALLY DEFERRED,
    tx_type SMALLINT NOT NULL,
    payload JSONB NOT NULL
);