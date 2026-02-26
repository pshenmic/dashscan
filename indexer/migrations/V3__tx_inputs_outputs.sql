CREATE TABLE tx_inputs
(
    id              BIGSERIAL PRIMARY KEY,
    txid            CHAR(64) NOT NULL REFERENCES transactions (txid),
    vin_index       INT      NOT NULL,
    prev_txid       CHAR(64),
    prev_vout_index INT,
    coinbase_data   TEXT
);

CREATE TABLE tx_outputs
(
    id             BIGSERIAL PRIMARY KEY,
    txid           CHAR(64) NOT NULL REFERENCES transactions (txid),
    vout_index     INT      NOT NULL,
    value          BIGINT   NOT NULL,
    script_pub_key TEXT,
    script_type    VARCHAR(50),
    address        VARCHAR(64)
);
