use serde::{Deserialize, Serialize};

use crate::database;
use crate::database::adding::PostDataWrapper;
use crate::database::read::DBReader;
use crate::models::search::{get_access_token, get_subreddit_posts, search_subreddit_posts};
use crate::settings::api_keys;
use crate::settings::api_keys::AppConfig;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct RedditPost {
    id: String,
    title: String,
    url: String,
    created_utc: f64,
    subreddit: String,
    permalink: String,
    selftext: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(untagged)]
enum RedditData {
    Post(RedditPost),
    Comment(RedditComment),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct RedditComment {
    id: String,
    body: String,
    author: String,
    created_utc: f64,
    score: i32,
    permalink: String,
    parent_id: String,
    #[serde(default)]
    replies: serde_json::Value,
}

#[derive(Deserialize, Debug, Clone)]
struct RedditListingData {
    children: Vec<RedditListingChild>,
}

#[derive(Deserialize, Debug, Clone)]
struct RedditListingChild {
    data: RedditData,
}

#[derive(Deserialize, Debug, Clone)]
struct RedditListing {
    data: RedditListingData,
}

// Define a custom error type for better error handling
#[derive(Debug)]
#[allow(dead_code)]
enum RedditError {
    Reqwest(reqwest::Error),
    TokenExtraction,
}

impl From<reqwest::Error> for RedditError {
    fn from(e: reqwest::Error) -> Self {
        RedditError::Reqwest(e)
    }
}

#[tauri::command]
pub async fn get_reddit_results(relevance: Vec<String>, query: String) -> Result<String, String> {
    println!(
        "Querying Reddit for: '{}' with sorts: {:?}",
        query, relevance
    );

    // Read config
    let config = api_keys::ConfigDirs::read_config().unwrap_or_else(|err| {
        eprintln!("Warning: using default config because: {err}");
        AppConfig::default()
    });

    let api_keys = config.api_keys;
    let client_id = api_keys.reddit_api_id;
    let client_secret = api_keys.reddit_api_secret;

    // Get token
    let token = match get_access_token(client_id, client_secret).await {
        Ok(t) if !t.is_empty() => t,
        Ok(_) => {
            eprintln!("Empty access token received");
            api_keys::ConfigDirs::edit_config_file().unwrap();
            return Ok("config_updated".into());
        }
        Err(e) => {
            eprintln!("Failed to retrieve access token: {:?}", e);
            api_keys::ConfigDirs::edit_config_file().unwrap();
            return Ok("config_updated".into());
        }
    };

    // HANDLE DB CREATION
    let mut db = database::adding::DB::new().unwrap();
    db.create_tables().unwrap();
    db.create_current_search_tables().unwrap();
    database::adding::DB::clear_current_search_results().unwrap();

    let mut total_posts_added = 0;

    // Query Reddit for each sort type - ONE REQUEST PER SORT TYPE
    for sort_type in relevance {
        println!("Querying with sort type: {}", sort_type);

        // Make ONE request for this sort type
        // if query contains "r/" then it's a subreddit search
        if query.starts_with("r/") {
            let result = get_subreddit_posts(&token, &query, &sort_type).await;
            match result {
                Ok(posts) => {
                    println!("Found {} posts for sort type: {}", posts.len(), sort_type);
                    // Append to database
                    match db.replace_current_results(&posts) {
                        Ok(_) => {
                            total_posts_added += posts.len();
                            println!(
                                "Successfully added {} posts to database for sort type: {}",
                                posts.len(),
                                sort_type
                            );
                        }
                        Err(e) => {
                            eprintln!("Failed to save {} posts to database: {}", posts.len(), e);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Failed to fetch {} posts: {:?}", sort_type, e);
                    continue;
                }
            };
            continue;
        }

        let result = search_subreddit_posts(&token, &query, &sort_type).await;

        match result {
            Ok(posts) => {
                println!("Found {} posts for sort type: {}", posts.len(), sort_type);

                // Append to database
                match db.replace_current_results(&posts) {
                    Ok(_) => {
                        total_posts_added += posts.len();
                        println!(
                            "Successfully added {} posts to database for sort type: {}",
                            posts.len(),
                            sort_type
                        );
                    }
                    Err(e) => {
                        eprintln!("Failed to save {} posts to database: {}", posts.len(), e);
                    }
                }
            }
            Err(e) => {
                eprintln!("Failed to fetch {} posts: {:?}", sort_type, e);
                continue;
            }
        };
    }

    println!("Total posts added to database: {}", total_posts_added);
    Ok(format!("Added {} posts to database", total_posts_added))
}

#[tauri::command]
pub fn get_recent_posts(limit: i64) -> Result<Vec<PostDataWrapper>, String> {
    let reader = DBReader::new();
    reader.get_recent_posts(limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_posts_by_relevance(relevance: String) -> Result<Vec<PostDataWrapper>, String> {
    let reader = DBReader::new();
    reader
        .get_posts_by_relevance_type(&relevance)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_posts(search_term: String) -> Result<Vec<PostDataWrapper>, String> {
    let reader = DBReader::new();
    reader.search_posts(&search_term).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_posts_by_subreddit(subreddit: String) -> Result<Vec<PostDataWrapper>, String> {
    let reader = DBReader::new();
    reader
        .get_posts_by_subreddit(&subreddit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_posts() -> Result<Vec<PostDataWrapper>, String> {
    let reader = DBReader::new();
    reader.get_all_posts().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_searched_posts() -> Result<Vec<PostDataWrapper>, String> {
    let reader = DBReader::new();
    reader.get_all_searched_posts().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_single_reddit_command(post: PostDataWrapper) -> Result<PostDataWrapper, String> {
    let db = database::adding::DB::new().unwrap();

    db.save_single_reddit(&post).unwrap();
    Ok(post)
}

// CLEAR SAVED REDDITS TABLE
#[tauri::command]
pub fn clear_saved_reddits() -> Result<String, String> {
    let db = database::adding::DB::new().unwrap();
    db.clear_database().unwrap();
    Ok("Cleared saved reddits".to_string())
}
