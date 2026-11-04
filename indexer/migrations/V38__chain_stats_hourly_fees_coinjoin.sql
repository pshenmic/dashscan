ALTER TABLE chain_stats_hourly
    ADD COLUMN fees            BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN fee_tx_count    BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN coinjoin_amount BIGINT NOT NULL DEFAULT 0;
