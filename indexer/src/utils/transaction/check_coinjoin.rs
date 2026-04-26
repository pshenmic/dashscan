use crate::rpc::Transaction as RpcTransaction;

const COINJOIN_DENOMINATIONS_SAT: [i64; 5] = [
    1_000_010_000,
    100_001_000,
    10_000_100,
    1_000_010,
    100_001,
];

pub fn to_sat(value: f64) -> i64 {
    (value * 100_000_000.0).round() as i64
}

pub trait CheckCoinjoin {
    fn check_coinjoin(&self) -> bool;
}

impl CheckCoinjoin for RpcTransaction {
    fn check_coinjoin(&self) -> bool {
        if self.vin.iter().any(|v| v.coinbase.is_some()) {
            return false;
        }

        if self.vin.is_empty() || self.vin.len() != self.vout.len() {
            return false;
        }

        let denom = to_sat(self.vout[0].value);
        if !COINJOIN_DENOMINATIONS_SAT.contains(&denom) {
            return false;
        }

        self.vout.iter().all(|o| to_sat(o.value) == denom)
    }
}