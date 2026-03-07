use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("SQLite error: {0}")]
    Sql(#[from] rusqlite::Error),

    #[error("Serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("Validation failed: {0}")]
    Validation(String),

    #[error("Path resolution failed: {0}")]
    Path(String),

    #[error("Engine state failed: {0}")]
    State(String),

    #[error("Resource not found: {0}")]
    NotFound(String),
}
