CREATE TABLE miner_pools (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL
);

CREATE TABLE miner_names (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

ALTER TABLE blocks
    ADD COLUMN miner_id INT REFERENCES miner_pools(id),
    ADD COLUMN miner_name_id INT REFERENCES miner_names(id);