CREATE TABLE transactions (
    txid char(64) PRIMARY KEY,
    type SMALLINT not null,
    version  INT,
    size INT,
    block_height int not null references blocks(height),
    amount bigint not null,
    locktime BIGINT,
    is_coinbase BOOLEAN DEFAULT FALSE
);

CREATE UNIQUE INDEX transaction_hash ON transactions(txid);
CREATE INDEX transaction_height ON transactions(block_height);
