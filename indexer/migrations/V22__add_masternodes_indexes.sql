CREATE INDEX idx_masternode_type on masternodes(type);
CREATE INDEX idx_masternode_status on masternodes(status);
CREATE INDEX idx_masternode_type_status ON masternodes (type, status);
CREATE INDEX idx_masternode_pos ON masternodes(pos_penalty_score);
CREATE INDEX idx_masternode_last_paid_time ON masternodes(last_paid_time);