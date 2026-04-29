ALTER TABLE tx_inputs ADD COLUMN prev_tx_id INT REFERENCES transactions (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE tx_inputs ADD COLUMN address_id INT REFERENCES addresses (id) DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX tx_inputs_prev_tx_id ON tx_inputs (prev_tx_id);
CREATE INDEX tx_inputs_address_id ON tx_inputs (address_id);