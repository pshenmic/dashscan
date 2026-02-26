CREATE TABLE addresses (
    address varchar(35) PRIMARY KEY ,
    first_seen_tx   CHAR(64) references transactions(txid),
    first_seen_block INT references blocks(height),
    last_seen_tx CHAR(64) references transactions(txid),
    last_seen_block INT references blocks(height),
    CONSTRAINT address_unique UNIQUE(address)
);

CREATE UNIQUE INDEX addresses_address ON addresses(address);
