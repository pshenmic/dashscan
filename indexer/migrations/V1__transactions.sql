CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    hash char(64) UNIQUE,
    block_height INT not null references blocks(height) DEFERRABLE INITIALLY DEFERRED,
    type SMALLINT not null,
    version  INT,
    size INT,
    locktime BIGINT,
    is_coinbase BOOLEAN DEFAULT FALSE
);

CREATE UNIQUE INDEX transaction_hash ON transactions(hash);
CREATE INDEX transaction_block_height ON transactions (block_height);