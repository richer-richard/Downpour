mod commands;
mod db;
mod engine;
mod errors;
mod migrations;
mod models;
mod paths;

use db::Database;
use engine::EngineManager;
use tauri::{webview::PageLoadEvent, Manager, WebviewWindowBuilder};

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

            let mut main_window_config = app
                .config()
                .app
                .windows
                .iter()
                .find(|window| window.label == "main")
                .cloned()
                .expect("missing main window config");
            main_window_config.maximized = false;
            main_window_config.visible = false;

            WebviewWindowBuilder::from_config(app.handle(), &main_window_config)?
                .on_page_load(|window, payload| {
                    if payload.event() == PageLoadEvent::Finished {
                        let _ = window.maximize();
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                })
                .build()?;

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
