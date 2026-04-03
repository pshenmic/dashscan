use dashcore::BlockHash;

#[derive(Debug)]
pub enum P2PError {
    Connection(std::io::Error),
    Io(std::io::Error),
    Decode(dashcore::consensus::encode::Error),
    BlockNotFound(BlockHash),
    HeightNotFound(u64),
}

impl std::fmt::Display for P2PError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            P2PError::Connection(e) => write!(f, "Connection failed: {}", e),
            P2PError::Io(e) => write!(f, "I/O error: {}", e),
            P2PError::Decode(e) => write!(f, "Message decode error: {}", e),
            P2PError::BlockNotFound(hash) => write!(f, "Block not found: {}", hash),
            P2PError::HeightNotFound(h) => write!(f, "Height {} not found on peer", h),
        }
    }
}

impl std::error::Error for P2PError {}