CREATE TABLE blocks (
    hash char(64) PRIMARY KEY,
    height int NOT NULL check(height >= 0),
    version int not null,
    "timestamp" timestamp not null ,
    tx_count int not null,
    fee bigint not null,
    credit_pool_balance bigint not null,
    chainwork TEXT not null,
    difficulty DOUBLE PRECISION not null,
    nonce           BIGINT not null,
    size            INT not null,
    prev_hash       CHAR(64) not null,
    merkle_root     CHAR(64) not null,
    CONSTRAINT block_hash_unique UNIQUE(hash),
    CONSTRAINT block_height_unique UNIQUE (height)
);

CREATE UNIQUE INDEX block_height ON blocks (height);
CREATE INDEX block_timestamp ON blocks (timestamp);
CREATE UNIQUE INDEX block_hash ON blocks (hash);
