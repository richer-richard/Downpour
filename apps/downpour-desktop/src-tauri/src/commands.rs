use tauri::State;

use crate::{
    engine::{GameAction, GameSessionFrame, GameSettings},
    models::GameRecord,
    models::GameRecordInput,
    AppState,
};

#[tauri::command]
pub fn get_records(state: State<'_, AppState>) -> Result<Vec<GameRecord>, String> {
    state.db.get_records().map_err(|err| err.to_string())
}

#[tauri::command]
pub fn save_record(state: State<'_, AppState>, record: GameRecordInput) -> Result<(), String> {
    state.db.save_record(record).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn get_best_wpm(state: State<'_, AppState>) -> Result<f64, String> {
    state.db.get_best_wpm().map_err(|err| err.to_string())
}

#[tauri::command]
pub fn set_best_wpm(state: State<'_, AppState>, value: f64) -> Result<(), String> {
    state.db.set_best_wpm(value).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn reset_records(state: State<'_, AppState>) -> Result<(), String> {
    state.db.reset_records().map_err(|err| err.to_string())
}

#[tauri::command]
pub fn create_game_session(
    state: State<'_, AppState>,
    settings: GameSettings,
    global_best_wpm: f64,
) -> Result<GameSessionFrame, String> {
    state
        .engine
        .create_session(settings, global_best_wpm)
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn tick_game_session(
    state: State<'_, AppState>,
    session_id: String,
    delta_seconds: f64,
    actions: Vec<GameAction>,
) -> Result<GameSessionFrame, String> {
    state
        .engine
        .tick_session(&session_id, delta_seconds, actions)
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn destroy_game_session(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state
        .engine
        .destroy_session(&session_id)
        .map_err(|err| err.to_string())
}
