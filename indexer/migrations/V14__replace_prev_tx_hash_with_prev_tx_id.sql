ALTER TABLE tx_inputs ADD COLUMN prev_tx_id INT REFERENCES transactions (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE tx_inputs ADD COLUMN address_id INT REFERENCES addresses (id) DEFERRABLE INITIALLY DEFERRED;

UPDATE tx_inputs
SET prev_tx_id = t.id
FROM transactions t
WHERE TRIM(tx_inputs.prev_tx_hash) = TRIM(t.hash);

UPDATE tx_inputs
SET address_id = o.address_id
FROM tx_outputs o
WHERE tx_inputs.prev_tx_id = o.tx_id
  AND tx_inputs.prev_vout_index = o.vout_index;

CREATE INDEX tx_inputs_prev_tx_id ON tx_inputs (prev_tx_id);
CREATE INDEX tx_inputs_address_id ON tx_inputs (address_id);