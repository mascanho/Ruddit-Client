use chrono::{DateTime, Utc};
use directories::BaseDirs;
use rusqlite::{Connection, Result as RusqliteResult, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// Post data structure
#[derive(Debug, Deserialize, Serialize)]
pub struct PostDataWrapper {
    pub id: i64,
    pub timestamp: i64,
    pub formatted_date: String,
    pub title: String,
    pub url: String,
    pub relevance: String,
    pub subreddit: String,
    pub permalink: String,
}

// Comment data structure
#[derive(Debug, Deserialize, Serialize)]
pub struct CommentDataWrapper {
    pub id: String,
    pub post_id: String,
    pub body: String,
    pub author: String,
    pub timestamp: i64,
    pub formatted_date: String,
    pub score: i32,
    pub permalink: String,
    pub parent_id: String,
    pub subreddit: String,
    pub post_title: String,
}

pub struct DB {
    pub conn: Connection,
}

impl DB {
    pub fn new() -> RusqliteResult<Self> {
        let base_dirs = BaseDirs::new().ok_or(rusqlite::Error::InvalidPath(PathBuf::from(
            "Failed to get base directories",
        )))?;

        let app_dir = base_dirs.data_dir().join("ruddit");

        if !app_dir.exists() {
            std::fs::create_dir_all(&app_dir).map_err(|e| {
                rusqlite::Error::InvalidPath(PathBuf::from(format!(
                    "Failed to create directory: {}",
                    e
                )))
            })?;
        }

        let db_path = app_dir.join("ruddit.db");
        let conn = Connection::open(db_path)?;

        Ok(DB { conn })
    }

    pub fn create_tables(&self) -> RusqliteResult<()> {
        // Create posts table if it doesn't exist
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS reddit_posts (
                id INTEGER PRIMARY KEY,
                timestamp INTEGER NOT NULL,
                formatted_date TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                relevance TEXT NOT NULL DEFAULT '',
                subreddit TEXT NOT NULL DEFAULT '',
                permalink TEXT NOT NULL DEFAULT ''
            )",
            [],
        )?;

        // Create comments table
        self.create_comments_table()?;

        Ok(())
    }

    pub fn create_comments_table(&self) -> RusqliteResult<()> {
        // Create comments table if it doesn't exist
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS reddit_comments (
                id TEXT PRIMARY KEY,
                post_id TEXT NOT NULL,
                body TEXT NOT NULL,
                author TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                formatted_date TEXT NOT NULL,
                score INTEGER NOT NULL,
                permalink TEXT NOT NULL,
                parent_id TEXT NOT NULL,
                subreddit TEXT NOT NULL,
                post_title TEXT NOT NULL
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
                (timestamp, formatted_date, title, url, relevance, subreddit, permalink)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            )?;

            for result in results {
                stmt.execute(params![
                    result.timestamp,
                    result.formatted_date,
                    result.title,
                    result.url,
                    result.relevance,
                    result.subreddit,
                    result.permalink
                ])?;
            }
        }

        tx.commit()?;
        println!("Added {} results", results.len());
        Ok(())
    }

    pub fn append_comments(&mut self, comments: &[CommentDataWrapper]) -> RusqliteResult<()> {
        let tx = self.conn.transaction()?;

        {
            let mut stmt = tx.prepare(
                "INSERT OR IGNORE INTO reddit_comments
                (id, post_id, body, author, timestamp, formatted_date, score, permalink, parent_id, subreddit, post_title)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            )?;

            for comment in comments {
                stmt.execute(params![
                    comment.id,
                    comment.post_id,
                    comment.body,
                    comment.author,
                    comment.timestamp,
                    comment.formatted_date,
                    comment.score,
                    comment.permalink,
                    comment.parent_id,
                    comment.subreddit,
                    comment.post_title
                ])?;
            }
        }

        tx.commit()?;
        println!("Added {} comments", comments.len());
        Ok(())
    }

    pub fn get_db_results(&self) -> RusqliteResult<Vec<PostDataWrapper>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, timestamp, formatted_date, title, url, relevance, subreddit, permalink
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
                    permalink: row.get(7)?,
                })
            })?
            .collect::<RusqliteResult<Vec<_>>>()?;

        Ok(posts)
    }

    pub fn get_post_comments(&self, post_id: &str) -> RusqliteResult<Vec<CommentDataWrapper>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, post_id, body, author, timestamp, formatted_date, score, permalink, parent_id, subreddit, post_title
             FROM reddit_comments
             WHERE post_id = ?1
             ORDER BY timestamp DESC",
        )?;

        let comments = stmt
            .query_map([post_id], |row| {
                Ok(CommentDataWrapper {
                    id: row.get(0)?,
                    post_id: row.get(1)?,
                    body: row.get(2)?,
                    author: row.get(3)?,
                    timestamp: row.get(4)?,
                    formatted_date: row.get(5)?,
                    score: row.get(6)?,
                    permalink: row.get(7)?,
                    parent_id: row.get(8)?,
                    subreddit: row.get(9)?,
                    post_title: row.get(10)?,
                })
            })?
            .collect::<RusqliteResult<Vec<_>>>()?;

        Ok(comments)
    }

    pub fn format_timestamp(timestamp: i64) -> RusqliteResult<String> {
        let naive_datetime = DateTime::from_timestamp(timestamp, 0)
            .ok_or(rusqlite::Error::InvalidParameterName(
                "Invalid timestamp".to_string(),
            ))?
            .naive_utc();

        let datetime: DateTime<Utc> = naive_datetime.and_utc();
        Ok(datetime.format("%Y-%m-%d %H:%M:%S").to_string())
    }

    pub fn clear_database(&self) -> RusqliteResult<()> {
        self.conn.execute("DELETE FROM reddit_posts", [])?;
        self.conn.execute("DELETE FROM reddit_comments", [])?;
        Ok(())
    }
}
