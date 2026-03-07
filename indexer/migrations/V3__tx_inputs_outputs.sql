CREATE TABLE tx_inputs
(
    txid            CHAR(64) NOT NULL REFERENCES transactions (hash) DEFERRABLE INITIALLY DEFERRED,
    vin_index       INT      NOT NULL,
    prev_txid       CHAR(64),
    prev_vout_index INT,
    coinbase_data   TEXT,
    PRIMARY KEY (txid, vin_index)
);

CREATE TABLE tx_outputs
(
    txid           CHAR(64) NOT NULL REFERENCES transactions (hash) DEFERRABLE INITIALLY DEFERRED,
    vout_index     INT      NOT NULL,
    value          BIGINT   NOT NULL,
    script_pub_key TEXT,
    script_type    VARCHAR(50),
    address        VARCHAR(64),
    PRIMARY KEY (txid, vout_index)
);