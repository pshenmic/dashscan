CREATE INDEX idx_tx_outputs_tx_id_vout ON tx_outputs (tx_id, vout_index);
CREATE INDEX idx_tx_inputs_tx_id ON tx_inputs (tx_id);
CREATE INDEX idx_tx_inputs_prev ON tx_inputs (prev_tx_id, prev_vout_index);