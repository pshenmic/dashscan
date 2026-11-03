-- payee and owner_address can hold comma-separated address lists (106 chars on testnet)
ALTER TABLE masternodes
    ADD COLUMN outpoint             VARCHAR(80),
    ADD COLUMN platform_node_id     CHAR(40),
    ADD COLUMN platform_p2p_port    INT,
    ADD COLUMN platform_http_port   INT,
    ALTER COLUMN address            TYPE TEXT,
    ALTER COLUMN payee              TYPE TEXT,
    ALTER COLUMN owner_address      TYPE TEXT,
    ALTER COLUMN voting_address     TYPE TEXT,
    ALTER COLUMN collateral_address TYPE TEXT;
