use chrono::{DateTime, Utc};
use directories::BaseDirs;
use rusqlite::{params, Connection, Result as RusqliteResult};
use serde::{Deserialize, Serialize};
use std::{i64, path::PathBuf};

// Post data structure
#[derive(Debug, Deserialize, Serialize)]
pub struct PostDataWrapper {
    pub id: i64,
    pub timestamp: i64,
    pub formatted_date: String,
    pub title: String,
    pub url: String,
    pub sort_type: String,    // Renamed from relevance
    pub relevance_score: i64, // Added new field
    pub subreddit: String,
    pub permalink: String,
    pub engaged: i64, // Changed from bool to i64
    pub assignee: String,
    pub notes: String,
    pub name: String,
    pub selftext: Option<String>,
    pub author: String,
    pub score: i64,
    pub thumbnail: Option<String>,
    pub is_self: bool,
    pub num_comments: i64,
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
    pub engaged: i64, // Changed from bool to i64
    pub assignee: String,
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

        let db_instance = DB { conn };
        db_instance.create_tables()?;
        db_instance.create_current_search_tables()?;

        Ok(db_instance)
    }

    pub fn create_tables(&self) -> RusqliteResult<()> {
        // Create reddit_posts table if it doesn't exist
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS reddit_posts (
                id INTEGER PRIMARY KEY,
                timestamp INTEGER NOT NULL,
                formatted_date TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                sort_type TEXT NOT NULL DEFAULT '',
                relevance_score INTEGER NOT NULL DEFAULT 0,
                subreddit TEXT NOT NULL DEFAULT '',
                permalink TEXT NOT NULL DEFAULT '',
                engaged INTEGER,  -- Changed from BOOLEAN to INTEGER
                assignee TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                name TEXT NOT NULL DEFAULT '',
                selftext TEXT,
                author TEXT NOT NULL DEFAULT '',
                score INTEGER NOT NULL DEFAULT 0,
                thumbnail TEXT NOT NULL DEFAULT '',
                is_self INTEGER NOT NULL DEFAULT 0,
                num_comments INTEGER NOT NULL DEFAULT 0
            )",
            [],
        )?;

        self.create_comments_table()?;
        Ok(())
    }

    // SAVE SINGLE REDDIT POST
    pub fn save_single_reddit(&self, post: &PostDataWrapper) -> RusqliteResult<()> {
        println!("Attempting to save post: {:#?}", &post);

        let query = "INSERT OR IGNORE INTO reddit_posts (id, timestamp, formatted_date, title, url, sort_type, relevance_score, subreddit, permalink, engaged, assignee, notes, name, selftext, author, score, thumbnail, is_self, num_comments)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        self.conn.execute(
            query,
            params![
                post.id,
                post.timestamp,
                post.formatted_date,
                post.title,
                post.url,
                post.sort_type,
                post.relevance_score,
                post.subreddit,
                post.permalink,
                post.engaged,
                post.assignee,
                post.notes,
                post.name,
                post.selftext,
                post.author,
                post.score,
                post.thumbnail,
                post.is_self,
                post.num_comments
            ],
        )?;

        Ok(())
    }

    // REMOVE A SINGLE ENTRY FROM THE TABLE
    pub fn remove_single_reddit(&self, id: &i64) -> RusqliteResult<()> {
        self.conn
            .execute("DELETE FROM reddit_posts WHERE id = ?", params![id])?;
        Ok(())
    }

    pub fn create_current_search_tables(&self) -> RusqliteResult<()> {
        // Create posts table if it doesn't exist
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS subreddit_search (
                id INTEGER PRIMARY KEY,
                timestamp INTEGER NOT NULL,
                formatted_date TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                sort_type TEXT NOT NULL DEFAULT '',
                relevance_score INTEGER NOT NULL DEFAULT 0,
                subreddit TEXT NOT NULL DEFAULT '',
                permalink TEXT NOT NULL DEFAULT '',
                engaged BOOLEAN,
                assignee TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                name TEXT NOT NULL DEFAULT '',
                selftext TEXT NOT NULL DEFAULT '',
                author TEXT NOT NULL DEFAULT '',
                score INTEGER NOT NULL DEFAULT 0,
                thumbnail TEXT NOT NULL DEFAULT '',
                is_self BOOLEAN NOT NULL DEFAULT FALSE,
                num_comments INTEGER NOT NULL DEFAULT 0

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
                post_title TEXT NOT NULL,
                engaged BOOLEAN,
                assignee TEXT NOT NULL DEFAULT ''
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
                (timestamp, formatted_date, title, url, sort_type, relevance_score, subreddit, permalink, engaged, assignee, notes, name, selftext, author, score, thumbnail, is_self, num_comments)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
            )?;

            for result in results {
                stmt.execute(params![
                    result.timestamp,
                    result.formatted_date,
                    result.title,
                    result.url,
                    result.sort_type,
                    result.relevance_score,
                    result.subreddit,
                    result.permalink,
                    result.engaged,
                    result.assignee,
                    result.notes,
                    result.name,
                    result.selftext,
                    result.author,
                    result.score,
                    result.thumbnail,
                    result.is_self,
                    result.num_comments,
                ])?;
            }
        }

        tx.commit()?;
        println!("Added {} results", results.len());
        Ok(())
    }

    pub fn clear_current_search_results() -> RusqliteResult<()> {
        let db = DB::new()?;
        db.conn.execute("DELETE FROM subreddit_search", [])?;
        Ok(())
    }

    pub fn replace_current_results(&mut self, results: &[PostDataWrapper]) -> RusqliteResult<()> {
        let tx = self.conn.transaction()?;

        // First, clear all existing results
        // tx.execute("DELETE FROM subreddit_search", [])?;

        {
            let mut stmt = tx.prepare(
                "INSERT INTO subreddit_search
            (timestamp, formatted_date, title, url, sort_type, relevance_score, subreddit, permalink, engaged, assignee, notes, name, selftext, author, score, thumbnail, is_self, num_comments)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            )?;

            for result in results {
                stmt.execute(params![
                    result.timestamp,
                    result.formatted_date,
                    result.title,
                    result.url,
                    result.sort_type,
                    result.relevance_score,
                    result.subreddit,
                    result.permalink,
                    result.engaged,
                    result.assignee,
                    result.notes,
                    result.name,
                    result.selftext,
                    result.author,
                    result.score,
                    result.thumbnail,
                    result.is_self,
                    result.num_comments
                ])?;
            }
        }

        tx.commit()?;
        println!("Replaced with {} results", results.len());
        Ok(())
    }

    pub fn append_comments(&mut self, comments: &[CommentDataWrapper]) -> RusqliteResult<()> {
        let tx = self.conn.transaction()?;

        {
            let mut stmt = tx.prepare(
                "INSERT OR IGNORE INTO reddit_comments
                (id, post_id, body, author, timestamp, formatted_date, score, permalink, parent_id, subreddit, post_title, engaged, assignee)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
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
                    comment.post_title,
                    comment.engaged,
                    comment.assignee
                ])?;
            }
        }

        tx.commit()?;
        println!("Added {} comments", comments.len());
        Ok(())
    }

    pub fn get_db_results(&self) -> RusqliteResult<Vec<PostDataWrapper>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, timestamp, formatted_date, title, url, sort_type, relevance_score, subreddit, permalink, engaged, assignee, notes, name, selftext, author, thumbnail, is_self, num_comments
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
                    sort_type: row.get(5)?,       // Updated index
                    relevance_score: row.get(6)?, // Updated index
                    subreddit: row.get(7)?,
                    permalink: row.get(8)?,
                    engaged: row.get(9)?,
                    assignee: row.get(10)?,
                    notes: row.get(11)?,
                    name: row.get(12)?,
                    selftext: row.get(13)?,
                    author: row.get(14)?,
                    score: row.get(15)?,
                    thumbnail: row.get(16)?,
                    is_self: row.get(17)?,
                    num_comments: row.get(18)?,
                })
            })?
            .collect::<RusqliteResult<Vec<_>>>()?;

        Ok(posts)
    }

    pub fn get_post_comments(&self, post_id: &str) -> RusqliteResult<Vec<CommentDataWrapper>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, post_id, body, author, timestamp, formatted_date, score, permalink, parent_id, subreddit, post_title, engaged, assignee
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
                    engaged: row.get(11)?,
                    assignee: row.get(12)?,
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

    pub fn update_post_notes(&self, id: i64, notes: &str) -> RusqliteResult<()> {
        self.conn.execute(
            "UPDATE reddit_posts SET notes = ?1 WHERE id = ?2",
            params![notes, id],
        )?;
        Ok(())
    }

    pub fn update_post_assignee(&self, id: i64, assignee: &str) -> RusqliteResult<()> {
        self.conn.execute(
            "UPDATE reddit_posts SET assignee = ?1 WHERE id = ?2",
            params![assignee, id],
        )?;
        Ok(())
    }

    pub fn update_post_engaged_status(&self, id: i64, engaged: i64) -> RusqliteResult<()> {
        self.conn.execute(
            "UPDATE reddit_posts SET engaged = ?1 WHERE id = ?2",
            params![engaged, id],
        )?;
        Ok(())
    }

    pub fn clear_database(&self) -> RusqliteResult<()> {
        self.conn.execute("DELETE FROM reddit_posts", [])?;
        self.conn.execute("DELETE FROM reddit_comments", [])?;
        Ok(())
    }

    // CLEAR JUST THE COMMENTS DATABSE
    pub fn clear_comments_database(&self) -> RusqliteResult<()> {
        self.conn.execute("DELETE FROM reddit_comments", [])?;
        Ok(())
    }
}
