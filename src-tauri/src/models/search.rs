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
    pub id: String,
    pub title: String,
    pub url: String,
    pub created_utc: f64,
    pub subreddit: String,
    pub permalink: String,
    pub selftext: Option<String>,
    pub name: String,
    pub author: String,
    pub score: i64,
    pub thumbnail: Option<String>,
    pub is_self: bool,
    pub num_comments: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(untagged)]
pub enum RedditData {
    Post(RedditPost),
    Comment(RedditComment),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RedditComment {
    pub id: String,
    pub body: String,
    pub author: String,
    pub created_utc: f64,
    pub score: i32,
    pub permalink: String,
    pub parent_id: String,
    #[serde(default)]
    pub replies: serde_json::Value,
    // Search result fields
    pub subreddit: Option<String>,
    pub link_title: Option<String>,
    pub link_url: Option<String>,
    pub link_id: Option<String>,
    pub link_author: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
struct RedditListingData {
    pub children: Vec<RedditListingChild>,
    pub after: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct RedditListingChild {
    pub data: RedditData,
}

#[derive(Deserialize, Debug, Clone)]
pub struct RedditListing {
    pub data: RedditListingData,
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

pub async fn get_valid_token(
    client_id: &str,
    client_secret: &str,
) -> Result<String, RedditError> {
    // Read config to check for cached token
    let config = api_keys::ConfigDirs::read_config().unwrap_or_default();
    let current_time = chrono::Utc::now().timestamp();
    
    if !config.api_keys.reddit_access_token.is_empty() && config.api_keys.reddit_access_token_expires_at > current_time + 60 {
        return Ok(config.api_keys.reddit_access_token);
    }

    println!("Reddit access token expired or missing. Requesting new token...");
    match get_access_token(client_id.to_string(), client_secret.to_string()).await {
        Ok((token, expires_in)) => {
            let mut new_config = api_keys::ConfigDirs::read_config().unwrap_or_default();
            new_config.api_keys.reddit_access_token = token.clone();
            new_config.api_keys.reddit_access_token_expires_at = current_time + expires_in;
            let _ = api_keys::ConfigDirs::save_config(&new_config);
            Ok(token)
        }
        Err(e) => Err(e),
    }
}

impl From<&str> for RedditError {
    fn from(s: &str) -> Self {
        RedditError::ParseError(s.to_string())
    }
}

impl From<String> for RedditError {
    fn from(s: String) -> Self {
        RedditError::ParseError(s)
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
) -> Result<(String, i64), RedditError> {
    if client_id == "CHANGE_ME" || client_secret == "CHANGE_ME" {
        let missing = if client_id == "CHANGE_ME" && client_secret == "CHANGE_ME" {
            "Client ID and Secret"
        } else if client_id == "CHANGE_ME" {
            "Client ID"
        } else {
            "Client Secret"
        };
        return Err(RedditError::ParseError(format!("Reddit API {} not configured. Please update your settings.", missing)));
    }

    let credentials = format!("{}:{}", client_id.trim(), client_secret.trim());
    let encoded = general_purpose::STANDARD.encode(credentials);

    let client = Client::new();
    let response = client
        .post("https://www.reddit.com/api/v1/access_token")
        .header("Authorization", format!("Basic {}", encoded))
        .header("User-Agent", "AtalaiaApp/0.1 by Atalaia")
        .form(&[("grant_type", "client_credentials")])
        .send()
        .await?;

    let status = response.status();
    let json: serde_json::Value = response.json().await?;

    if let Some(token) = json["access_token"].as_str() {
        let expires_in = json["expires_in"].as_i64().unwrap_or(3600);
        println!("Reddit Access Token retrieved successfully. Expires in {}s", expires_in);
        Ok((token.to_string(), expires_in))
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
    sort_type: &str,
    after: Option<&str>,
) -> Result<Vec<PostDataWrapper>, RedditError> {
    let client = Client::new();
    let config = api_keys::ConfigDirs::read_config().unwrap_or_default();

    // Clean the subreddit name - remove "r/" if present
    let subreddit_clean = subreddit.trim_start_matches("r/");

    let url = format!(
        "https://oauth.reddit.com/r/{}/{}?limit=100{}",
        subreddit_clean,
        sort_type,
        if let Some(after) = after { format!("&after={}", after) } else { "".to_string() }
    );

    println!("Fetching from URL: {}", url);

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "Atalaia/0.1.0 (by /u/Atalaia)")
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
                    interest: 0,
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
    sort_type: &str,
) -> Result<Vec<PostDataWrapper>, RedditError> {
    search_reddit(access_token, query, sort_type, None, None).await
}

pub async fn search_reddit_posts_paginated(
    access_token: &str,
    query: &str,
    sort_type: &str,
    after: Option<&str>,
) -> Result<(Vec<PostDataWrapper>, Option<String>), RedditError> {
    search_reddit_paginated(access_token, query, sort_type, None, after).await
}

pub async fn search_reddit(
    access_token: &str,
    query: &str,
    sort_type: &str,
    subreddit: Option<&str>,
    after: Option<&str>,
) -> Result<Vec<PostDataWrapper>, RedditError> {
    let (posts, _) = search_reddit_paginated(access_token, query, sort_type, subreddit, after).await?;
    Ok(posts)
}

pub async fn search_reddit_paginated(
    access_token: &str,
    query: &str,
    sort_type: &str,
    subreddit: Option<&str>,
    after: Option<&str>,
) -> Result<(Vec<PostDataWrapper>, Option<String>), RedditError> {
    let client = Client::new();
    let config = api_keys::ConfigDirs::read_config().unwrap_or_default();

    let url = match subreddit {
        Some(sub) => format!(
            "https://oauth.reddit.com/r/{}/search",
            sub.trim_start_matches("r/")
        ),
        None => "https://oauth.reddit.com/search".to_string(),
    };

    println!(
        "Making search request to: {} with q='{}' type=link,comment",
        url, query
    );

    let response = client
        .get(&url)
        .query(&[
            ("q", query),
            ("sort", sort_type),
            ("limit", "100"),
            ("t", "all"),
            ("type", "link,comment"),
            ("restrict_sr", if subreddit.is_some() { "1" } else { "0" }),
            ("after", after.unwrap_or("")),
        ])
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "Atalaia/0.1.0 (by /u/Atalaia)")
        .send()
        .await?;

    let listing: RedditListing = response.json().await?;

    let after_token = listing.data.after;

    let posts: Vec<PostDataWrapper> = listing
        .data
        .children
        .into_iter()
        .filter_map(|child| match child.data {
            RedditData::Post(post) => {
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
                    sort_type: sort_type.to_string(),
                    relevance_score: 0,
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
                    interest: 0,
                })
            }
            RedditData::Comment(comment) => {
                let full_body = comment.body.clone();
                let intent = config.api_keys.calculate_intent(
                    &comment.link_title.clone().unwrap_or_default(),
                    Some(&full_body),
                );

                Some(PostDataWrapper {
                    id: i64::from_str_radix(&comment.id, 36).unwrap_or(0),
                    title: format!(
                        "Comment on: {}",
                        comment.link_title.unwrap_or_else(|| "Reddit Post".to_string())
                    ),
                    url: comment
                        .link_url
                        .unwrap_or_else(|| format!("https://reddit.com{}", comment.permalink)),
                    timestamp: comment.created_utc as i64,
                    formatted_date: database::adding::DB::format_timestamp(
                        comment.created_utc as i64,
                    )
                    .expect("Failed to format timestamp"),
                    sort_type: sort_type.to_string(),
                    relevance_score: 0,
                    subreddit: comment.subreddit.unwrap_or_default(),
                    permalink: format!("https://reddit.com{}", comment.permalink),
                    engaged: 0,
                    assignee: "".to_string(),
                    notes: "".to_string(),
                    name: format!("t1_{}", comment.id),
                    selftext: Some(full_body),
                    author: comment.author.clone(),
                    score: comment.score as i64,
                    thumbnail: None,
                    is_self: true,
                    num_comments: 0,
                    intent,
                    date_added: 0,
                    interest: 0,
                })
            }
        })
        .collect();

    println!("Processed {} items from search", posts.len());
    Ok((posts, after_token))
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
    sort_type: &str,
    subreddit: &str,
    fullname: Option<String>,
) -> Result<Vec<CommentDataWrapper>, RedditError> {
    let client = Client::new();

    // Try to get post ID from fullname first (t3_id)
    let post_id = if let Some(fn_str) = fullname {
        if fn_str.starts_with("t3_") {
            Some(fn_str[3..].to_string())
        } else {
            None
        }
    } else {
        None
    };

    // Fallback to URL extraction if fullname was missing or invalid
    let post_id = match post_id {
        Some(id) => id,
        None => match extract_post_id_from_url(url) {
            Some(id) => id,
            None => {
                eprintln!("Failed to extract post ID from URL: {}", url);
                return Err("Signal Extraction Failure: Could not identify a valid Reddit post ID in the provided source.".into());
            }
        },
    };

    // Clean the subreddit name
    let subreddit_clean = subreddit.trim_start_matches("r/");

    // Construct the canonical Reddit API URL for comments
    // Using global /comments/{id} endpoint is often more reliable than subreddit-specific ones,
    // especially for user profile posts or cross-posts.
    let is_user_sub = subreddit_clean.to_lowercase().starts_with("u_") || subreddit_clean.to_lowercase().starts_with("u/");
    
    let api_url = if !subreddit_clean.is_empty() && subreddit_clean != "unknown" && subreddit_clean != "N/A" && !is_user_sub {
        format!(
            "https://oauth.reddit.com/r/{}/comments/{}?sort={}&limit=500",
            subreddit_clean,
            post_id,
            sort_type.replace("q&a", "qa")
        )
    } else {
        format!(
            "https://oauth.reddit.com/comments/{}?sort={}&limit=500",
            post_id,
            sort_type.replace("q&a", "qa")
        )
    };

    println!("Fetching comments from canonical URL: {}", api_url);

    // Read config
    let config = api_keys::ConfigDirs::read_config().unwrap_or_else(|err| {
        eprintln!("Warning: using default config because: {err}");
        AppConfig::default()
    });

    let api_keys = config.api_keys;
    let client_id = api_keys.reddit_api_id;
    let client_secret = api_keys.reddit_api_secret;

    // Get token
    let token = match get_valid_token(&client_id, &client_secret).await {
        Ok(t) => t,
        Err(e) => {
            return Err(format!("Network Protocol Error: Failed to secure access token: {}", e).into());
        }
    };

    println!("Fetching comments from URL: {}", api_url);

    let response = client
        .get(&api_url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "Atalaia/0.1.0 (by /u/Atalaia)")
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
    // Domain-agnostic regex to capture Reddit IDs
    // Looks for /comments/{id}, /gallery/{id}, /s/{id}, or redd.it/{id}
    let re = Regex::new(
        r"(?:comments|gallery|s|redd\.it)/([a-zA-Z0-9]+)"
    ).unwrap();

    let caps = re.captures(url)?;
    
    // Capture group 1
    caps.get(1).map(|m| m.as_str().to_string())
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
        .header("User-Agent", format!("macos:com.atalaia.client:v0.1.0 (by /u/{})", username))
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
) -> Result<CommentDataWrapper, RedditError> {
    let client = Client::new();
    let response = client
        .post("https://oauth.reddit.com/api/comment")
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "AtalaiaApp/0.1 by Atalaia")
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
    
    // Check for errors in the reddit response
    if let Some(errors) = json["json"]["errors"].as_array() {
        if !errors.is_empty() {
            return Err(RedditError::HttpError(
                400,
                format!("{:?}", errors[0]),
            ));
        }
    }

    // Extract the comment data
    // json.json.data.things[0].data
    if let Some(things) = json["json"]["data"]["things"].as_array() {
        if let Some(thing) = things.first() {
             if let Some(data) = thing.get("data") {
                 let comment_data: CommentData = serde_json::from_value(data.clone()).map_err(|e| RedditError::ParseError(e.to_string()))?;
                 
                 // Convert to CommentDataWrapper
                 let wrapper = CommentDataWrapper {
                    id: comment_data.id,
                    post_id: "".to_string(), // Not returned directly, but we don't strictly need it for UI display initially
                    body: comment_data.body,
                    author: comment_data.author,
                    timestamp: comment_data.created_utc as i64,
                    formatted_date: database::adding::DB::format_timestamp(comment_data.created_utc as i64).unwrap_or_default(),
                    score: comment_data.score,
                    permalink: comment_data.permalink,
                    parent_id: comment_data.parent_id,
                    subreddit: "".to_string(), // can optionally fill if we knew it
                    post_title: "".to_string(),
                    engaged: 0,
                    assignee: "".to_string(),
                 };
                 return Ok(wrapper);
             }
        }
    }

    Err(RedditError::ParseError("Failed to extract comment data from response".to_string()))
}
