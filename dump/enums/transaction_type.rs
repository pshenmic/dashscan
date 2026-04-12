use std::fmt::Formatter;

#[derive(Debug, Clone)]
pub enum TransactionType {
    Normal,
    ProRegTx,
    ProUpServTx,
    ProUpRegTx,
    ProUpRevTx,
    CbTx,
    QcTx,
    MnHfTx,
    AssetLockTx,
    AssetUnlockTx,
}

impl std::fmt::Display for TransactionType {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}
