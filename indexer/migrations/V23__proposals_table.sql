CREATE TABLE proposals (
    id                SERIAL PRIMARY KEY,
    hash              CHAR(64) NOT NULL,
    name              TEXT,
    first_seen_block  INT NOT NULL REFERENCES blocks(height),
    updated_at_block  INT NOT NULL REFERENCES blocks(height),
    CONSTRAINT proposals_hash_unique UNIQUE (hash)
);

CREATE INDEX idx_proposals_updated_at_block ON proposals (updated_at_block);

CREATE TABLE proposal_votes (
    vote_hash            CHAR(64) PRIMARY KEY,
    proposal_id          INT NOT NULL REFERENCES proposals(id),
    masternode_outpoint  TEXT NOT NULL,
    pro_tx_hash          CHAR(64),
    vote_time            TIMESTAMP NOT NULL,
    outcome              VARCHAR(16) NOT NULL,
    signal               VARCHAR(16) NOT NULL,
    seen_at_block        INT NOT NULL REFERENCES blocks(height)
);

CREATE INDEX idx_proposal_votes_proposal_block ON proposal_votes (proposal_id, seen_at_block DESC);
CREATE INDEX idx_proposal_votes_protx_block    ON proposal_votes (pro_tx_hash, seen_at_block DESC);
CREATE INDEX idx_proposal_votes_outpoint       ON proposal_votes (masternode_outpoint, proposal_id, outcome);