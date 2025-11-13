#[tauri::command]
pub async fn get_reddit_results(data: Vec<String>) -> Result<String, String> {
    Ok("This is the result".to_string())
}
