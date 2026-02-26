CREATE TABLE addresses (
    address varchar(35) PRIMARY KEY ,
    creation_height int references blocks(height),
    first_seen_tx   CHAR(64) references transactions(txid),
    first_seen_block INT references blocks(height),
    CONSTRAINT address_unique UNIQUE(address)
);

CREATE UNIQUE INDEX addresses_address ON addresses(address);
CREATE INDEX addresses_creation_height ON addresses(creation_height);