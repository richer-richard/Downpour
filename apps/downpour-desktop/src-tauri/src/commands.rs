use tauri::State;

use crate::{
    engine::{GameAction, GameSessionFrame, GameSettings},
    errors::AppError,
    models::GameRecord,
    models::GameRecordInput,
    models::{LessonProgress, LessonProgressInput},
    AppState,
};

#[tauri::command]
pub fn get_records(state: State<'_, AppState>) -> Result<Vec<GameRecord>, AppError> {
    state.db.get_records()
}

#[tauri::command]
pub fn save_record(state: State<'_, AppState>, record: GameRecordInput) -> Result<(), AppError> {
    state.db.save_record(record)
}

#[tauri::command]
pub fn get_best_wpm(state: State<'_, AppState>) -> Result<f64, AppError> {
    state.db.get_best_wpm()
}

#[tauri::command]
pub fn set_best_wpm(state: State<'_, AppState>, value: f64) -> Result<(), AppError> {
    state.db.set_best_wpm(value)
}

#[tauri::command]
pub fn reset_records(state: State<'_, AppState>) -> Result<(), AppError> {
    state.db.reset_records()
}

#[tauri::command]
pub fn create_game_session(
    state: State<'_, AppState>,
    settings: GameSettings,
    global_best_wpm: f64,
) -> Result<GameSessionFrame, AppError> {
    state.engine.create_session(settings, global_best_wpm)
}

#[tauri::command]
pub fn tick_game_session(
    state: State<'_, AppState>,
    session_id: String,
    delta_seconds: f64,
    actions: Vec<GameAction>,
) -> Result<GameSessionFrame, AppError> {
    state.engine.tick_session(&session_id, delta_seconds, actions)
}

#[tauri::command]
pub fn destroy_game_session(state: State<'_, AppState>, session_id: String) -> Result<(), AppError> {
    state.engine.destroy_session(&session_id)
}

#[tauri::command]
pub fn get_lesson_progress(state: State<'_, AppState>) -> Result<Vec<LessonProgress>, AppError> {
    state.db.get_lesson_progress()
}

#[tauri::command]
pub fn save_lesson_progress(
    state: State<'_, AppState>,
    entry: LessonProgressInput,
) -> Result<(), AppError> {
    state.db.save_lesson_progress(entry)
}
