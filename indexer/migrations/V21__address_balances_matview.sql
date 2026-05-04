CREATE MATERIALIZED VIEW address_balances AS
SELECT
    utxo.address_id,
    SUM(utxo.amount)::BIGINT AS balance,
    COUNT(*)::BIGINT          AS utxo_count
FROM utxo
WHERE utxo.address_id IS NOT NULL
GROUP BY utxo.address_id
WITH NO DATA;

CREATE UNIQUE INDEX address_balances_address_id_idx ON address_balances (address_id);
CREATE INDEX address_balances_balance_idx ON address_balances (balance DESC);