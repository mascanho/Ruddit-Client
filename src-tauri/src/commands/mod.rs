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
pub async fn get_reddit_results(
    sortTypes: Vec<String>, // Changed parameter name
    query: String,
) -> Result<Vec<PostDataWrapper>, String> {
    // Changed return type
    println!(
        "Querying Reddit for: '{}' with sortTypes: {:?}",
        query, sortTypes
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
            return Err("config_updated".into()); // Return error to indicate config update needed
        }
        Err(e) => {
            eprintln!("Failed to retrieve access token: {:?}", e);
            api_keys::ConfigDirs::edit_config_file().unwrap();
            return Err("config_updated".into()); // Return error to indicate config update needed
        }
    };

    // Clear the current search results ONCE before populating with new filtered results
    database::adding::DB::clear_current_search_results().unwrap();

    let mut unique_posts_map: std::collections::HashMap<i64, PostDataWrapper> =
        std::collections::HashMap::new();

    // Query Reddit for each sort type - ONE REQUEST PER SORT TYPE
    for sort_type in sortTypes {
        // Use sortTypes here
        println!("Querying with sort type: {}", sort_type);

        let posts_for_this_sort: Vec<PostDataWrapper>;

        // if query contains "r/" then it's a subreddit search
        if query.starts_with("r/") {
            let result = get_subreddit_posts(&token, &query, &sort_type).await;
            match result {
                Ok(posts) => {
                    println!("Found {} posts for sort type: {}", posts.len(), sort_type);
                    posts_for_this_sort = posts;
                }
                Err(e) => {
                    eprintln!("Failed to fetch {} posts: {:?}", sort_type, e);
                    continue;
                }
            };
        } else {
            let result = search_subreddit_posts(&token, &query, &sort_type).await;
            match result {
                Ok(posts) => {
                    println!("Found {} posts for sort type: {}", posts.len(), sort_type);
                    posts_for_this_sort = posts;
                }
                Err(e) => {
                    eprintln!("Failed to fetch {} posts: {:?}", sort_type, e);
                    continue;
                }
            };
        }

        // Merge logic
        for mut post in posts_for_this_sort {
            match unique_posts_map.get_mut(&post.id) {
                Some(existing_post) => {
                    // Append sort_type if not already present
                    // We check purely string containment for simplicity given "hot", "new", "top" don't overlap as substrings
                    if !existing_post.sort_type.contains(&sort_type) {
                        existing_post.sort_type =
                            format!("{},{}", existing_post.sort_type, sort_type);
                    }
                }
                None => {
                    // Ensure the sort_type for the new post is set correctly
                    post.sort_type = sort_type.clone();
                    unique_posts_map.insert(post.id, post);
                }
            }
        }
    }

    let all_fetched_posts: Vec<PostDataWrapper> = unique_posts_map.into_values().collect();

    // HANDLE DB CREATION
    let mut db = database::adding::DB::new().unwrap();

    if !all_fetched_posts.is_empty() {
        // Save to subreddit_search table so it persists for the view
        match db.replace_current_results(&all_fetched_posts) {
            Ok(_) => {
                println!(
                    "Successfully added {} merged unique posts to subreddit_search database",
                    all_fetched_posts.len()
                );
            }
            Err(e) => {
                eprintln!("Failed to save posts to database: {}", e);
            }
        }
    }

    println!("Total posts added to database: {}", all_fetched_posts.len());
    Ok(all_fetched_posts) // Return the fetched posts
}

#[tauri::command]
pub fn get_recent_posts(limit: i64) -> Result<Vec<PostDataWrapper>, String> {
    let reader = DBReader::new();
    reader.get_recent_posts(limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_posts_by_sort_type(sort_type: String) -> Result<Vec<PostDataWrapper>, String> {
    // Renamed
    let reader = DBReader::new();
    reader
        .get_posts_by_sort_type(&sort_type) // Updated call
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
    sort_type: String, // Renamed from relevance
    subreddit: String,
) -> Result<Vec<CommentDataWrapper>, String> {
    let results = search::get_post_comments(&url, &title, &sort_type, &subreddit)
        .await
        .map_err(|e| e.to_string())?;

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

#[tauri::command]
pub fn update_post_notes(id: i64, notes: String) -> Result<(), String> {
    let db = database::adding::DB::new().map_err(|e| e.to_string())?;
    db.update_post_notes(id, &notes)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_post_assignee(id: i64, assignee: String, title: String) -> Result<(), String> {
    let db = database::adding::DB::new().map_err(|e| e.to_string())?;
    db.update_post_assignee(id, &assignee)
        .map_err(|e| e.to_string())?;

    if !assignee.is_empty() {
        // Send email in background or await it
        // Since this is async command now, we can await it.
        // We log errors but don't fail the command based on email failure
        // to avoid reverting the UI for just a notification failure.
        match crate::email::sending::send_assignment_email(&assignee, id, &title).await {
            Ok(_) => println!("Email notification sent for post {}", id),
            Err(e) => eprintln!("Failed to send email notif: {:?}", e),
        }
    }

    Ok(())
}

#[tauri::command]
pub fn update_post_engaged_status(id: i64, engaged: i64) -> Result<(), String> {
    let db = database::adding::DB::new().map_err(|e| e.to_string())?;
    db.update_post_engaged_status(id, engaged)
        .map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
pub fn get_reddit_config_command() -> Result<api_keys::ApiKeys, String> {
    let config = api_keys::ConfigDirs::read_config().map_err(|e| e.to_string())?;
    Ok(config.api_keys)
}

#[tauri::command]
pub fn update_reddit_config_command(new_api_keys: api_keys::ApiKeys) -> Result<(), String> {
    let mut config = api_keys::ConfigDirs::read_config().map_err(|e| e.to_string())?;
    config.api_keys = new_api_keys;
    api_keys::ConfigDirs::save_config(&config).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn submit_reddit_comment_command(
    parent_id: String,
    text: String,
) -> Result<(), String> {
    let config = api_keys::ConfigDirs::read_config().map_err(|e| e.to_string())?;
    let api_keys = config.api_keys;

    let token = search::get_user_access_token(
        &api_keys.reddit_api_id,
        &api_keys.reddit_api_secret,
        &api_keys.reddit_username,
        &api_keys.reddit_password,
    )
    .await
    .map_err(|e| e.to_string())?;

    search::post_comment(&token, &parent_id, &text)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
#[tauri::command]
pub async fn ask_gemini_command(question: String) -> Result<String, String> {
    let response = crate::ai::gemini::ask_gemini(&question)
        .await
        .map_err(|e| e.to_string())?;
    
    // Extract the answer from the JSON response if possible, otherwise return the whole JSON string
    if let Some(answer) = response.get("answer").and_then(|v| v.as_str()) {
        Ok(answer.to_string())
    } else {
        // If "answer" field is missing, return the whole JSON
        Ok(response.to_string())
    }
}
