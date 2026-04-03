use crate::errors::database_error::DatabaseError;
use crate::errors::p2p_error::P2PError;
use crate::errors::rpc_error::RpcError;

pub enum BlockIndexError {
    DatabaseError(DatabaseError),
    RpcError(RpcError),
    P2PError(P2PError),
    UnexpectedError(String),
}
impl std::fmt::Display for BlockIndexError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            BlockIndexError::DatabaseError(e) => {
                write!(f, "Block index database error: {e}")
            }
            BlockIndexError::RpcError(e) => {
                write!(f, "Block index Dash RPC error: {e}")
            }
            BlockIndexError::P2PError(e) => {
                write!(f, "Block index P2P error: {e}")
            }
            BlockIndexError::UnexpectedError(e) => {
                write!(f, "Block index unexpected error: {e}")
            }
        }
    }
}

impl From<RpcError> for BlockIndexError {
    fn from(rpc_error: RpcError) -> Self {
        BlockIndexError::RpcError(rpc_error)
    }
}

impl From<P2PError> for BlockIndexError {
    fn from(p2p_error: P2PError) -> Self {
        BlockIndexError::P2PError(p2p_error)
    }
}