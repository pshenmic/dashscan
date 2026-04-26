use crate::rpc::Transaction as RpcTransaction;
use crate::utils::transaction::check_coinjoin::to_sat;

pub trait TransactionAmountCalculator {
    fn get_transaction_amount(&self) -> i64;
}

impl TransactionAmountCalculator for RpcTransaction {
    fn get_transaction_amount(&self) -> i64 {
        self.vout.iter().map(|out| to_sat(out.value)).sum()
    }
}