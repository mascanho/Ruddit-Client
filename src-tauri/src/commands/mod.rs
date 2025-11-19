
use crate::database::adding::{CommentDataWrapper, PostDataWrapper};
use crate::database::read::DBReader;
use crate::models::search::{self, get_access_token, get_subreddit_posts, search_subreddit_posts};
use crate::settings::api_keys;
use crate::settings::api_keys::AppConfig;
use crate::{actions, database};

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

// REMOVE A SINGLE ENTRY FROM THE TABLE
#[tauri::command]
pub fn remove_single_reddit_command(post: i64) -> Result<(), String> {
    let db = database::adding::DB::new().unwrap();
    db.remove_single_reddit(&post).unwrap();
    Ok(())
}

// FETCH THE COMMENTS FOR A POST THAT GETS ADDED
#[tauri::command]
pub async fn get_post_comments_command(
    url: String,
    title: String,
    relevance: String,
) -> Result<Vec<CommentDataWrapper>, String> {
    let results = search::get_post_comments(&url, &title, &relevance)
        .await
        .unwrap();

    Ok(results)
}

// GET ALL THE COMMMENTS THAT EXIST IN THE DATABASE
#[tauri::command]
pub fn get_all_comments_command() -> Result<Vec<CommentDataWrapper>, String> {
    let reader = DBReader::new();
    reader.get_all_comments().map_err(|e| e.to_string())
}

// CLEAR THE COMMENTS TABLE
#[tauri::command]
pub fn clear_comments_command() -> Result<String, String> {
    let db = database::adding::DB::new().unwrap();
    db.clear_comments_database().unwrap();
    Ok("Cleared comments".to_string())
}

// Open the settings file with native editor
#[tauri::command]
pub fn open_settings_commmand() -> Result<(), String> {
    api_keys::ConfigDirs::edit_config_file().unwrap();
    Ok(())
}

// Open the DB folder
#[tauri::command]
pub async fn open_db_folder_command() -> Result<(), String> {
    actions::open_folder::open_db_folder().await.unwrap();
    Ok(())
}
