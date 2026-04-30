CREATE TABLE utxo
(
    tx_id      INT    NOT NULL,
    vout_index INT    NOT NULL,
    address_id INT,
    amount     BIGINT NOT NULL,
    PRIMARY KEY (tx_id, vout_index),
    FOREIGN KEY (tx_id, vout_index)
        REFERENCES tx_outputs (tx_id, vout_index)
        ON DELETE CASCADE
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX utxo_address_id_idx ON utxo (address_id) WHERE address_id IS NOT NULL;
CREATE INDEX utxo_tx_id_idx ON utxo (tx_id);

ALTER TABLE utxo SET (fillfactor = 80, autovacuum_vacuum_scale_factor = 0.02);