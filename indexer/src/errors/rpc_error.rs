#[derive(Debug)]
pub struct RpcError {
    pub message: String,
    pub code: i64
}
impl std::fmt::Display for RpcError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "Dash RPC error: code {}, message: {}", self.code, &self.message)
    }
}

