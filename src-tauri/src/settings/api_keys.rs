use directories::{BaseDirs, UserDirs};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiKeys {
    pub REDDIT_API_ID: String,
    pub REDDIT_API_SECRET: String,
    pub GEMINI_API_KEY: String,
    pub SUBREDDIT: String,
    pub RELEVANCE: String,

    #[serde(default)]
    pub LEAD_KEYWORDS: Vec<String>,

    #[serde(default)]
    pub BRANDED_KEYWORDS: Vec<String>,

    #[serde(default)]
    pub SENTIMENT: Vec<String>,

    #[serde(default)]
    pub MATCH: String,
}

#[derive(Debug)]
pub struct ConfigDirs {
    pub home_dir: String,
    pub config_dir: String,
    pub cache_dir: String,
    pub data_dir: String,
    pub documents_dir: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppConfig {
    pub api_keys: ApiKeys,
}

impl Default for ApiKeys {
    fn default() -> Self {
        ApiKeys {
            REDDIT_API_ID: "CHANGE_ME".to_string(),
            REDDIT_API_SECRET: "CHANGE_ME".to_string(),
            GEMINI_API_KEY: "CHANGE_ME".to_string(),
            SUBREDDIT: "all".to_string(),
            RELEVANCE: "hot".to_string(),
            LEAD_KEYWORDS: vec![],
            BRANDED_KEYWORDS: vec![],
            SENTIMENT: vec!["neutral".to_string()],
            MATCH: "".to_string(),
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            api_keys: ApiKeys::default(),
        }
    }
}

impl ConfigDirs {
    pub fn new() -> Option<Self> {
        let user_dirs = UserDirs::new()?;
        let base_dirs = BaseDirs::new()?;

        Some(ConfigDirs {
            home_dir: base_dirs.home_dir().to_string_lossy().into_owned(),
            documents_dir: user_dirs.document_dir()?.to_string_lossy().into_owned(),
            config_dir: base_dirs.config_dir().to_string_lossy().into_owned(),
            cache_dir: base_dirs.cache_dir().to_string_lossy().into_owned(),
            data_dir: base_dirs.data_dir().to_string_lossy().into_owned(),
        })
    }

    pub fn create_default_config() -> Result<(), Box<dyn std::error::Error>> {
        let base_dirs = BaseDirs::new().ok_or("Failed to get base directories")?;
        let config_dir = base_dirs.config_dir();

        // Create app-specific config directory
        let app_config_dir = config_dir.join("ruddit");

        println!("Creating config directory: {}", app_config_dir.display());
        fs::create_dir_all(&app_config_dir)?;

        // Path to the config file
        let config_path = app_config_dir.join("settings.toml");

        // Default TOML content
        let toml_content = r#"
[api_keys]
REDDIT_API_ID = "your_api_id_here"
REDDIT_API_SECRET = "your_api_secret_here"
SUBREDDIT = "supplychain"
RELEVANCE = "hot"
GEMINI_API_KEY = "your_api_key_here"
BRANDED_KEYWORDS = ["keyword1", "keyword2"]
LEAD_KEYWORDS = ["keyword1", "keyword2"]
SENTIMENT = ["keyword1", "keyword2"]
MATCH = "OR"

"#
        .trim_start();

        // Write to file if file does not exist yet
        if !config_path.exists() {
            println!("Creating config file: {}", config_path.display());
            fs::write(config_path, toml_content)?;
        }

        Ok(())
    }

    pub fn read_config() -> Result<AppConfig, Box<dyn std::error::Error>> {
        let base_dirs = BaseDirs::new().ok_or("Failed to get base directories")?;
        let config_dir = base_dirs.config_dir();

        // Path to the config file
        let config_path = config_dir.join("ruddit/settings.toml");
        println!("Reading config file: {:#?}", config_path);

        // Read from file
        let toml_content = fs::read_to_string(config_path)?;

        // Try parsing; on failure, return the error instead of panicking
        let app_config: AppConfig = toml::from_str(&toml_content)?;

        Ok(app_config)
    }

    pub fn edit_config_file() -> Result<(), Box<dyn std::error::Error>> {
        // get the config file path and edit natively.
        let base_dirs = BaseDirs::new().ok_or("Failed to get base directories")?;
        let config_dir = base_dirs.config_dir();
        let config_path = config_dir.join("ruddit/settings.toml");

        #[cfg(target_os = "windows")]
        {
            use std::process::Command;

            Command::new("cmd")
                .args(&["/C", "start", "", &config_path.to_string_lossy()])
                .spawn()?;
        }

        #[cfg(target_os = "macos")]
        {
            use std::process::Command;

            Command::new("open").arg(config_path).spawn()?;
        }

        #[cfg(target_os = "linux")]
        {
            Command::new("xdg-open").arg(config_path).spawn()?;
        }

        Ok(())
    }
}
