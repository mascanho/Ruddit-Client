use anyhow::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fmt;
use std::io::Write;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use crate::{database, settings};
use crate::exports::excel;
use crate::database::read::DBReader;
use crate::settings::api_keys::ApiKeys; // Import ApiKeys for command descriptions
use directories::BaseDirs;
#[derive(Debug)]
pub enum GeminiError {
    DatabaseError(String),
    ConfigError(String),
    GeminiApiError(String),
    JsonParsingError(String),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiResponse {
    answer: String,
    url: Option<String>,
}

// Implement Display for GeminiError
impl fmt::Display for GeminiError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            GeminiError::DatabaseError(e) => write!(f, "Database error: {}", e),
            GeminiError::ConfigError(e) => write!(f, "Configuration error: {}", e),
            GeminiError::GeminiApiError(e) => write!(f, "Gemini API error: {}", e),
            GeminiError::JsonParsingError(e) => write!(f, "JSON parsing error: {}", e),
        }
    }
}

// Implement Error trait for GeminiError
impl std::error::Error for GeminiError {}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiModel {
    name: String,
    #[serde(rename = "displayName")]
    display_name: String,
    #[serde(rename = "supportedGenerationMethods")]
    supported_generation_methods: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ListModelsResponse {
    models: Vec<GeminiModel>,
}

pub async fn get_available_models(api_key: &str) -> Result<Vec<String>, GeminiError> {
    let client = Client::new();
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models?key={}", api_key);

    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| GeminiError::GeminiApiError(format!("Failed to fetch models: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(GeminiError::GeminiApiError(format!("API Error: {}", error_text)));
    }

    let list_response: ListModelsResponse = response.json()
        .await
        .map_err(|e| GeminiError::JsonParsingError(format!("Failed to parse models list: {}", e)))?;

    let models = list_response.models.into_iter()
        .filter(|m| m.supported_generation_methods.contains(&"generateContent".to_string()))
        .map(|m| m.name.replace("models/", ""))
        .collect();

    Ok(models)
}

pub async fn read_application_log() -> Result<String, GeminiError> {
    let base_dirs = BaseDirs::new().ok_or(GeminiError::ConfigError(
        "Failed to get base directories for log file".to_string(),
    ))?;
    let app_dir = base_dirs.data_dir().join("ruddit");
    let log_path = app_dir.join("app.log");

    if !log_path.exists() {
        return Ok("Application log file not found.".to_string());
    }

    // Read the last N lines of the log file to avoid reading huge files
    // For simplicity, let's read the whole file for now, but this should be optimized for production.
    std::fs::read_to_string(&log_path)
        .map_err(|e| GeminiError::ConfigError(format!("Failed to read log file: {}", e)))
}

// Struct to represent a command for the AI
#[derive(Debug, Serialize, Deserialize)]
pub struct CommandInfo {
    pub name: String,
    pub description: String,
    pub parameters: Vec<CommandParameter>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandParameter {
    pub name: String,
    pub r#type: String, // 'type' is a reserved keyword, so use r#type
    pub description: String,
}

pub async fn get_available_commands() -> Vec<CommandInfo> {
    vec![
        CommandInfo {
            name: "get_reddit_results".to_string(),
            description: "Fetches Reddit posts based on a query and a list of sort types (e.g., 'hot', 'new', 'top').".to_string(),
            parameters: vec![
                CommandParameter { name: "sortTypes".to_string(), r#type: "Vec<String>".to_string(), description: "A list of sort types (e.g., ['hot', 'new', 'top'])".to_string() },
                CommandParameter { name: "query".to_string(), r#type: "String".to_string(), description: "The search query or subreddit (e.g., 'rust' or 'r/rust')".to_string() },
            ],
        },
        CommandInfo {
            name: "get_recent_posts".to_string(),
            description: "Retrieves a limited number of the most recent posts from the database.".to_string(),
            parameters: vec![
                CommandParameter { name: "limit".to_string(), r#type: "i64".to_string(), description: "The maximum number of recent posts to retrieve.".to_string() },
            ],
        },
        CommandInfo {
            name: "get_posts_by_sort_type".to_string(),
            description: "Retrieves posts from the database filtered by a specific sort type.".to_string(),
            parameters: vec![
                CommandParameter { name: "sort_type".to_string(), r#type: "String".to_string(), description: "The sort type to filter by (e.g., 'hot', 'new', 'top').".to_string() },
            ],
        },
        CommandInfo {
            name: "search_posts".to_string(),
            description: "Performs a text search across post titles, subreddits, and sort types in the database.".to_string(),
            parameters: vec![
                CommandParameter { name: "search_term".to_string(), r#type: "String".to_string(), description: "The term to search for.".to_string() },
            ],
        },
        CommandInfo {
            name: "get_posts_by_subreddit".to_string(),
            description: "Retrieves posts from a specific subreddit in the database.".to_string(),
            parameters: vec![
                CommandParameter { name: "subreddit".to_string(), r#type: "String".to_string(), description: "The name of the subreddit (e.g., 'rust').".to_string() },
            ],
        },
        CommandInfo {
            name: "get_all_posts".to_string(),
            description: "Retrieves all posts currently stored in the database.".to_string(),
            parameters: vec![],
        },
        CommandInfo {
            name: "get_all_searched_posts".to_string(),
            description: "Retrieves all posts that were part of the last subreddit search from the database.".to_string(),
            parameters: vec![],
        },
        CommandInfo {
            name: "get_post_comments_command".to_string(),
            description: "Fetches comments for a specific Reddit post.".to_string(),
            parameters: vec![
                CommandParameter { name: "url".to_string(), r#type: "String".to_string(), description: "The URL of the Reddit post.".to_string() },
                CommandParameter { name: "title".to_string(), r#type: "String".to_string(), description: "The title of the Reddit post.".to_string() },
                CommandParameter { name: "sort_type".to_string(), r#type: "String".to_string(), description: "The sort type of the post (e.g., 'hot', 'new').".to_string() },
                CommandParameter { name: "subreddit".to_string(), r#type: "String".to_string(), description: "The subreddit the post belongs to.".to_string() },
            ],
        },
        CommandInfo {
            name: "get_all_comments_command".to_string(),
            description: "Retrieves all comments currently stored in the database.".to_string(),
            parameters: vec![],
        },
        CommandInfo {
            name: "get_reddit_config_command".to_string(),
            description: "Retrieves the current Reddit API configuration settings.".to_string(),
            parameters: vec![],
        },
        CommandInfo {
            name: "get_gemini_models_command".to_string(),
            description: "Retrieves a list of available Gemini AI models.".to_string(),
            parameters: vec![
                CommandParameter { name: "api_key".to_string(), r#type: "String".to_string(), description: "The API key for the Gemini service.".to_string() },
            ],
        },
        CommandInfo {
            name: "save_single_reddit_command".to_string(),
            description: "Saves a single Reddit post to the database.".to_string(),
            parameters: vec![
                CommandParameter { name: "post".to_string(), r#type: "PostDataWrapper".to_string(), description: "The PostDataWrapper object representing the post to save.".to_string() },
            ],
        },
        CommandInfo {
            name: "clear_saved_reddits".to_string(),
            description: "Clears all saved Reddit posts from the database.".to_string(),
            parameters: vec![],
        },
        CommandInfo {
            name: "remove_single_reddit_command".to_string(),
            description: "Removes a single Reddit post from the database by its ID.".to_string(),
            parameters: vec![
                CommandParameter { name: "post".to_string(), r#type: "i64".to_string(), description: "The ID of the post to remove.".to_string() },
            ],
        },
        CommandInfo {
            name: "clear_comments_command".to_string(),
            description: "Clears all comments from the database.".to_string(),
            parameters: vec![],
        },
        CommandInfo {
            name: "open_settings_commmand".to_string(),
            description: "Opens the application's settings file in the default editor.".to_string(),
            parameters: vec![],
        },
        CommandInfo {
            name: "open_db_folder_command".to_string(),
            description: "Opens the folder where the application's database is stored.".to_string(),
            parameters: vec![],
        },
        CommandInfo {
            name: "update_post_notes".to_string(),
            description: "Updates the notes for a specific post in the database.".to_string(),
            parameters: vec![
                CommandParameter { name: "id".to_string(), r#type: "i64".to_string(), description: "The ID of the post to update.".to_string() },
                CommandParameter { name: "notes".to_string(), r#type: "String".to_string(), description: "The new notes content.".to_string() },
            ],
        },
        CommandInfo {
            name: "update_post_assignee".to_string(),
            description: "Updates the assignee for a specific post and sends an email notification.".to_string(),
            parameters: vec![
                CommandParameter { name: "id".to_string(), r#type: "i64".to_string(), description: "The ID of the post to update.".to_string() },
                CommandParameter { name: "assignee".to_string(), r#type: "String".to_string(), description: "The name or email of the new assignee.".to_string() },
                CommandParameter { name: "title".to_string(), r#type: "String".to_string(), description: "The title of the post for the email notification.".to_string() },
            ],
        },
        CommandInfo {
            name: "update_post_engaged_status".to_string(),
            description: "Updates the engagement status for a specific post.".to_string(),
            parameters: vec![
                CommandParameter { name: "id".to_string(), r#type: "i64".to_string(), description: "The ID of the post to update.".to_string() },
                CommandParameter { name: "engaged".to_string(), r#type: "i64".to_string(), description: "The new engagement status (e.g., 0 for not engaged, 1 for engaged).".to_string() },
            ],
        },
        CommandInfo {
            name: "update_reddit_config_command".to_string(),
            description: "Updates the Reddit API configuration settings.".to_string(),
            parameters: vec![
                CommandParameter { name: "new_api_keys".to_string(), r#type: "ApiKeys".to_string(), description: "The new ApiKeys object containing updated Reddit API credentials.".to_string() },
            ],
        },
        CommandInfo {
            name: "submit_reddit_comment_command".to_string(),
            description: "Submits a comment to a Reddit post.".to_string(),
            parameters: vec![
                CommandParameter { name: "parent_id".to_string(), r#type: "String".to_string(), description: "The ID of the parent post or comment.".to_string() },
                CommandParameter { name: "text".to_string(), r#type: "String".to_string(), description: "The content of the comment.".to_string() },
            ],
        },
        CommandInfo {
            name: "ask_gemini_command".to_string(),
            description: "Invokes the Gemini AI with a given question.".to_string(),
            parameters: vec![
                CommandParameter { name: "question".to_string(), r#type: "String".to_string(), description: "The question to ask the Gemini AI.".to_string() },
            ],
        },
    ]
}

pub async fn get_all_application_data() -> Result<Value, GeminiError> {
    let db_reader = DBReader::new();

    let all_posts = db_reader.get_all_posts()
        .map_err(|e| GeminiError::DatabaseError(format!("Failed to get all posts: {}", e)))?;
    let all_comments = db_reader.get_all_comments()
        .map_err(|e| GeminiError::DatabaseError(format!("Failed to get all comments: {}", e)))?;
    let all_searched_posts = db_reader.get_all_searched_posts()
        .map_err(|e| GeminiError::DatabaseError(format!("Failed to get all searched posts: {}", e)))?;

    let application_log = read_application_log().await?;
    let available_commands = get_available_commands().await;

    let combined_data = json!({
        "all_posts": all_posts,
        "all_comments": all_comments,
        "all_searched_posts": all_searched_posts,
        "application_log": application_log,
        "available_commands": available_commands,
        // Add other data sources here as they are integrated
    });

    Ok(combined_data)
}

pub async fn ask_gemini(question: &str) -> Result<Value, GeminiError> {
    // Get all application data
    let all_app_data = get_all_application_data().await?;

    // Convert data to JSON string
    let json_all_app_data = serde_json::to_string(&all_app_data).map_err(|e| {
        GeminiError::DatabaseError(format!("Failed to serialize all application data to JSON: {}", e))
    })?;

    // Get API key from configuration
    let config = settings::api_keys::ConfigDirs::read_config()
        .map_err(|e| GeminiError::ConfigError(e.to_string()))?;
    let api_key = config.api_keys.gemini_api_key;
    let model = config.api_keys.gemini_model;

    let client = Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );

    let mut attempts = 0;
    let max_attempts = 2;
    let mut last_error = None;

    while attempts < max_attempts {
        attempts += 1;

        // Create system prompt
        let system_prompt = format!(
            "Given the following application data: {}, output the information in the best way possible to answer the questions. Be as thorough as possible and provide URLs when needed.",
            json_all_app_data
        );

        log::debug!("Attempt {} - System prompt: {}", attempts, system_prompt);

        // SPINNER SECTION
        let running = Arc::new(AtomicBool::new(true));
        let running_clone = running.clone();

        let spinner_handle = thread::spawn(move || {
            let spinner_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            let mut i = 0;
            while running_clone.load(Ordering::Relaxed) {
                print!("\r{} Thinking... ", spinner_chars[i]);
                std::io::stdout().flush().unwrap();
                i = (i + 1) % spinner_chars.len();
                thread::sleep(Duration::from_millis(100));
            }
            print!("\r{}", " ".repeat(20));
            print!("\r");
            std::io::stdout().flush().unwrap();
        });

        // Make API request
        // We combine system prompt and question into one message for simplicity and compatibility
        let combined_text = format!("{}\n\nUser Question: {}", system_prompt, question);
        let request_body = json!({
            "contents": [{
                "parts": [{"text": combined_text}]
            }]
        });

        let response = client.post(&url)
            .json(&request_body)
            .send()
            .await;

        // Stop the spinner
        running.store(false, Ordering::Relaxed);
        let _ = spinner_handle.join();

        match response {
            Ok(resp) => {
                if !resp.status().is_success() {
                     let error_text = resp.text().await.unwrap_or_default();
                     last_error = Some(GeminiError::GeminiApiError(format!("API Error: {}", error_text)));
                     continue;
                }

                let response_json: Value = match resp.json().await {
                    Ok(v) => v,
                    Err(e) => {
                        last_error = Some(GeminiError::JsonParsingError(format!("Failed to parse API response: {}", e)));
                        continue;
                    }
                };

                // Extract text from Gemini response structure
                let text_response = response_json["candidates"][0]["content"]["parts"][0]["text"]
                    .as_str()
                    .unwrap_or("")
                    .to_string();

                log::debug!("Raw Gemini API response: {}", text_response);
                let trimmed_response = text_response.trim();

                // Try to extract JSON from markdown code blocks if present
                let json_str = if trimmed_response.starts_with("```json") {
                    trimmed_response
                        .trim_start_matches("```json")
                        .trim_end_matches("```")
                        .trim()
                } else if trimmed_response.starts_with("```") {
                    trimmed_response
                        .trim_start_matches("```")
                        .trim_end_matches("```")
                        .trim()
                } else {
                    trimmed_response
                };

                log::debug!("Processed JSON string: {}", json_str);

                match serde_json::from_str(json_str) {
                    Ok(data) => return Ok(data),
                    Err(_) => {
                        // If it's not JSON, treat it as a plain text answer
                        // The prompt doesn't strictly enforce JSON, so this is expected for general questions
                        return Ok(json!({ "answer": text_response }));
                    }
                }
            }
            Err(e) => {
                last_error = Some(GeminiError::GeminiApiError(format!("Failed to send request: {}", e)));
            }
        }
    }

    Err(last_error.unwrap_or(GeminiError::GeminiApiError(
        "Unknown error after multiple attempts".to_string(),
    )))
}

pub async fn gemini_generate_leads() -> Result<(), GeminiError> {
    let settings = settings::api_keys::ConfigDirs::read_config()
        .map_err(|e| GeminiError::ConfigError(e.to_string()))?;

    let question_vec = settings.api_keys.lead_keywords;
    if question_vec.is_empty() {
        return Err(GeminiError::ConfigError(
            "No lead keywords found in configuration file. Add default Keywords to match with reddit data and export leads".to_string(),
        ));
    }

    let keywords = question_vec.join(" OR ");
    println!("Matching Keywords: {}", &keywords);

    let db = database::adding::DB::new()
        .map_err(|e| GeminiError::DatabaseError(format!("Failed to connect to DB: {}", e)))?;

    let posts = db.get_db_results()
        .map_err(|e| GeminiError::DatabaseError(format!("Failed to get posts: {}", e)))?;

    let mut all_comments = Vec::new();
    for post in &posts {
        if let Ok(comments) = db.get_post_comments(&post.id.to_string()) {
            all_comments.extend(comments);
        }
    }

    let sentiments = settings.api_keys.sentiment.join(" OR ");
    let match_type = settings.api_keys.match_keyword.to_lowercase();
    let match_operator = if match_type == "and" { "AND" } else { "OR" };

    let question = format!(
        "Analyze the following posts and their comments, and return ONLY those that match these criteria:
        1. Keywords ({}) must be found in the post's title OR in the comments, using {} matching.
        2. The post's sentiment OR the overall sentiment of its comments should match one of: {}.
        3. Return ONLY posts that are likely to be leads or business opportunities for inventory management.

        For each matching post, format the result as a JSON object with these fields:
        - title: the post title
        - url: the post URL
        - formatted_date: the post date
        - relevance: HIGH if it's a strong lead, MEDIUM if potential, LOW if uncertain
        - subreddit: the subreddit name
        - sentiment: the detected sentiment of the post
        - top_comments: an array of up to 3 most relevant comments that match the criteria
        - comment_sentiment: the overall sentiment of the matching comments
        ",
        keywords, match_operator, sentiments
    );

    let db = database::adding::DB::new()
        .map_err(|e| GeminiError::DatabaseError(format!("Failed to connect to DB: {}", e)))?;

    let reddits = db.get_db_results()
        .map_err(|e| GeminiError::DatabaseError(format!("Failed to get DB results: {}", e)))?;

    let json_reddits = serde_json::to_string(&reddits).map_err(|e| {
        GeminiError::DatabaseError(format!("Failed to serialize DB data to JSON: {}", e))
    })?;

    let api_key = settings.api_keys.gemini_api_key;
    let model = settings.api_keys.gemini_model;

    let client = Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );

    let mut attempts = 0;
    let max_attempts = 2;
    let mut last_error = None;

    while attempts < max_attempts {
        attempts += 1;

        let system_prompt = if attempts > 1 {
            format!(
                "You are a lead generation AI. Analyze the following data strictly: {}\n\n        REQUIREMENTS:\n        1. Return ONLY a valid JSON array of objects\n        2. Each object MUST have these fields:\n           - formatted_date: post date (YYYY-MM-DD)\n           - title: exact post title\n           - url: full post URL\n           - relevance: HIGH, MEDIUM, or LOW based on lead quality\n           - subreddit: subreddit name\n           - sentiment: detected sentiment (positive, negative, neutral)\n           - engagement_score: HIGH/MEDIUM/LOW\n\n        Follow these rules:\n        - Use proper JSON format with double quotes\n        - No text outside the JSON\n        - No markdown code blocks\n        - ONLY include posts matching the query criteria",
                json_reddits
            )
        } else {
            let combined_data = serde_json::json!({
                "posts": reddits,
                "comments": all_comments
            });

            format!(
                "You are a lead generation AI analyzing posts and comments. Analyze this data: {}\n\n                STRICT OUTPUT REQUIREMENTS:\n                1. Return ONLY a valid JSON array of objects\n                2. Each object MUST have:\n                   - formatted_date: post date (YYYY-MM-DD)\n                   - title: exact post title\n                   - url: full post URL\n                   - relevance: HIGH/MEDIUM/LOW for lead quality\n                   - subreddit: subreddit name\n                   - sentiment: detected sentiment\n                   - top_comments: array of up to 3 most relevant comments, each with 'author', 'text', and 'sentiment' fields.\n                   - comment_sentiment: overall comment sentiment\n                   - engagement_score: HIGH/MEDIUM/LOW based on interaction\n
                NO text outside JSON. NO markdown blocks.",
                serde_json::to_string(&combined_data).unwrap_or_default()
            )
        };

        log::debug!("Attempt {} - System prompt: {}", attempts, system_prompt);

        // SPINNER SECTION
        let running = Arc::new(AtomicBool::new(true));
        let running_clone = running.clone();

        let spinner_handle = thread::spawn(move || {
            let spinner_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            let mut i = 0;
            while running_clone.load(Ordering::Relaxed) {
                print!("\r{} Thinking... ", spinner_chars[i]);
                std::io::stdout().flush().unwrap();
                i = (i + 1) % spinner_chars.len();
                thread::sleep(Duration::from_millis(100));
            }
            print!("\r{}", " ".repeat(20));
            print!("\r");
            std::io::stdout().flush().unwrap();
        });

        let combined_text = format!("{}\n\n{}", system_prompt, question);
        let request_body = json!({
            "contents": [{
                "parts": [{"text": combined_text}]
            }]
        });

        let response = client.post(&url)
            .json(&request_body)
            .send()
            .await;

        // Stop the spinner
        running.store(false, Ordering::Relaxed);
        let _ = spinner_handle.join();

        match response {
            Ok(resp) => {
                if !resp.status().is_success() {
                     let error_text = resp.text().await.unwrap_or_default();
                     last_error = Some(GeminiError::GeminiApiError(format!("API Error: {}", error_text)));
                     continue;
                }

                let response_json: Value = match resp.json().await {
                    Ok(v) => v,
                    Err(e) => {
                        last_error = Some(GeminiError::JsonParsingError(format!("Failed to parse API response: {}", e)));
                        continue;
                    }
                };

                // Extract text from Gemini response structure
                let text_response = response_json["candidates"][0]["content"]["parts"][0]["text"]
                    .as_str()
                    .unwrap_or("")
                    .to_string();

                log::debug!("Raw Gemini API response: {}", text_response);
                let trimmed_response = text_response.trim();

                // Try to extract JSON from markdown code blocks if present
                let json_str = if trimmed_response.starts_with("```json") {
                    trimmed_response
                        .trim_start_matches("```json")
                        .trim_end_matches("```")
                        .trim()
                } else if trimmed_response.starts_with("```") {
                    trimmed_response
                        .trim_start_matches("```")
                        .trim_end_matches("```")
                        .trim()
                } else {
                    trimmed_response
                };

                log::debug!("Processed JSON string: {}", json_str);

                excel::export_gemini_to_excel(json_str).expect("Failed to export gemini leads to excel");

                match serde_json::from_str::<Value>(json_str) {
                    Ok(_) => return Ok(()),
                    Err(e) => {
                        last_error = Some(GeminiError::JsonParsingError(format!(
                            "Failed to parse JSON from API response: {}. Response was: {}",
                            e, text_response
                        )));
                    }
                }
            }
            Err(e) => {
                last_error = Some(GeminiError::GeminiApiError(format!("Failed to send request: {}", e)));
            }
        }
    }

    Err(last_error.unwrap_or(GeminiError::GeminiApiError(
        "Unknown error after multiple attempts".to_string(),
    )))
}
