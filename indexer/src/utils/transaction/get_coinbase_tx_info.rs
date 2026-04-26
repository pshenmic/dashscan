use dashcore::consensus::Decodable;
use dashcore::transaction::special_transaction::coinbase::CoinbasePayload;
use crate::rpc::Transaction as RpcTransaction;
use dashcore::transaction::TransactionType;

pub trait GetCoinbaseTxInfo {
    fn get_coinbase_tx_value(&self) -> Option<i64>;
}

impl GetCoinbaseTxInfo for RpcTransaction {
    fn get_coinbase_tx_value(&self) -> Option<i64> {
        if self.tx_type.unwrap_or(0) as usize != TransactionType::Coinbase as usize {
            None
        } else {
            // getting duffs
            Some(
                self.vout
                    .iter()
                    .map(|out| (out.value * 100_000_000.0).round() as i64)
                    .sum(),
            )
        }
    }
}
