use base64::{engine::general_purpose, Engine as _};
use regex::Regex;
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
    name: String,
    author: String,
    score: i64,
    thumbnail: Option<String>,
    is_self: bool,
    num_comments: i64,
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

impl std::fmt::Display for RedditError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RedditError::Reqwest(e) => write!(f, "Network error: {}", e),
            RedditError::TokenExtraction => write!(f, "Failed to extract access token"),
            RedditError::HttpError(code, text) => write!(f, "HTTP Error {}: {}", code, text),
            RedditError::ParseError(msg) => write!(f, "Parse error: {}", msg),
        }
    }
}

impl std::error::Error for RedditError {}

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
    if client_id == "CHANGE_ME" || client_secret == "CHANGE_ME" {
        return Err(RedditError::ParseError("Reddit API credentials not configured. Please update your settings.".to_string()));
    }

    let credentials = format!("{}:{}", client_id.trim(), client_secret.trim());
    let encoded = general_purpose::STANDARD.encode(credentials);

    let client = Client::new();
    let response = client
        .post("https://www.reddit.com/api/v1/access_token")
        .header("Authorization", format!("Basic {}", encoded))
        .header("User-Agent", "FarolApp/0.1 by Farol")
        .form(&[("grant_type", "client_credentials")])
        .send()
        .await?;

    let status = response.status();
    let json: serde_json::Value = response.json().await?;

    if let Some(token) = json["access_token"].as_str() {
        Ok(token.to_string())
    } else {
        eprintln!("Reddit Token Error (HTTP {}): {:?}", status, json);
        Err(RedditError::TokenExtraction)
    }
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
    sort_type: &str, // Renamed from relevance
) -> Result<Vec<PostDataWrapper>, RedditError> {
    let client = Client::new();
    let config = api_keys::ConfigDirs::read_config().unwrap_or_default();

    // Clean the subreddit name - remove "r/" if present
    let subreddit_clean = subreddit.trim_start_matches("r/");

    let url = format!(
        "https://oauth.reddit.com/r/{}/{}?limit=100",
        subreddit_clean,
        sort_type // Use sort_type here
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
                let intent = config
                    .api_keys
                    .calculate_intent(&post.title, post.selftext.as_deref());
                Some(PostDataWrapper {
                    id: i64::from_str_radix(&post.id, 36).unwrap_or(0),
                    title: post.title.clone(),
                    url: post.url.clone(),
                    timestamp: post.created_utc as i64,
                    formatted_date: database::adding::DB::format_timestamp(post.created_utc as i64)
                        .expect("Failed to format timestamp"),
                    sort_type: sort_type.to_string(), // Use sort_type
                    relevance_score: 0, // Default to 0 as no score is available in RedditPost
                    subreddit: post.subreddit.clone(),
                    permalink: format!("https://reddit.com{}", post.permalink),
                    engaged: 0,
                    assignee: "".to_string(),
                    notes: "".to_string(),
                    name: post.name,
                    selftext: post.selftext,
                    author: post.author,
                    score: post.score,
                    thumbnail: post.thumbnail,
                    is_self: post.is_self,
                    num_comments: post.num_comments,
                    intent,
                    date_added: 0,
                })
            } else {
                None
            }
        })
        .collect();

    println!("Processed {} ", subreddit_clean);
    if !posts.is_empty() {
        println!("Post: {:?}", &posts[0]);
    }
    Ok(posts)
}

pub async fn search_subreddit_posts(
    access_token: &str,
    query: &str,
    sort_type: &str, // Renamed from relevance
) -> Result<Vec<PostDataWrapper>, RedditError> {
    let client = Client::new();
    let config = api_keys::ConfigDirs::read_config().unwrap_or_default();

    // Include the sort parameter in the URL

    let url = "https://oauth.reddit.com/search";

    println!("Making request to: {} with q='{}'", url, query); // Debug log

    let response = client
        .get(url)
        .query(&[
            ("q", query),
            ("sort", sort_type),
            ("limit", "100"),
            ("t", "all"),
        ])
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "RustFarolApp/0.1 by Farol")
        .send()
        .await?;

    let listing: RedditListing = response.json().await?;

    // Debug: print how many posts were returned
    println!(
        "API returned {} posts for sort: {}",
        listing.data.children.len(),
        sort_type // Use sort_type here
    );

    let posts: Vec<PostDataWrapper> = listing
        .data
        .children
        .into_iter()
        .filter_map(|child| {
            if let RedditData::Post(post) = &child.data {
                let intent = config
                    .api_keys
                    .calculate_intent(&post.title, post.selftext.as_deref());
                Some(PostDataWrapper {
                    id: i64::from_str_radix(&post.id, 36).unwrap_or(0),
                    title: post.title.clone(),
                    url: post.url.clone(),
                    timestamp: post.created_utc as i64,
                    formatted_date: database::adding::DB::format_timestamp(post.created_utc as i64)
                        .expect("Failed to format timestamp"),
                    sort_type: sort_type.to_string(), // Use sort_type
                    relevance_score: 0, // Default to 0 as no score is available in RedditPost
                    subreddit: post.subreddit.clone(),
                    permalink: format!("https://reddit.com{}", post.permalink.clone()),
                    engaged: 0,
                    assignee: "".to_string(),
                    notes: "".to_string(),
                    name: post.name.clone(),
                    selftext: post.selftext.clone(),
                    author: post.author.clone(),
                    score: post.score.clone(),
                    thumbnail: post.thumbnail.clone(),
                    is_self: post.is_self.clone(),
                    num_comments: post.num_comments.clone(),
                    intent,
                    date_added: 0,
                })
            } else {
                None
            }
        })
        .collect();

    println!("Processed {} posts for sort: {}", posts.len(), sort_type);
    if !posts.is_empty() {
        println!("Post: {:#?}", &posts[0]);
    }
    Ok(posts)
}

#[derive(Debug, Deserialize)]
struct CommentResponse {
    data: CommentResponseData,
}

#[derive(Debug, Deserialize)]
struct CommentResponseData {
    children: Vec<serde_json::Value>,
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
    sort_type: &str, // Renamed from relevance
    subreddit: &str, // Add subreddit here
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
                subreddit: subreddit.to_string(), // Use the passed subreddit
                post_title: "".to_string(),
                engaged: 0,
                assignee: "".to_string(),
            };
            return Ok(vec![error_comment]);
        }
    };

    // Use the passed subreddit directly
    // let subreddit = extract_subreddit_from_url(url).unwrap_or("unknown".to_string());

    let api_url = format!(
        "https://oauth.reddit.com/comments/{}?sort={}&limit=500",
        post_id,
        sort_type // Use sort_type here
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
            return Ok(Vec::new());
        }
        Err(e) => {
            eprintln!("Failed to retrieve access token: {:?}", e);
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

    // Flatten recursive comments
    let mut comments: Vec<CommentDataWrapper> = Vec::new();
    for child_json in comments_data.data.children {
        if let Ok(child) = serde_json::from_value::<CommentChild>(child_json) {
            flatten_comments(child.data, &mut comments, &post_id, subreddit, post_title);
        }
    }

    println!(
        "Successfully fetched and flattened {} comments",
        comments.len()
    );

    // Save to database
    let mut db = database::adding::DB::new().map_err(|e| RedditError::ParseError(e.to_string()))?;
    db.append_comments(&comments)
        .map_err(|e| RedditError::ParseError(e.to_string()))?;

    Ok(comments)
}

fn flatten_comments(
    data: CommentData,
    comments: &mut Vec<CommentDataWrapper>,
    post_id: &str,
    subreddit: &str,
    post_title: &str,
) {
    // Add the current comment
    comments.push(CommentDataWrapper {
        id: data.id.clone(),
        post_id: post_id.to_string(),
        body: data.body,
        author: data.author,
        timestamp: data.created_utc as i64,
        formatted_date: database::adding::DB::format_timestamp(data.created_utc as i64)
            .expect("Failed to format timestamp"),
        score: data.score,
        permalink: data.permalink,
        parent_id: data.parent_id,
        subreddit: subreddit.to_string(),
        post_title: post_title.to_string(),
        engaged: 0,
        assignee: "".to_string(),
    });

    // Check for replies
    if let Some(replies_json) = data.replies.as_object() {
        if let Some(data_val) = replies_json.get("data") {
            if let Some(children) = data_val.get("children").and_then(|c| c.as_array()) {
                for child_json in children {
                    if let Ok(child) = serde_json::from_value::<CommentChild>(child_json.clone()) {
                        // Recursively flatten
                        flatten_comments(child.data, comments, post_id, subreddit, post_title);
                    }
                }
            }
        }
    }
}

fn extract_post_id_from_url(url: &str) -> Option<String> {
    // Regex to capture post ID from various Reddit URL formats
    // 1. /r/{subreddit}/comments/{id}/...
    // 2. /comments/{id}/...
    // 3. /gallery/{id}
    // 4. /r/{subreddit}/s/{id} (shortened URLs)
    let re = Regex::new(
        r"(?:reddit\.com/r/[^/]+/comments/|reddit\.com/comments/|reddit\.com/gallery/|reddit\.com/r/[^/]+/s/|redd\.it/|i\.redd\.it/)([a-zA-Z0-9]+)"
    ).unwrap();

    re.captures(url)
        .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()))
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

pub async fn get_user_access_token(
    client_id: &str,
    client_secret: &str,
    username: &str,
    password: &str,
) -> Result<String, RedditError> {
    if client_id == "CHANGE_ME" || client_secret == "CHANGE_ME" || username.is_empty() || password.is_empty() {
        return Err(RedditError::ParseError("Reddit User credentials not fully configured. Please update your settings.".to_string()));
    }

    let client_id = client_id.trim();
    let client_secret = client_secret.trim();
    let username = username.trim();
    let password = password.trim();

    let credentials = format!("{}:{}", client_id, client_secret);
    let encoded = general_purpose::STANDARD.encode(credentials);

    let client = Client::new();
    let response = client
        .post("https://www.reddit.com/api/v1/access_token")
        .header("Authorization", format!("Basic {}", encoded))
        .header("User-Agent", format!("macos:com.farol.client:v0.1.0 (by /u/{})", username))
        .form(&[
            ("grant_type", "password"),
            ("username", username),
            ("password", password),
        ])
        .send()
        .await?;

    let status = response.status();
    let json: serde_json::Value = response.json().await?;

    if let Some(err) = json["error"].as_str() {
        eprintln!("Reddit User Token Error (HTTP {}): {:?}", status, json);
        if err == "unauthorized_client" {
            return Err(RedditError::HttpError(401, "unauthorized_client: Check that your Reddit App Type is set to 'script' and your Client ID/Secret are correct.".to_string()));
        }
        return Err(RedditError::HttpError(401, err.to_string()));
    }

    if let Some(token) = json["access_token"].as_str() {
        Ok(token.to_string())
    } else {
        eprintln!("Reddit User Token Error (HTTP {}): {:?}", status, json);
        Err(RedditError::TokenExtraction)
    }
}

pub async fn post_comment(
    access_token: &str,
    parent_id: &str,
    text: &str,
) -> Result<(), RedditError> {
    let client = Client::new();
    let response = client
        .post("https://oauth.reddit.com/api/comment")
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "FarolApp/0.1 by Farol")
        .form(&[("thing_id", parent_id), ("text", text), ("api_type", "json")])
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(RedditError::HttpError(
            response.status().as_u16(),
            response.text().await.unwrap_or_default(),
        ));
    }

    let json: serde_json::Value = response.json().await?;
    if let Some(errors) = json["json"]["errors"].as_array() {
        if !errors.is_empty() {
            return Err(RedditError::HttpError(
                400,
                format!("{:?}", errors[0]),
            ));
        }
    }

    Ok(())
}
