ALTER TABLE blocks ADD COLUMN merkle_root_mn_list TEXT;

CREATE TABLE masternodes (
    id SERIAL PRIMARY KEY,
    pro_tx_hash          CHAR(64),
    address              VARCHAR(64),
    payee                VARCHAR(64),
    status               VARCHAR(32),
    type                 VARCHAR(32),
    pos_penalty_score    INT,
    consecutive_payments INT,
    last_paid_time       BIGINT,
    last_paid_block      INT,
    owner_address        VARCHAR(64),
    voting_address       VARCHAR(64),
    collateral_address   VARCHAR(64),
    pub_key_operator     VARCHAR(96),
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX masternodes_pro_tx_hash ON masternodes(pro_tx_hash);