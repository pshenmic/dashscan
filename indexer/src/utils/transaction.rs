use crate::rpc::Transaction as RpcTransaction;

const COINJOIN_DENOMINATIONS_SAT: [i64; 5] =
    [1_000_010_000, 100_001_000, 10_000_100, 1_000_010, 100_001];

pub fn to_sat(value: f64) -> i64 {
    (value * 100_000_000.0).round() as i64
}

pub trait TransactionUtils {
    fn check_coinjoin(&self) -> bool;
    fn get_transaction_amount(&self) -> i64;
}

impl TransactionUtils for RpcTransaction {
    fn check_coinjoin(&self) -> bool {
        // check vout's count must be 3..20
        // vin's count must be equal vout's count
        // check denomination
        self.vout.len() > 3
            && self.vout.len() < 20
            && self.vin.len() == self.vout.len()
            && {
            let denom = to_sat(self.vout[0].value);
            COINJOIN_DENOMINATIONS_SAT.contains(&denom)
                && self.vout.iter().all(|o| to_sat(o.value) == denom)
        }
    }

    fn get_transaction_amount(&self) -> i64 {
        self.vout.iter().map(|out| to_sat(out.value)).sum()
    }
}
