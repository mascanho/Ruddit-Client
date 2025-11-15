use std::process::Command;

pub async fn open_db_folder() -> Result<(), Box<dyn std::error::Error>> {
    let base_dirs = directories::BaseDirs::new().ok_or("Failed to get base directories")?;
    let db_path = base_dirs.config_dir().join("ruddit");

    // Ensure the directory exists
    if !db_path.exists() {
        std::fs::create_dir_all(&db_path)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    let command = ("open", &db_path);

    #[cfg(target_os = "windows")]
    let command = ("explorer", &db_path);

    #[cfg(target_os = "linux")]
    let command = ("xdg-open", &db_path);

    Command::new(command.0)
        .arg(command.1)
        .spawn()
        .map_err(|e| format!("Failed to spawn process: {}", e))?
        .wait()
        .map_err(|e| format!("Process failed: {}", e))?;

    Ok(())
}

