use crate::database::adding::{CommentDataWrapper, PostDataWrapper, DB};
use rusqlite::Result as RusqliteResult;

pub struct DBReader;

impl DBReader {
    pub fn new() -> Self {
        DBReader
    }

    pub fn get_posts_by_relevance(&self) -> RusqliteResult<Vec<(String, i64)>> {
        let db = DB::new()?;
        let mut stmt = db
            .conn
            .prepare("SELECT sort_type, COUNT(*) FROM reddit_posts GROUP BY sort_type")?;

        let relevance_counts = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })?;

        relevance_counts.collect()
    }

    // ADD THIS FUNCTION - Gets ALL posts from the database
    pub fn get_all_posts(&self) -> RusqliteResult<Vec<PostDataWrapper>> {
        let db = DB::new()?;
        let mut stmt = db.conn.prepare(
            "SELECT id, timestamp, formatted_date, title, url, sort_type, relevance_score, subreddit, permalink, engaged, assignee, notes, name, selftext, author, score, thumbnail, is_self, num_comments, intent, date_added, interest
         FROM reddit_posts
         ORDER BY timestamp DESC",
        )?;

        let posts = stmt.query_map([], |row| {
            Ok(PostDataWrapper {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                formatted_date: row.get(2)?,
                title: row.get(3)?,
                url: row.get(4)?,
                sort_type: row.get(5)?,
                relevance_score: row.get(6)?,
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
                intent: row.get(19)?,
                date_added: row.get(20)?,
                interest: row.get(21)?,
            })
        })?;

        posts.collect()
    }

    // GET JUST THE SEARCHED SUBREDDITS
    pub fn get_all_searched_posts(&self) -> RusqliteResult<Vec<PostDataWrapper>> {
        let db = DB::new()?;
        let mut stmt = db.conn.prepare(
            "SELECT id, timestamp, formatted_date, title, url, sort_type, relevance_score, subreddit, permalink, engaged, assignee, notes, name, selftext, author, score, thumbnail, is_self, num_comments, intent, date_added, interest
         FROM subreddit_search
         ORDER BY timestamp DESC",
        )?;

        let posts = stmt.query_map([], |row| {
            Ok(PostDataWrapper {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                formatted_date: row.get(2)?,
                title: row.get(3)?,
                url: row.get(4)?,
                sort_type: row.get(5)?,
                relevance_score: row.get(6)?,
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
                intent: row.get(19)?,
                date_added: row.get(20)?,
                interest: row.get(21)?,
            })
        })?;

        posts.collect()
    }

    pub fn get_recent_posts(&self, limit: i64) -> RusqliteResult<Vec<PostDataWrapper>> {
        let db = DB::new()?;
        let mut stmt = db.conn.prepare(
            "SELECT id, timestamp, formatted_date, title, url, sort_type, relevance_score, subreddit, permalink, engaged, assignee, notes, name, selftext, author, score, thumbnail, is_self, num_comments, intent, date_added, interest
         FROM reddit_posts
         ORDER BY timestamp DESC
         LIMIT ?1",
        )?;

        let posts = stmt.query_map([limit], |row| {
            Ok(PostDataWrapper {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                formatted_date: row.get(2)?,
                title: row.get(3)?,
                url: row.get(4)?,
                sort_type: row.get(5)?,
                relevance_score: row.get(6)?,
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
                intent: row.get(19)?,
                date_added: row.get(20)?,
                interest: row.get(21)?,
            })
        })?;

        posts.collect()
    }

    pub fn get_posts_by_subreddit(&self, subreddit: &str) -> RusqliteResult<Vec<PostDataWrapper>> {
        let db = DB::new()?;
        let mut stmt = db.conn.prepare(
            "SELECT id, timestamp, formatted_date, title, url, sort_type, relevance_score, subreddit, permalink, engaged, assignee, notes, name, selftext, author, score, thumbnail, is_self, num_comments, intent, date_added, interest
         FROM reddit_posts
         WHERE subreddit = ?1
         ORDER BY timestamp DESC",
        )?;

        let posts = stmt.query_map([subreddit], |row| {
            Ok(PostDataWrapper {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                formatted_date: row.get(2)?,
                title: row.get(3)?,
                url: row.get(4)?,
                sort_type: row.get(5)?,
                relevance_score: row.get(6)?,
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
                intent: row.get(19)?,
                date_added: row.get(20)?,
                interest: row.get(21)?,
            })
        })?;

        posts.collect()
    }

    pub fn get_posts_by_sort_type(&self, sort_type: &str) -> RusqliteResult<Vec<PostDataWrapper>> {
        let db = DB::new()?;
        let mut stmt = db.conn.prepare(
            "SELECT id, timestamp, formatted_date, title, url, sort_type, relevance_score, subreddit, permalink, engaged, assignee, notes, name, selftext, author, score, thumbnail, is_self, num_comments, intent, date_added, interest
         FROM reddit_posts
         WHERE sort_type = ?1
         ORDER BY timestamp DESC",
        )?;

        let posts = stmt.query_map([sort_type], |row| {
            Ok(PostDataWrapper {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                formatted_date: row.get(2)?,
                title: row.get(3)?,
                url: row.get(4)?,
                sort_type: row.get(5)?,
                relevance_score: row.get(6)?,
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
                intent: row.get(19)?,
                date_added: row.get(20)?,
                interest: row.get(21)?,
            })
        })?;

        posts.collect()
    }

    pub fn search_posts(&self, search_term: &str) -> RusqliteResult<Vec<PostDataWrapper>> {
        let db = DB::new()?;
        let mut stmt = db.conn.prepare(
            "SELECT id, timestamp, formatted_date, title, url, sort_type, relevance_score, subreddit, permalink, engaged, assignee, notes, name, selftext, author, score, thumbnail, is_self, num_comments, intent, date_added, interest
         FROM reddit_posts
         WHERE title LIKE ?1 OR subreddit LIKE ?1 OR sort_type LIKE ?1
         ORDER BY timestamp DESC",
        )?;

        let search_pattern = format!("%{}%", search_term);
        let posts = stmt.query_map([search_pattern], |row| {
            Ok(PostDataWrapper {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                formatted_date: row.get(2)?,
                title: row.get(3)?,
                url: row.get(4)?,
                sort_type: row.get(5)?,
                relevance_score: row.get(6)?,
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
                intent: row.get(19)?,
                date_added: row.get(20)?,
                interest: row.get(21)?,
            })
        })?;

        posts.collect()
    }

    pub fn get_post_comments(&self, post_id: &str) -> RusqliteResult<Vec<CommentDataWrapper>> {
        let db = DB::new()?;
        db.get_post_comments(post_id)
    }

    pub fn display_recent_posts(&self, limit: i64) -> RusqliteResult<()> {
        let posts = self.get_recent_posts(limit)?;

        println!("=== MOST RECENT {} POSTS ===", limit);
        for (i, post) in posts.iter().enumerate() {
            println!(
                "{}. [{}] {} - r/{}",
                i + 1,
                post.sort_type,
                post.title,
                post.subreddit
            );
            println!("   URL: {}", post.url);
            println!("   Date: {}", post.formatted_date);
            println!();
        }

        Ok(())
    }

    // You might also want to add a function to display all posts for debugging
    pub fn display_all_posts(&self) -> RusqliteResult<()> {
        let posts = self.get_all_posts()?;

        println!("=== ALL POSTS IN DATABASE ({} total) ===", posts.len());
        for (i, post) in posts.iter().enumerate() {
            println!(
                "{}. [{}] {} - r/{}",
                i + 1,
                post.sort_type,
                post.title,
                post.subreddit
            );
            println!("   URL: {}", post.url);
            println!("   Date: {}", post.formatted_date);
            println!();
        }

        Ok(())
    }

    // GET ALL COMMENTS
    pub fn get_all_comments(&self) -> RusqliteResult<Vec<CommentDataWrapper>> {
        let db = DB::new()?;
        let mut stmt = db.conn.prepare(
        "SELECT id, post_id, body, author, timestamp, formatted_date, score, permalink, parent_id, subreddit, post_title, engaged, assignee
         FROM reddit_comments
         ORDER BY timestamp DESC",
    )?;

        let comments = stmt.query_map([], |row| {
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
        })?;

        comments.collect()
    }
}
