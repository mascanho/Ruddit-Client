use anyhow::Result;
use gemini_rust::Gemini;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fmt;
use std::io::Write;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use crate::exports::excel;
use crate::{database, settings};

// Define GeminiError enum
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
    // Add other fields you expect
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

pub async fn ask_gemini(question: &str) -> Result<Value, GeminiError> {
    // Initialize database connection
    let db = database::adding::DB::new()
        .map_err(|e| GeminiError::DatabaseError(format!("Failed to connect to DB: {}", e)))?;

    // Get data from database
    let reddits = db
        .get_db_results()
        .map_err(|e| GeminiError::DatabaseError(format!("Failed to get DB results: {}", e)))?;

    // Convert data to JSON string
    let json_reddits = serde_json::to_string(&reddits).map_err(|e| {
        GeminiError::DatabaseError(format!("Failed to serialize DB data to JSON: {}", e))
    })?;

    // Get API key from configuration
    let api_key = settings::api_keys::ConfigDirs::read_config()
        .map_err(|e| GeminiError::ConfigError(e.to_string()))?
        .api_keys
        .gemini_api_key;

    let client = Gemini::new(api_key);

    let mut attempts = 0;
    let max_attempts = 2;
    let mut last_error = None;

    while attempts < max_attempts {
        attempts += 1;

        // Create system prompt - more strict on subsequent attempts
        let system_prompt = format!(
            "Given the following data: {}, output the information in the best way possible to answer the questions. Be as thorough as possible and provide URLs when needed.",
            json_reddits
        );

        log::debug!("Attempt {} - System prompt: {}", attempts, system_prompt);

        // SPINNER SECTION
        // Create a flag to uontrol the spinner thread
        let running = Arc::new(AtomicBool::new(true));
        let running_clone = running.clone();

        // Start spinner in a separate thread
        let spinner_handle = thread::spawn(move || {
            let spinner_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            let mut i = 0;

            while running_clone.load(Ordering::Relaxed) {
                print!("\r{} Thinking... ", spinner_chars[i]);
                std::io::stdout().flush().unwrap();

                i = (i + 1) % spinner_chars.len();
                thread::sleep(Duration::from_millis(100));
            }

            // Clear the spinner line when done
            print!("\r{}", " ".repeat(20));
            print!("\r");
            std::io::stdout().flush().unwrap();
        });

        // Make API request
        let response = match client
            .generate_content()
            .with_system_prompt(&system_prompt)
            .with_user_message(question)
            .execute()
            .await
        {
            Ok(r) => r,
            Err(e) => {
                running.store(false, Ordering::Relaxed);
                spinner_handle.join().unwrap();
                last_error = Some(GeminiError::GeminiApiError(format!(
                    "Failed to generate content: {}",
                    e
                )));
                continue;
            }
        };

        // Stop the spinner
        running.store(false, Ordering::Relaxed);
        spinner_handle.join().unwrap();

        let text_response = response.text();
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

        // Try to parse the response
        match serde_json::from_str(json_str) {
            Ok(data) => {
                return Ok(data);
            }
            Err(e) => {
                last_error = Some(GeminiError::JsonParsingError(format!(
                    "Failed to parse JSON from API response: {}. Response was: {}",
                    e, text_response
                )));
            }
        }
    }

    Err(last_error.unwrap_or(GeminiError::GeminiApiError(
        "Unknown error after multiple attempts".to_string(),
    )))
}

// PROMPT GEMINI TO SELECTIVELY GET THE DATA BASED ON CONDITIONS
pub async fn gemini_generate_leads() -> Result<(), GeminiError> {
    let settings = settings::api_keys::ConfigDirs::read_config()
        .map_err(|e| GeminiError::ConfigError(e.to_string()))?;

    let question_vec = settings.api_keys.lead_keywords;
    if question_vec.is_empty() {
        return Err(GeminiError::ConfigError(
            "No lead keywords found in configuration file. Add default Keywords to match with reddit data and export leads".to_string(),
        ));
    }

    // Get each keyword inside the vector and compose a string to pass to the API
    let keywords = question_vec
        .iter()
        .map(|q| q.to_string())
        .collect::<Vec<String>>()
        .join(" OR ");

    println!("Matching Keywords: {}", &keywords);

    // Initialize database connection for both posts and comments
    let db = database::adding::DB::new()
        .map_err(|e| GeminiError::DatabaseError(format!("Failed to connect to DB: {}", e)))?;

    // Get data from database
    let posts = db
        .get_db_results()
        .map_err(|e| GeminiError::DatabaseError(format!("Failed to get posts: {}", e)))?;

    // Get all comments for these posts
    let mut all_comments = Vec::new();
    for post in &posts {
        if let Ok(comments) = db.get_post_comments(&post.id.to_string()) {
            all_comments.extend(comments);
        }
    }

    // Get sentiment requirements
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

    // Initialize database connection
    let db = database::adding::DB::new()
        .map_err(|e| GeminiError::DatabaseError(format!("Failed to connect to DB: {}", e)))?;

    // Get data from database
    let reddits = db
        .get_db_results()
        .map_err(|e| GeminiError::DatabaseError(format!("Failed to get DB results: {}", e)))?;

    // Convert data to JSON string
    let json_reddits = serde_json::to_string(&reddits).map_err(|e| {
        GeminiError::DatabaseError(format!("Failed to serialize DB data to JSON: {}", e))
    })?;

    // Get API key from configuration
    let api_key = settings::api_keys::ConfigDirs::read_config()
        .map_err(|e| GeminiError::ConfigError(e.to_string()))?
        .api_keys
        .gemini_api_key;

    let client = Gemini::new(api_key);

    let mut attempts = 0;
    let max_attempts = 2;
    let mut last_error = None;

    while attempts < max_attempts {
        attempts += 1;

        // Create system prompt - more strict on subsequent attempts

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
        // Create a flag to uontrol the spinner thread
        let running = Arc::new(AtomicBool::new(true));
        let running_clone = running.clone();

        // Start spinner in a separate thread
        let spinner_handle = thread::spawn(move || {
            let spinner_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            let mut i = 0;

            while running_clone.load(Ordering::Relaxed) {
                print!("\r{} Thinking... ", spinner_chars[i]);
                std::io::stdout().flush().unwrap();

                i = (i + 1) % spinner_chars.len();
                thread::sleep(Duration::from_millis(100));
            }

            // Clear the spinner line when done
            print!("\r{}", " ".repeat(20));
            print!("\r");
            std::io::stdout().flush().unwrap();
        });

        // Make API request
        let response = match client
            .generate_content()
            .with_system_prompt(&system_prompt)
            .with_user_message(&question)
            .execute()
            .await
        {
            Ok(r) => r,
            Err(e) => {
                running.store(false, Ordering::Relaxed);
                spinner_handle.join().unwrap();
                last_error = Some(GeminiError::GeminiApiError(format!(
                    "Failed to generate content: {}",
                    e
                )));
                continue;
            }
        };

        // Stop the spinner
        running.store(false, Ordering::Relaxed);
        spinner_handle.join().unwrap();

        let text_response = response.text();
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

        // Try to parse the response to validate it
        match serde_json::from_str::<Value>(json_str) {
            Ok(_) => {
                return Ok(());
            }
            Err(e) => {
                last_error = Some(GeminiError::JsonParsingError(format!(
                    "Failed to parse JSON from API response: {}. Response was: {}",
                    e, text_response
                )));
            }
        }
    }

    Err(last_error.unwrap_or(GeminiError::GeminiApiError(
        "Unknown error after multiple attempts".to_string(),
    )))
}
