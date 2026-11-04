ALTER TABLE chain_stats_hourly
    ADD COLUMN new_addresses BIGINT NOT NULL DEFAULT 0;
