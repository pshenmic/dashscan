use deadpool_postgres::PoolError;
use crate::errors::block_index_error::BlockIndexError;

pub struct UnexpectedError(String);
