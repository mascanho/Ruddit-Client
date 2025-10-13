use chrono::{DateTime, NaiveDateTime, Utc};
use directories::BaseDirs;
use rusqlite::{params, Connection, Result as RusqliteResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// 1. Define your PostDataWrapper with proper date fields
#[derive(Debug, Deserialize, Serialize)]
pub struct PostDataWrapper {
    pub id: i64,
    pub timestamp: i64,         // Unix timestamp
    pub formatted_date: String, // Human-readable date
    pub title: String,
    pub url: String,
    pub relevance: String,
    pub subreddit: String,
}

pub struct DB {
    pub conn: Connection,
}

impl DB {
    pub fn new() -> RusqliteResult<Self> {
        let base_dirs = BaseDirs::new().ok_or_else(|| {
            rusqlite::Error::InvalidPath(PathBuf::from("Failed to get base directories"))
        })?;

        let app_dir = base_dirs.config_dir().join("ruddit");
        std::fs::create_dir_all(&app_dir)
            .map_err(|e| rusqlite::Error::InvalidPath(app_dir.clone()))?;

        let db_path = app_dir.join("ruddit.db");
        let conn = Connection::open(db_path)?;

        Ok(DB { conn })
    }

    pub fn create_tables(&self) -> RusqliteResult<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS reddit_posts (
                id INTEGER PRIMARY KEY,
                timestamp INTEGER NOT NULL,
                formatted_date TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT UNIQUE NOT NULL,
                relevance TEXT,
                subreddit TEXT
            )",
            [],
        )?;
        Ok(())
    }

    pub fn append_results(&mut self, results: &[PostDataWrapper]) -> RusqliteResult<()> {
        let tx = self.conn.transaction()?;

        {
            let mut stmt = tx.prepare(
                "INSERT OR IGNORE INTO reddit_posts
                (timestamp, formatted_date, title, url, relevance, subreddit)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            )?;

            for result in results {
                stmt.execute(params![
                    result.timestamp,
                    result.formatted_date,
                    result.title,
                    result.url,
                    result.relevance,
                    result.subreddit
                ])?;
            }
        }

        tx.commit()?;
        println!("Added {} results", results.len());
        Ok(())
    }

    pub fn get_db_results(&self) -> RusqliteResult<Vec<PostDataWrapper>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, timestamp, formatted_date, title, url, relevance, subreddit
             FROM reddit_posts
             ORDER BY timestamp DESC",
        )?;

        let posts = stmt
            .query_map([], |row| {
                Ok(PostDataWrapper {
                    id: row.get(0)?,
                    timestamp: row.get(1)?,
                    formatted_date: row.get(2)?,
                    title: row.get(3)?,
                    url: row.get(4)?,
                    relevance: row.get(5)?,
                    subreddit: row.get(6)?,
                })
            })?
            .collect::<RusqliteResult<Vec<_>>>()?;

        Ok(posts)
    }

    // Helper function to convert timestamp to formatted date
    pub fn format_timestamp(timestamp: i64) -> RusqliteResult<String> {
        let naive_datetime = NaiveDateTime::from_timestamp_opt(timestamp, 0).ok_or(
            rusqlite::Error::InvalidParameterName("Invalid timestamp".to_string()),
        )?;

        let datetime: DateTime<Utc> = DateTime::from_utc(naive_datetime, Utc);
        Ok(datetime.format("%Y-%m-%d %H:%M:%S").to_string())
    }

    pub fn clear_database(&self) -> RusqliteResult<()> {
        self.conn.execute("DELETE FROM reddit_posts", [])?;
        Ok(())
    }
}
