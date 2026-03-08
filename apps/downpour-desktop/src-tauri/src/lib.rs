mod commands;
mod db;
mod engine;
mod errors;
mod migrations;
mod models;
mod paths;

use db::Database;
use engine::EngineManager;
use tauri::Manager;

pub struct AppState {
    db: Database,
    engine: EngineManager,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let db_path = paths::resolve_db_path(app.handle())?;
            let database = Database::from_db_path(db_path)?;
            app.manage(AppState {
                db: database,
                engine: EngineManager::default(),
            });

            if let Some(window) = app.get_webview_window("main") {
                window.maximize()?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_records,
            commands::save_record,
            commands::get_best_wpm,
            commands::set_best_wpm,
            commands::reset_records,
            commands::create_game_session,
            commands::tick_game_session,
            commands::destroy_game_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Downpour application");
}
