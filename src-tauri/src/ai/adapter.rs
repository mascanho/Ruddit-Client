use anyhow::Result;
use genai::chat::{ChatMessage, ChatRequest};
use genai::Client;
use serde_json::Value;
use crate::settings::api_keys::ConfigDirs;
use crate::ai::gemini;

pub async fn ask_ai(question: &str) -> Result<String> {
    let config = ConfigDirs::read_config().map_err(|e| anyhow::anyhow!(e.to_string()))?;
    let api_keys = config.api_keys;

    match api_keys.ai_provider.as_str() {
        "openai" => {
            if api_keys.openai_api_key == "CHANGE_ME" || api_keys.openai_api_key.is_empty() {
                return Err(anyhow::anyhow!("OpenAI API Key not configured"));
            }

            // Set the environment variable for genai to pick up
            std::env::set_var("OPENAI_API_KEY", &api_keys.openai_api_key);
            let client = Client::default();

            let chat_req = ChatRequest::new(vec![
                ChatMessage::user(question),
            ]);

            let model = if api_keys.openai_model.is_empty() {
                "gpt-4o".to_string()
            } else {
                api_keys.openai_model
            };

            let response = client.exec_chat(&model, chat_req, None).await?;
            Ok(response.content.into_texts().join(""))
        }
        _ => {
            // Default to Gemini
            // We need to wrap the Gemini response (which returns a generic Value) into a String
            // The existing ask_gemini returns a Result<Value, GeminiError>
            // We'll convert it here.
            
            // Note: ask_gemini expects the question. It handles the context building internally.
            // However, the existing ask_gemini returns a JSON Value.
            // If it's a simple chat, we might want to extract the "answer" field or return the whole thing.
            // The command `ask_gemini_command` does this extraction.
            // Let's reuse that logic or call ask_gemini directly.
            
            let response = gemini::ask_gemini(question).await
                .map_err(|e| anyhow::anyhow!(e.to_string()))?;

            if let Some(answer) = response.get("answer").and_then(|v| v.as_str()) {
                Ok(answer.to_string())
            } else {
                 // If it's a plain text response wrapped in our fix, it might be in "answer" too.
                 // If it's raw JSON, return stringified.
                if let Some(ans) = response.get("answer").and_then(|v| v.as_str()) {
                    Ok(ans.to_string())
                } else {
                    Ok(response.to_string())
                }
            }
        }
    }
}

pub async fn get_available_models(provider: &str, api_key: &str) -> Result<Vec<String>> {
    match provider {
        "openai" => {
             // genai doesn't seem to have a simple "list models" that works across all providers easily 
             // or it might be provider specific.
             // For now, let's return a static list of popular OpenAI models to avoid complexity
             // as listing models often requires specific endpoints.
             // We can improve this later if needed.
             Ok(vec![
                 "gpt-4o".to_string(),
                 "gpt-4-turbo".to_string(),
                 "gpt-4".to_string(),
                 "gpt-3.5-turbo".to_string(),
             ])
        }
        _ => {
            gemini::get_available_models(api_key).await
                .map_err(|e| anyhow::anyhow!(e.to_string()))
        }
    }
}
