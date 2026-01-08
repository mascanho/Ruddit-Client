use tokio::io::{AsyncReadExt, AsyncWriteExt};
use reqwest::Client;
use serde::Deserialize;
use base64::{engine::general_purpose, Engine as _};
use crate::settings::api_keys::{self, ConfigDirs};

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    token_type: String,
    expires_in: i64,
    refresh_token: Option<String>,
    scope: String,
}

pub async fn start_auth_flow(client_id: String, client_secret: String) -> Result<String, String> {
    println!("Starting auth flow...");
    let client_id = client_id.trim().to_string();
    let client_secret = client_secret.trim().to_string();

    if client_id == "CHANGE_ME" || client_secret == "CHANGE_ME" {
        return Err("Client ID and Secret must be configured first.".to_string());
    }

    let port = 8989;
    let redirect_uri = format!("http://localhost:{}", port);
    println!("--- REDDIT AUTH CONFIG ---");
    println!("Expected Redirect URI: {}", redirect_uri);
    println!("Ensure this EXACT URL is set in your Reddit App Preferences.");
    println!("--------------------------");

    let state = "random_state_string"; // In prod, generate random string
    let scope = "identity read submit privatemessages history"; // Add other scopes as needed

    // 1. Start Listener
    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port))
        .await
        .map_err(|e| format!("Failed to bind to port {}: {}. Is an auth flow already running?", port, e))?;

    // 2. Open Browser
    let encoded_redirect = urlencoding::encode(&redirect_uri);
    let encoded_scope = urlencoding::encode(scope);
    let auth_url = format!(
        "https://www.reddit.com/api/v1/authorize?client_id={}&response_type=code&state={}&redirect_uri={}&duration=permanent&scope={}",
        client_id, state, encoded_redirect, encoded_scope
    );

    println!("Opening browser to: {}", auth_url);

    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&auth_url).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd").args(&["/C", "start", "", &auth_url]).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&auth_url).spawn().map_err(|e| e.to_string())?;

    // 3. Wait for callback (with timeout)
    println!("Waiting for callback on port {}...", port);

    let (mut stream, _) = tokio::time::timeout(
        std::time::Duration::from_secs(300), // 5 minute timeout
        listener.accept()
    )
    .await
    .map_err(|_| "Authentication timed out. Please try again.".to_string())?
    .map_err(|e| e.to_string())?;
    
    let mut buffer = [0; 1024];
    stream.read(&mut buffer).await.map_err(|e| e.to_string())?;
    
    let request = String::from_utf8_lossy(&buffer);
    
    let code_start = request.find("code=");
    if code_start.is_none() {
         let response = "HTTP/1.1 400 BAD REQUEST\r\n\r\nFailed to get code";
         stream.write_all(response.as_bytes()).await.unwrap();
         return Err("Callback received but no code found.".to_string());
    }
    
    let code_start_idx = code_start.unwrap() + 5;
    let code_end_idx = request[code_start_idx..].find(|c| c == '&' || c == ' ').map(|i| code_start_idx + i).unwrap_or(request.len());
    let code = &request[code_start_idx..code_end_idx];

    println!("Received code: {}", code);

    // Send success response to browser
    let success_page = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n
    <html>
    <body style='font-family: sans-serif; text-align: center; padding: 50px;'>
        <h1 style='color: #4CAF50;'>Authentication Successful!</h1>
        <p>You can close this window and return to the application.</p>
        <script>window.close();</script>
    </body>
    </html>";
    stream.write_all(success_page.as_bytes()).await.unwrap();
    stream.flush().await.unwrap();
    
    // 4. Exchange code for token
    exchange_code_for_token(&client_id, &client_secret, code, &redirect_uri).await
}

async fn exchange_code_for_token(client_id: &str, client_secret: &str, code: &str, redirect_uri: &str) -> Result<String, String> {
    let client = Client::new();
    let credentials = format!("{}:{}", client_id, client_secret);
    let encoded = general_purpose::STANDARD.encode(credentials);

    let params = [
        ("grant_type", "authorization_code"),
        ("code", code),
        ("redirect_uri", redirect_uri),
    ];

    println!("Attempting to exchange code for token...");
    println!("Client ID: {}", client_id);
    println!("Redirect URI: {}", redirect_uri);
    
    let response = client.post("https://www.reddit.com/api/v1/access_token")
        .header("Authorization", format!("Basic {}", encoded))
        .header("User-Agent", "Atalaia/0.1.0") // REQUIRED by Reddit
        .form(&params)
        .send()
        .await
        .map_err(|e| {
             println!("HTTP Request Failed: {}", e);
             e.to_string()
        })?;

    println!("Response Status: {}", response.status());

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        println!("Token exchange error body: {}", error_text);
        return Err(format!("Token exchange failed: {}", error_text));
    }

    let response_text = response.text().await.map_err(|e| e.to_string())?;
    println!("Token Response Body: {}", response_text);

    let token_res: TokenResponse = serde_json::from_str(&response_text).map_err(|e| {
        println!("JSON Parse Error: {}", e);
        e.to_string()
    })?;

    // 5. Save tokens to config
    let mut config = ConfigDirs::read_config().map_err(|e| format!("Failed to read config during auth save: {}", e))?;
    config.api_keys.reddit_access_token = token_res.access_token.clone();
    if let Some(refresh_token) = token_res.refresh_token {
        config.api_keys.reddit_refresh_token = refresh_token;
    } else {
        println!("WARNING: No refresh token received from Reddit! User might need to revoke app access to get a new one.");
    }
    println!("Saving config... Refresh token in memory: '{}'", config.api_keys.reddit_refresh_token);
    ConfigDirs::save_config(&config).map_err(|e| format!("Failed to save config during auth: {}", e))?;
    
    println!("Successfully saved tokens. Refresh token present: {}", !config.api_keys.reddit_refresh_token.is_empty());

    Ok("Authentication successful!".to_string())
}

pub async fn refresh_access_token(client_id: &str, client_secret: &str, refresh_token: &str) -> Result<String, String> {
    let client = Client::new();
    let credentials = format!("{}:{}", client_id, client_secret);
    let encoded = general_purpose::STANDARD.encode(credentials);

    let params = [
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
    ];

    let response = client.post("https://www.reddit.com/api/v1/access_token")
        .header("Authorization", format!("Basic {}", encoded))
        .header("User-Agent", "Atalaia/0.1.0") // REQUIRED by Reddit
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Token refresh failed: {}", error_text));
    }

    let token_res: TokenResponse = response.json().await.map_err(|e| e.to_string())?;

    // Update config with new access token
    let mut config = ConfigDirs::read_config().map_err(|e| e.to_string())?;
    config.api_keys.reddit_access_token = token_res.access_token.clone();
    // Refresh token might rotate? Reddit usually keeps it, but if a new one is returned, update it.
    if let Some(new_rt) = token_res.refresh_token {
        config.api_keys.reddit_refresh_token = new_rt;
    }
    ConfigDirs::save_config(&config).map_err(|e| e.to_string())?;

    Ok(token_res.access_token)
}
