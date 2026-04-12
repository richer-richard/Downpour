use rusqlite::Connection;

pub fn apply(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS records (
          id TEXT PRIMARY KEY,
          timestamp_iso TEXT NOT NULL,
          duration_seconds REAL NOT NULL,
          score INTEGER NOT NULL,
          accuracy REAL NOT NULL,
          session_best_wpm REAL NOT NULL,
          average_wpm REAL NOT NULL,
          level_reached INTEGER NOT NULL,
          mistakes INTEGER NOT NULL,
          misses INTEGER NOT NULL,
          mode TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_records_timestamp ON records(timestamp_iso DESC, id DESC);

        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        INSERT OR IGNORE INTO meta(key, value) VALUES ('best_wpm', '0');

        CREATE TABLE IF NOT EXISTS lesson_progress (
          lesson_id TEXT PRIMARY KEY,
          completed INTEGER NOT NULL DEFAULT 0,
          stars INTEGER NOT NULL DEFAULT 0,
          best_wpm REAL NOT NULL DEFAULT 0,
          best_accuracy REAL NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );
        "#,
    )
}
