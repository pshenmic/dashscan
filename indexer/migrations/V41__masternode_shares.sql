CREATE TABLE masternode_shares (
    pro_tx_hash   CHAR(64) NOT NULL,
    owner_address TEXT NOT NULL,
    amount_duffs  BIGINT NOT NULL,
    refund_address TEXT,
    reward_address TEXT,
    PRIMARY KEY (pro_tx_hash, owner_address)
);

CREATE INDEX masternode_shares_owner_address ON masternode_shares(owner_address);
