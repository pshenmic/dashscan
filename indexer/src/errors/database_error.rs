use deadpool_postgres::PoolError;

pub struct DatabaseError {
    reason: String
}

impl From<tokio_postgres::Error> for DatabaseError {
    fn from(e: tokio_postgres::Error) -> Self {
        DatabaseError {
            reason: e.to_string(),
        }
    }
}

impl From<PoolError> for DatabaseError {
    fn from(pool_error: PoolError) -> Self {
        match pool_error {
            PoolError::Timeout(_) => {
                DatabaseError {
                    reason: "Database request timed out".to_string(),
                }   
            }
            PoolError::Backend(err) => {
                let reason = err
                    .as_db_error()
                    .map(|e| e.to_string())
                    .unwrap_or_else(|| err.to_string());
                DatabaseError { reason }
            }
            PoolError::Closed => {
                DatabaseError {
                    reason: "Database connection closed".to_string(),
                }
            }
            PoolError::NoRuntimeSpecified => {
                DatabaseError {
                    reason: "No runtime specified".to_string(),
                }
            }
            PoolError::PostCreateHook(_) => {
                DatabaseError {
                    reason: "PostCreateHook failed".to_string(),
                }
            }
            PoolError::PreRecycleHook(_) => {
                DatabaseError {
                    reason: "PreRecycleHook failed".to_string(),
                }
            }
            PoolError::PostRecycleHook(_) => {
                DatabaseError {
                    reason: "PostRecycleHook failed".to_string(),
                }
            }
        }
    }
}
impl std::fmt::Display for DatabaseError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "Database error: {}", self.reason)
    }
}