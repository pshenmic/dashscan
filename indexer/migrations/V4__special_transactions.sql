CREATE TABLE special_transactions
(
    tx_id INT NOT NULL REFERENCES transactions (id) DEFERRABLE INITIALLY DEFERRED,
    tx_type SMALLINT NOT NULL,
    payload JSONB NOT NULL
);