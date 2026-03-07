CREATE TABLE transactions (
    hash char(64) PRIMARY KEY,
    type SMALLINT not null,
    version  INT,
    size INT,
    block_hash char(64) not null references blocks(hash) DEFERRABLE INITIALLY DEFERRED,
    locktime BIGINT,
    is_coinbase BOOLEAN DEFAULT FALSE
);

CREATE UNIQUE INDEX transaction_hash ON transactions(hash);
CREATE INDEX transaction_block_hash ON transactions(block_hash);