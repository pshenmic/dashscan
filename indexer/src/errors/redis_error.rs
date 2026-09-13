use deadpool_redis::PoolError;
use deadpool_redis::redis::RedisError as RedisLibError;

pub struct RedisError {
    reason: String,
}

impl From<PoolError> for RedisError {
    fn from(e: PoolError) -> Self {
        RedisError {
            reason: e.to_string(),
        }
    }
}

impl From<RedisLibError> for RedisError {
    fn from(e: RedisLibError) -> Self {
        RedisError {
            reason: e.to_string(),
        }
    }
}

impl std::fmt::Display for RedisError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "Redis error: {}", self.reason)
    }
}