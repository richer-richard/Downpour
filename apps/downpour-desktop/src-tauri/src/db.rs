use std::path::PathBuf;

use rusqlite::{params, Connection};

use crate::{
    errors::AppError,
    migrations,
    models::{GameRecord, GameRecordInput, LessonProgress, LessonProgressInput},
};

const MAX_RECORDS: i64 = 1000;

#[derive(Clone, Debug)]
pub struct Database {
    db_path: PathBuf,
}

impl Database {
    pub fn from_db_path(db_path: PathBuf) -> Result<Self, AppError> {
        let db = Self { db_path };
        db.init()?;
        Ok(db)
    }

    fn init(&self) -> Result<(), AppError> {
        let conn = self.connection()?;
        migrations::apply(&conn)?;
        Ok(())
    }

    fn connection(&self) -> Result<Connection, AppError> {
        let conn = Connection::open(&self.db_path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "FULL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        Ok(conn)
    }

    pub fn get_records(&self) -> Result<Vec<GameRecord>, AppError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT
              id,
              timestamp_iso,
              duration_seconds,
              score,
              accuracy,
              session_best_wpm,
              average_wpm,
              level_reached,
              mistakes,
              misses,
              mode
            FROM records
            ORDER BY timestamp_iso DESC, id DESC
            "#,
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(GameRecord {
                id: row.get(0)?,
                timestamp_iso: row.get(1)?,
                duration_seconds: row.get(2)?,
                score: row.get(3)?,
                accuracy: row.get(4)?,
                session_best_wpm: row.get(5)?,
                average_wpm: row.get(6)?,
                level_reached: row.get(7)?,
                mistakes: row.get(8)?,
                misses: row.get(9)?,
                mode: row.get(10)?,
            })
        })?;

        rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
    }

    pub fn save_record(&self, input: GameRecordInput) -> Result<(), AppError> {
        input.validate()?;
        let record = input.sanitize();

        let mut conn = self.connection()?;
        let tx = conn.transaction()?;

        tx.execute(
            r#"
            INSERT OR REPLACE INTO records (
              id,
              timestamp_iso,
              duration_seconds,
              score,
              accuracy,
              session_best_wpm,
              average_wpm,
              level_reached,
              mistakes,
              misses,
              mode
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#,
            params![
                record.id,
                record.timestamp_iso,
                record.duration_seconds,
                record.score,
                record.accuracy,
                record.session_best_wpm,
                record.average_wpm,
                record.level_reached,
                record.mistakes,
                record.misses,
                record.mode
            ],
        )?;

        tx.execute(
            r#"
            DELETE FROM records
            WHERE id IN (
              SELECT id FROM records
              ORDER BY timestamp_iso DESC, id DESC
              LIMIT -1 OFFSET ?1
            )
            "#,
            params![MAX_RECORDS],
        )?;

        tx.commit()?;
        Ok(())
    }

    pub fn get_best_wpm(&self) -> Result<f64, AppError> {
        let conn = self.connection()?;
        let value: Option<String> = conn
            .query_row("SELECT value FROM meta WHERE key = 'best_wpm'", [], |row| {
                row.get(0)
            })
            .ok();

        match value {
            Some(raw) => raw
                .parse::<f64>()
                .map_err(|err| AppError::Validation(err.to_string())),
            None => Ok(0.0),
        }
    }

    pub fn set_best_wpm(&self, value: f64) -> Result<(), AppError> {
        let best = value.max(0.0);
        let mut conn = self.connection()?;
        let tx = conn.transaction()?;

        tx.execute(
            "INSERT INTO meta(key, value) VALUES ('best_wpm', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![best.to_string()],
        )?;

        tx.commit()?;
        Ok(())
    }

    pub fn get_lesson_progress(&self) -> Result<Vec<LessonProgress>, AppError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT lesson_id, completed, stars, best_wpm, best_accuracy, updated_at
            FROM lesson_progress
            ORDER BY lesson_id ASC
            "#,
        )?;

        let rows = stmt.query_map([], |row| {
            let completed_int: i64 = row.get(1)?;
            Ok(LessonProgress {
                lesson_id: row.get(0)?,
                completed: completed_int != 0,
                stars: row.get(2)?,
                best_wpm: row.get(3)?,
                best_accuracy: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;

        rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
    }

    pub fn save_lesson_progress(&self, input: LessonProgressInput) -> Result<(), AppError> {
        input.validate()?;
        let entry = input.sanitize();

        let mut conn = self.connection()?;
        let tx = conn.transaction()?;

        tx.execute(
            r#"
            INSERT INTO lesson_progress (
              lesson_id, completed, stars, best_wpm, best_accuracy, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(lesson_id) DO UPDATE SET
              completed = max(lesson_progress.completed, excluded.completed),
              stars = max(lesson_progress.stars, excluded.stars),
              best_wpm = max(lesson_progress.best_wpm, excluded.best_wpm),
              best_accuracy = max(lesson_progress.best_accuracy, excluded.best_accuracy),
              updated_at = excluded.updated_at
            "#,
            params![
                entry.lesson_id,
                entry.completed as i64,
                entry.stars,
                entry.best_wpm,
                entry.best_accuracy,
                entry.updated_at,
            ],
        )?;

        tx.commit()?;
        Ok(())
    }

    pub fn reset_records(&self) -> Result<(), AppError> {
        let mut conn = self.connection()?;
        let tx = conn.transaction()?;

        tx.execute("DELETE FROM records", [])?;
        tx.execute(
            "INSERT INTO meta(key, value) VALUES ('best_wpm', '0') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [],
        )?;

        tx.commit()?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::Database;
    use crate::models::GameRecordInput;

    fn sample_record() -> GameRecordInput {
        GameRecordInput {
            id: "r1".to_string(),
            timestamp_iso: "2026-03-01T00:00:00.000Z".to_string(),
            duration_seconds: 65.0,
            score: 300,
            accuracy: 0.95,
            session_best_wpm: 72.4,
            average_wpm: 65.1,
            level_reached: 7,
            mistakes: 4,
            misses: 2,
            mode: "medium".to_string(),
        }
    }

    #[test]
    fn migration_initializes_best_wpm() {
        let temp = tempdir().expect("temp dir");
        let db_path = temp.path().join("downpour.db");
        let db = Database::from_db_path(db_path).expect("db init");

        let best = db.get_best_wpm().expect("best wpm");
        assert_eq!(best, 0.0);
    }

    #[test]
    fn save_and_get_records() {
        let temp = tempdir().expect("temp dir");
        let db_path = temp.path().join("downpour.db");
        let db = Database::from_db_path(db_path).expect("db init");

        db.save_record(sample_record()).expect("save record");

        let records = db.get_records().expect("records");
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].score, 300);
    }

    #[test]
    fn get_set_best_wpm() {
        let temp = tempdir().expect("temp dir");
        let db_path = temp.path().join("downpour.db");
        let db = Database::from_db_path(db_path).expect("db init");

        db.set_best_wpm(88.7).expect("set best wpm");
        let best = db.get_best_wpm().expect("get best wpm");

        assert!((best - 88.7).abs() < 0.01);
    }

    #[test]
    fn reset_clears_records_and_best() {
        let temp = tempdir().expect("temp dir");
        let db_path = temp.path().join("downpour.db");
        let db = Database::from_db_path(db_path).expect("db init");

        db.save_record(sample_record()).expect("save record");
        db.set_best_wpm(99.0).expect("set best");

        db.reset_records().expect("reset");

        let records = db.get_records().expect("records");
        let best = db.get_best_wpm().expect("best");

        assert!(records.is_empty());
        assert_eq!(best, 0.0);
    }

    #[test]
    fn rejects_invalid_payloads() {
        let temp = tempdir().expect("temp dir");
        let db_path = temp.path().join("downpour.db");
        let db = Database::from_db_path(db_path).expect("db init");

        let mut bad = sample_record();
        bad.duration_seconds = -1.0;

        let result = db.save_record(bad);
        assert!(result.is_err());
    }
}
