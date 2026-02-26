CREATE TABLE IF NOT EXISTS blocks (
    hash            CHAR(64) PRIMARY KEY,
    height          INT UNIQUE NOT NULL,
    timestamp       BIGINT NOT NULL,
    prev_hash       CHAR(64),
    merkle_root     CHAR(64),
    size            INT,
    nonce           BIGINT,
    difficulty      DOUBLE PRECISION,
    chainwork       TEXT,
    tx_count        INT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    txid            CHAR(64) PRIMARY KEY,
    block_hash      CHAR(64) NOT NULL REFERENCES blocks(hash),
    version         INT,
    tx_type         SMALLINT DEFAULT 0,
    size            INT,
    locktime        BIGINT,
    is_coinbase     BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS tx_inputs (
    id              BIGSERIAL PRIMARY KEY,
    txid            CHAR(64) NOT NULL REFERENCES transactions(txid),
    vin_index       INT NOT NULL,
    prev_txid       CHAR(64),
    prev_vout_index INT,
    coinbase_data   TEXT
);

CREATE TABLE IF NOT EXISTS tx_outputs (
    id              BIGSERIAL PRIMARY KEY,
    txid            CHAR(64) NOT NULL REFERENCES transactions(txid),
    vout_index      INT NOT NULL,
    value           BIGINT NOT NULL,
    script_pub_key  TEXT,
    script_type     VARCHAR(50),
    address         VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS addresses (
    address         VARCHAR(64) PRIMARY KEY,
    first_seen_tx   CHAR(64),
    first_seen_block INT
);

CREATE TABLE IF NOT EXISTS special_transactions (
    txid            CHAR(64) PRIMARY KEY REFERENCES transactions(txid),
    tx_type         SMALLINT NOT NULL,
    payload         JSONB NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_blocks_height ON blocks(height);
CREATE INDEX IF NOT EXISTS idx_transactions_block_hash ON transactions(block_hash);
CREATE INDEX IF NOT EXISTS idx_tx_inputs_txid ON tx_inputs(txid);
CREATE INDEX IF NOT EXISTS idx_tx_inputs_prev_txid ON tx_inputs(prev_txid);
CREATE INDEX IF NOT EXISTS idx_tx_outputs_txid ON tx_outputs(txid);
CREATE INDEX IF NOT EXISTS idx_tx_outputs_address ON tx_outputs(address);
CREATE INDEX IF NOT EXISTS idx_special_transactions_tx_type ON special_transactions(tx_type);
