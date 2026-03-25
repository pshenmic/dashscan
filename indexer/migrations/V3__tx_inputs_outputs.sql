CREATE TABLE tx_inputs
(
    tx_id           INT NOT NULL REFERENCES transactions (id) DEFERRABLE INITIALLY DEFERRED,
    vin_index       INT      NOT NULL,
    prev_tx_hash    CHAR(64),
    prev_vout_index INT,
    coinbase_data   TEXT,
    PRIMARY KEY (tx_id, vin_index)
);

CREATE TABLE tx_outputs
(
    tx_id          INT NOT NULL REFERENCES transactions (id) DEFERRABLE INITIALLY DEFERRED,
    vout_index     INT      NOT NULL,
    value          BIGINT   NOT NULL,
    script_pub_key TEXT,
    script_type    VARCHAR(50),
    address_id     INT REFERENCES addresses (id) DEFERRABLE INITIALLY DEFERRED,
    PRIMARY KEY (tx_id, vout_index)
);