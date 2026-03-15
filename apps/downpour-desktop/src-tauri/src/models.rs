use serde::{Deserialize, Serialize};

use crate::errors::AppError;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GameRecord {
    pub id: String,
    pub timestamp_iso: String,
    pub duration_seconds: f64,
    pub score: i64,
    pub accuracy: f64,
    pub session_best_wpm: f64,
    pub average_wpm: f64,
    pub level_reached: i64,
    pub mistakes: i64,
    pub misses: i64,
    pub mode: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameRecordInput {
    pub id: String,
    pub timestamp_iso: String,
    pub duration_seconds: f64,
    pub score: i64,
    pub accuracy: f64,
    pub session_best_wpm: f64,
    pub average_wpm: f64,
    pub level_reached: i64,
    pub mistakes: i64,
    pub misses: i64,
    pub mode: String,
}

impl GameRecordInput {
    pub fn validate(&self) -> Result<(), AppError> {
        if self.id.trim().is_empty() {
            return Err(AppError::Validation("id cannot be empty".to_string()));
        }

        if self.timestamp_iso.trim().is_empty() {
            return Err(AppError::Validation(
                "timestampIso cannot be empty".to_string(),
            ));
        }

        if self.duration_seconds < 0.0 {
            return Err(AppError::Validation(
                "durationSeconds cannot be negative".to_string(),
            ));
        }

        if self.score < 0 {
            return Err(AppError::Validation("score cannot be negative".to_string()));
        }

        if self.level_reached < 1 {
            return Err(AppError::Validation(
                "levelReached must be at least 1".to_string(),
            ));
        }

        if self.mistakes < 0 || self.misses < 0 {
            return Err(AppError::Validation(
                "mistakes and misses must be >= 0".to_string(),
            ));
        }

        if !matches!(
            self.mode.as_str(),
            "veryEasy" | "easy" | "medium" | "hard" | "veryHard"
        ) {
            return Err(AppError::Validation(
                "mode must be veryEasy, easy, medium, hard, or veryHard".to_string(),
            ));
        }

        Ok(())
    }

    pub fn sanitize(self) -> GameRecord {
        GameRecord {
            id: self.id,
            timestamp_iso: self.timestamp_iso,
            duration_seconds: self.duration_seconds.max(0.0),
            score: self.score.max(0),
            accuracy: self.accuracy.clamp(0.0, 1.0),
            session_best_wpm: self.session_best_wpm.max(0.0),
            average_wpm: self.average_wpm.max(0.0),
            level_reached: self.level_reached.max(1),
            mistakes: self.mistakes.max(0),
            misses: self.misses.max(0),
            mode: self.mode,
        }
    }
}
