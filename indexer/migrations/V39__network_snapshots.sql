CREATE TABLE network_snapshots (
    hour                TIMESTAMP NOT NULL PRIMARY KEY,
    masternodes         INTEGER   NOT NULL,
    masternodes_enabled INTEGER   NOT NULL,
    evonodes            INTEGER   NOT NULL,
    evonodes_enabled    INTEGER   NOT NULL,
    peers               INTEGER,
    utxo_count          BIGINT,
    utxo_amount         BIGINT
);
