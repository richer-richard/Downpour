use std::path::PathBuf;

use tauri::Manager;

use crate::errors::AppError;

pub fn resolve_db_path(app: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| AppError::Path(err.to_string()))?;

    std::fs::create_dir_all(&data_dir)?;
    Ok(data_dir.join("downpour.db"))
}
