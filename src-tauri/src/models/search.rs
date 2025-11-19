use base64::{engine::general_purpose, Engine as _};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::{
    database::{
        self,
        adding::{CommentDataWrapper, PostDataWrapper},
    },
    settings::api_keys::{self, AppConfig},
};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RedditPost {
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
pub enum RedditData {
    Post(RedditPost),
    Comment(RedditComment),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RedditComment {
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
pub struct RedditListingChild {
    data: RedditData,
}

#[derive(Deserialize, Debug, Clone)]
pub struct RedditListing {
    data: RedditListingData,
}

// Define a custom error type for better error handling
#[derive(Debug)]
#[allow(dead_code)]
pub enum RedditError {
    Reqwest(reqwest::Error),
    TokenExtraction,
    HttpError(u16, String), // Add this variant
    ParseError(String),
}

impl From<reqwest::Error> for RedditError {
    fn from(e: reqwest::Error) -> Self {
        RedditError::Reqwest(e)
    }
}

pub struct AppState {
    pub data: Vec<PostDataWrapper>,
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

impl AppState {
    pub fn new() -> Self {
        // Initialize database connection
        let db = database::adding::DB::new()
            .map_err(|_e| RedditError::TokenExtraction)
            .unwrap();

        // Get data from database
        let reddits = db
            .get_db_results()
            .map_err(|_e| RedditError::TokenExtraction)
            .unwrap();

        let vec = reddits;

        Self { data: vec }
    }
}

// Function to get access token from Reddit API
pub async fn get_access_token(
    client_id: String,
    client_secret: String,
) -> Result<String, RedditError> {
    let credentials = format!("{}:{}", client_id, client_secret);
    let encoded = general_purpose::STANDARD.encode(credentials);

    let client = Client::new();
    let response = client
        .post("https://www.reddit.com/api/v1/access_token")
        .header("Authorization", format!("Basic {}", encoded))
        .header("User-Agent", "RudditApp/0.1 by Ruddit")
        .form(&[("grant_type", "client_credentials")])
        .send()
        .await?;

    let json: serde_json::Value = response.json().await?;
    json["access_token"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or(RedditError::TokenExtraction)
}

#[derive(Debug, Deserialize)]
struct SubredditListing {
    data: SubredditData,
}

#[derive(Debug, Deserialize)]
struct SubredditData {
    children: Vec<SubredditChild>,
}

#[derive(Debug, Deserialize)]
struct SubredditChild {
    data: RedditData,
}

// Update your function
pub async fn get_subreddit_posts(
    access_token: &str,
    subreddit: &str,
    relevance: &str,
) -> Result<Vec<PostDataWrapper>, RedditError> {
    let client = Client::new();

    // Clean the subreddit name - remove "r/" if present
    let subreddit_clean = subreddit.trim_start_matches("r/");

    let url = format!(
        "https://oauth.reddit.com/r/{}/{}?limit=100",
        subreddit_clean, relevance
    );

    println!("Fetching from URL: {}", url);

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "RustRedditApp/0.1 by YourUsername")
        .send()
        .await
        .map_err(|e| {
            eprintln!("Request failed: {}", e);
            RedditError::Reqwest(e)
        })?;

    // Check response status
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        eprintln!("HTTP Error {}: {}", status, error_text);
        return Err(RedditError::HttpError(status.as_u16(), error_text));
    }

    let response_text = response.text().await.map_err(RedditError::Reqwest)?;

    // Debug: print the beginning of the response
    println!(
        "Response preview: {}",
        &response_text[..std::cmp::min(500, response_text.len())]
    );

    // Try to parse the response
    let listing: RedditListing = serde_json::from_str(&response_text).map_err(|e| {
        eprintln!("JSON parse error: {}", e);
        eprintln!("Full response: {}", response_text);
        RedditError::ParseError(e.to_string())
    })?;

    let posts: Vec<PostDataWrapper> = listing
        .data
        .children
        .into_iter()
        .filter_map(|child| {
            if let RedditData::Post(post) = child.data {
                Some(PostDataWrapper {
                    id: post.id.parse().unwrap_or(0),
                    title: post.title.clone(),
                    url: post.url.clone(),
                    timestamp: post.created_utc as i64,
                    formatted_date: database::adding::DB::format_timestamp(post.created_utc as i64)
                        .expect("Failed to format timestamp"),
                    relevance: relevance.to_string(),
                    subreddit: post.subreddit.clone(),
                    permalink: format!("https://reddit.com{}", post.permalink),
                    engaged: false,
                    assignee: "".to_string(),
                    notes: "".to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    println!("Processed {} ", subreddit_clean);
    Ok(posts)
}

pub async fn search_subreddit_posts(
    access_token: &str,
    query: &str,
    relevance: &str, // This should be "hot", "top", or "new"
) -> Result<Vec<PostDataWrapper>, RedditError> {
    let client = Client::new();

    // Include the sort parameter in the URL
    let url = format!(
        "https://oauth.reddit.com/search?q={}&sort={}&limit=100&t=all",
        query, relevance
    );

    println!("Making request to: {}", url); // Debug log

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "RustRedditApp/0.1 by YourUsername")
        .send()
        .await?;

    let listing: RedditListing = response.json().await?;

    // Debug: print how many posts were returned
    println!(
        "API returned {} posts for sort: {}",
        listing.data.children.len(),
        relevance
    );

    let posts: Vec<PostDataWrapper> = listing
        .data
        .children
        .into_iter()
        .filter_map(|child| {
            if let RedditData::Post(post) = &child.data {
                Some(PostDataWrapper {
                    id: post.id.parse().unwrap_or(0),
                    title: post.title.clone(),
                    url: post.url.clone(),
                    timestamp: post.created_utc as i64,
                    formatted_date: database::adding::DB::format_timestamp(post.created_utc as i64)
                        .expect("Failed to format timestamp"),
                    relevance: relevance.to_string(), // Store which sort type found this
                    subreddit: post.subreddit.clone(),
                    permalink: format!("https://reddit.com{}", post.permalink.clone()),
                    engaged: false,
                    assignee: "".to_string(),
                    notes: "".to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    println!("Processed {} posts for sort: {}", posts.len(), relevance);
    Ok(posts)
}

#[derive(Debug, Deserialize)]
struct CommentResponse {
    data: CommentResponseData,
}

#[derive(Debug, Deserialize)]
struct CommentResponseData {
    children: Vec<CommentChild>,
}

#[derive(Debug, Deserialize)]
struct CommentChild {
    data: CommentData,
}

#[derive(Debug, Deserialize)]
pub struct CommentData {
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

// handle post comment fetch
pub async fn get_post_comments(
    url: &str,
    post_title: &str,
    relevance: &str,
) -> Result<Vec<CommentDataWrapper>, RedditError> {
    let client = Client::new();

    // Extract post ID and handle the None case properly
    let post_id = match extract_post_id_from_url(url) {
        Some(id) => id,
        None => {
            eprintln!("Failed to extract post ID from URL: {}", url);
            // Create a single error comment if you want to indicate failure
            let error_comment = CommentDataWrapper {
                id: "error".to_string(),
                post_id: "error".to_string(),
                body: "Failed to extract post ID from URL".to_string(),
                author: "system".to_string(),
                timestamp: 0,
                formatted_date: "1970-01-01 00:00:00".to_string(),
                score: 0,
                permalink: "".to_string(),
                parent_id: "".to_string(),
                subreddit: "".to_string(),
                post_title: "".to_string(),
                engaged: false,
                assignee: "".to_string(),
            };
            return Ok(vec![error_comment]);
        }
    };

    // Extract subreddit
    let subreddit = extract_subreddit_from_url(url).unwrap_or("unknown".to_string());

    let api_url = format!(
        "https://oauth.reddit.com/comments/{}?sort={}&limit=500",
        post_id, relevance
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
            return Ok(Vec::new());
        }
        Err(e) => {
            eprintln!("Failed to retrieve access token: {:?}", e);
            api_keys::ConfigDirs::edit_config_file().unwrap();
            return Ok(Vec::new());
        }
    };

    println!("Fetching comments from URL: {}", api_url);

    let response = client
        .get(&api_url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "RustRedditApp/0.1 by YourUsername")
        .send()
        .await
        .map_err(RedditError::Reqwest)?;

    // Check response status
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        eprintln!("HTTP Error {}: {}", status, error_text);
        return Err(RedditError::HttpError(status.as_u16(), error_text));
    }

    // The Reddit comments endpoint returns an array with two elements:
    // [0] = post data, [1] = comments data
    let response_data: Vec<serde_json::Value> =
        response.json().await.map_err(RedditError::Reqwest)?;

    if response_data.len() < 2 {
        println!(
            "Warning: Unexpected response format - expected 2 listings, got {}",
            response_data.len()
        );
        return Ok(Vec::new());
    }

    // Parse the comments from the second element
    let comments_data: CommentResponse =
        serde_json::from_value(response_data[1].clone()).map_err(|e| {
            eprintln!("Failed to parse comments: {}", e);
            RedditError::ParseError(e.to_string())
        })?;

    // Convert to CommentDataWrapper
    let comments: Vec<CommentDataWrapper> = comments_data
        .data
        .children
        .into_iter()
        .map(|child| {
            let data = child.data;
            CommentDataWrapper {
                id: data.id,
                post_id: post_id.to_string(),
                body: data.body,
                author: data.author,
                timestamp: data.created_utc as i64,
                formatted_date: database::adding::DB::format_timestamp(data.created_utc as i64)
                    .expect("Failed to format timestamp"),
                score: data.score,
                permalink: data.permalink,
                parent_id: data.parent_id,
                subreddit: subreddit.clone(),
                post_title: post_title.to_string(),
                engaged: false,
                assignee: "".to_string(),
            }
        })
        .collect();

    println!("Successfully fetched {} comments", comments.len());

    // Save to database
    let mut db = database::adding::DB::new().unwrap();
    db.append_comments(&comments).unwrap();

    Ok(comments)
}
fn extract_post_id_from_url(url: &str) -> Option<String> {
    let parts: Vec<&str> = url.split("/comments/").collect();
    if parts.len() > 1 {
        let post_part = parts[1];
        let post_id = post_part.split('/').next().unwrap_or("");
        if !post_id.is_empty() {
            return Some(post_id.to_string());
        }
    }
    None
}

fn extract_subreddit_from_url(url: &str) -> Option<String> {
    let parts: Vec<&str> = url.split("/r/").collect();
    if parts.len() > 1 {
        let subreddit_part = parts[1];
        let subreddit = subreddit_part.split('/').next().unwrap_or("");
        if !subreddit.is_empty() {
            return Some(subreddit.to_string());
        }
    }
    None
}
