use directories::{BaseDirs, UserDirs};
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize)]

pub struct ApiKeys {
    #[serde(default)]
    #[serde(alias = "REDDIT_API_ID")]
    pub reddit_api_id: String,
    #[serde(default)]
    #[serde(alias = "REDDIT_API_SECRET")]
    pub reddit_api_secret: String,
    #[serde(default)]
    #[serde(alias = "GEMINI_API_KEY")]
    pub gemini_api_key: String,
    #[serde(default)]
    #[serde(alias = "GEMINI_MODEL")]
    pub gemini_model: String,

    #[serde(default)]
    #[serde(alias = "AI_PROVIDER")]
    pub ai_provider: String,

    #[serde(default)]
    #[serde(alias = "OPENAI_API_KEY")]
    pub openai_api_key: String,

    #[serde(default)]
    #[serde(alias = "OPENAI_MODEL")]
    pub openai_model: String,
    #[serde(default)]
    #[serde(alias = "SUBREDDIT")]
    pub subreddit: String,
    #[serde(default)]
    #[serde(alias = "RELEVANCE")]
    pub relevance: String,

    #[serde(default)]
    #[serde(alias = "LEAD_KEYWORDS")]
    pub lead_keywords: Vec<String>,

    #[serde(default)]
    #[serde(alias = "BRANDED_KEYWORDS")]
    pub branded_keywords: Vec<String>,

    #[serde(default)]
    #[serde(alias = "SENTIMENT")]
    pub sentiment: Vec<String>,

    #[serde(default = "default_high_intent_patterns")]
    #[serde(alias = "INTENT_HIGH")]
    pub intent_high: Vec<String>,

    #[serde(default = "default_medium_intent_patterns")]
    #[serde(alias = "INTENT_MEDIUM")]
    pub intent_medium: Vec<String>,

    #[serde(default)]
    #[serde(alias = "MATCH")]
    pub match_keyword: String,

    #[serde(default)]
    #[serde(alias = "REDDIT_USERNAME")]
    pub reddit_username: String,

    #[serde(default)]
    #[serde(alias = "REDDIT_PASSWORD")]
    pub reddit_password: String,
}

#[derive(Debug)]
pub struct ConfigDirs {
    pub home_dir: String,
    pub config_dir: String,
    pub cache_dir: String,
    pub data_dir: String,
    pub documents_dir: String,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub api_keys: ApiKeys,
}

impl Default for ApiKeys {
    fn default() -> Self {
        ApiKeys {
            reddit_api_id: "CHANGE_ME".to_string(),
            reddit_api_secret: "CHANGE_ME".to_string(),
            gemini_api_key: "CHANGE_ME".to_string(),
            gemini_model: "gemini-pro".to_string(),
            ai_provider: "gemini".to_string(),
            openai_api_key: "CHANGE_ME".to_string(),
            openai_model: "gpt-4o".to_string(),
            subreddit: "all".to_string(),
            relevance: "hot".to_string(),
            lead_keywords: vec![],
            branded_keywords: vec![],
            sentiment: vec!["neutral".to_string()],
            intent_high: default_high_intent_patterns(),
            intent_medium: default_medium_intent_patterns(),
            match_keyword: "".to_string(),
            reddit_username: "".to_string(),
            reddit_password: "".to_string(),
        }
    }
}

impl ApiKeys {
    pub fn calculate_intent(&self, title: &str, body: Option<&str>) -> String {
        let text = format!("{} {}", title, body.unwrap_or("")).to_lowercase();

        // Check high intent
        for pattern in &self.intent_high {
            if text.contains(&pattern.to_lowercase()) {
                return "High".to_string();
            }
        }

        // Check medium intent
        for pattern in &self.intent_medium {
            if text.contains(&pattern.to_lowercase()) {
                return "Medium".to_string();
            }
        }

        "Low".to_string()
    }
}

fn default_high_intent_patterns() -> Vec<String> {
    vec![
        "looking for".to_string(),
        "recommend".to_string(),
        "suggestion".to_string(),
        "alternative to".to_string(),
        "vs".to_string(),
        "comparison".to_string(),
        "review".to_string(),
        "best".to_string(),
        "help with".to_string(),
        "how to".to_string(),
        "pricing".to_string(),
        "cost".to_string(),
        "software".to_string(),
    ]
}

fn default_medium_intent_patterns() -> Vec<String> {
    vec![
        "issues with".to_string(),
        "problem".to_string(),
        "error".to_string(),
        "question".to_string(),
        "anyone used".to_string(),
        "thoughts on".to_string(),
        "experience with".to_string(),
    ]
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

        // Write to file if file does not exist yet
        if !config_path.exists() {
            println!("Creating config file: {}", config_path.display());
            let default_config = AppConfig::default();
            let toml_content = toml::to_string_pretty(&default_config)?;
            fs::write(config_path, toml_content)?;
        }

        Ok(())
    }

    pub fn read_config() -> Result<AppConfig, Box<dyn std::error::Error>> {
        let base_dirs = BaseDirs::new().ok_or("Failed to get base directories")?;
        let config_dir = base_dirs.config_dir();

        // Path to the config file
        let config_path = config_dir.join("ruddit/settings.toml");

        if !config_path.exists() {
            Self::create_default_config()?;
        }

        println!("Reading config file: {:#?}", config_path);

        // Read from file
        let toml_content = fs::read_to_string(config_path)?;

        // Try parsing; on failure, return the error instead of panicking
        let app_config: AppConfig = toml::from_str(&toml_content)?;

        Ok(app_config)
    }

    pub fn save_config(config: &AppConfig) -> Result<(), Box<dyn std::error::Error>> {
        let base_dirs = BaseDirs::new().ok_or("Failed to get base directories")?;
        let config_dir = base_dirs.config_dir();
        let config_path = config_dir.join("ruddit/settings.toml");

        let toml_content = toml::to_string_pretty(config)?;
        fs::write(config_path, toml_content)?;

        Ok(())
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
            use std::process::Command;
            Command::new("xdg-open").arg(config_path).spawn()?;
        }

        Ok(())
    }
}
