use serde::Deserialize;
use tracing::info;
use crate::errors::unexpected_error::UnexpectedError;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MinerPool {
    pub pool_name: String,
    pub url: String,
    pub search_strings: Vec<String>,
}

// create vec of pools from
// https://raw.githubusercontent.com/dashpay/insight-api/master/pools.json
pub fn init_miners_pools() -> Result<Vec<MinerPool>, UnexpectedError> {
    // Binary will include pool.json as string
    let data = include_str!("pools.json");

    let pools: Vec<MinerPool> = serde_json::from_str(data).map_err(|e| UnexpectedError(e.to_string()))?;

    info!("Imported miners pools: {}", pools.len());

    Ok(pools)
}