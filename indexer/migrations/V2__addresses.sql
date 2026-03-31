CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    address varchar(35),
    first_seen_tx_id INT references transactions(id) DEFERRABLE INITIALLY DEFERRED,
    first_seen_block INT references blocks(height),
    last_seen_tx_id INT references transactions(id) DEFERRABLE INITIALLY DEFERRED,
    last_seen_block INT references blocks(height),
    CONSTRAINT address_unique UNIQUE(address)
);

CREATE UNIQUE INDEX addresses_address ON addresses(address);
