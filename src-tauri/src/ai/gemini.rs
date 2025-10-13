use anyhow::{Context, Result as AnyResult};
use gemini_rust::{Content, Gemini, Message};
use log::debug;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fmt;

use crate::exports::excel;
use crate::{database, settings};

// Define GeminiError enum
#[derive(Debug)]
pub enum GeminiError {
    DatabaseError(String),
    ConfigError(String),
    GeminiApiError(String),
    JsonParsingError(String),
    ClientCreationError(String),
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
            GeminiError::ClientCreationError(e) => write!(f, "Client creation error: {}", e),
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
        .GEMINI_API_KEY;

    let client = Gemini::new(&api_key).map_err(|e| {
        GeminiError::ClientCreationError(format!("Failed to create Gemini client: {}", e))
    })?;

    let mut attempts = 0;
    let max_attempts = 2;
    let mut last_error = None;

    while attempts < max_attempts {
        attempts += 1;

        // Create system prompt - more strict on subsequent attempts
        let system_prompt = if attempts > 1 {
            format!(
                "Given the following data: {}, output the information in the best way possible to answer the questions. Be as thorough as possible and provide URLs when needed.",
                json_reddits
            )
        } else {
            format!(
                "Given the following data: {}, output the information in the best way possible to answer the questions. Be as thorough as possible and provide URLs when needed.",
                json_reddits
            )
        };

        log::debug!("Attempt {} - System prompt: {}", attempts, system_prompt);

        // GUI-FRIENDLY: Remove spinner and use logging instead
        log::info!("Thinking... (Attempt {})", attempts);

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
                last_error = Some(GeminiError::GeminiApiError(format!(
                    "Failed to generate content: {}",
                    e
                )));
                continue;
            }
        };

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

    let question_vec = settings.api_keys.LEAD_KEYWORDS;
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

    log::info!("Matching Keywords: {}", &keywords);

    let question = format!(
        "given the keyword(s) {}, find relevant leads where the keywords are found in the title only.  ",
        keywords
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
        .GEMINI_API_KEY;

    let client = Gemini::new(&api_key).map_err(|e| {
        GeminiError::ClientCreationError(format!("Failed to create Gemini client: {}", e))
    })?;

    let mut attempts = 0;
    let max_attempts = 2;
    let mut last_error = None;

    while attempts < max_attempts {
        attempts += 1;

        // Create system prompt - more strict on subsequent attempts
        let system_prompt = if attempts > 1 {
            format!(
        "Given the following data: {}. You are a structured data generator. \
        Your ONLY response should be a VALID JSON array of objects. Each object should contain 'formatted_date', 'title', 'url', 'relevance' and 'subreddit' keys. \
        The JSON must be properly formatted with double quotes for property names and strings. \
        Do NOT include any other text, explanations, or conversational phrases outside the JSON. \
        Do NOT wrap the JSON in markdown code blocks. Output ONLY the raw JSON. \
        Example of acceptable response: [{{\"formatted_date\": \"2024-08-18\", \"title\": \"Looking for a new CRM\", \"url\": \"https://example.com\", \"relevance\": \"High\", \"subreddit\": \"r/sales\"}}] \
        json_reddits",
        json_reddits
    )
        } else {
            format!(
        "Given the following data: {}. You are a structured data generator. \
        Your ONLY response should be a JSON array of objects. Each object should contain 'formatted_date', 'title', 'url', 'relevance' and 'subreddit' keys. \
        Do not include any other text, explanations, or conversational phrases. \
        Example of acceptable response: [{{\"formatted_date\": \"2024-08-18\", \"title\": \"Looking for a new CRM\", \"url\": \"https://example.com\", \"relevance\": \"High\", \"subreddit\": \"r/sales\"}}] \
        json_reddits",
        json_reddits
    )
        };

        log::debug!("Attempt {} - System prompt: {}", attempts, system_prompt);

        // GUI-FRIENDLY: Remove spinner and use logging instead
        log::info!("Generating leads... (Attempt {})", attempts);

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
                last_error = Some(GeminiError::GeminiApiError(format!(
                    "Failed to generate content: {}",
                    e
                )));
                continue;
            }
        };

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
