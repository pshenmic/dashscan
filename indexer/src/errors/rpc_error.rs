use crate::errors::block_index_error::BlockIndexError;

#[derive(Debug)]
pub struct RpcError {
    pub message: String,
    pub code: i64
}
impl std::fmt::Display for RpcError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        let code = self.code;
        let message = self.message.clone();


        write!(f, "Dash RPC error: code {code}, message: {message}")
    }
}

