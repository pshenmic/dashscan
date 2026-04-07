pub struct DatabaseError {
    reason: String,
}

impl From<clickhouse::error::Error> for DatabaseError {
    fn from(e: clickhouse::error::Error) -> Self {
        DatabaseError {
            reason: e.to_string(),
        }
    }
}

impl std::fmt::Display for DatabaseError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "Database error: {}", self.reason)
    }
}