CREATE TABLE blocks (
    hash char(64) PRIMARY KEY,
    height int NOT NULL check(height > 0),
    version int not null,
    "timestamp" timestamp not null ,
    block_size int not null,
    tx_count int not null,
    fee bigint not null,
    credit_pool_balance bigint,
    chainwork TEXT,
    difficulty DOUBLE PRECISION,
    nonce           BIGINT,
    size            INT,
    prev_hash       CHAR(64),
    merkle_root     CHAR(64),
    CONSTRAINT block_hash_unique UNIQUE(hash),
    CONSTRAINT block_height_unique UNIQUE (height)
);

CREATE UNIQUE INDEX block_height ON blocks (height);
CREATE INDEX block_timestamp ON blocks (timestamp);
CREATE UNIQUE INDEX block_hash ON blocks (hash);
