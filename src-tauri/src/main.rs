// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod commands;
pub mod database;
pub mod models;
pub mod settings;

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // COMMANDS GOES HERE
            commands::get_reddit_results,
            commands::get_recent_posts,
            commands::get_all_posts,
            commands::get_all_searched_posts,
            commands::save_single_reddit_command,
            commands::clear_saved_reddits,
            commands::remove_single_reddit_command,
            commands::get_post_comments_command,
            commands::get_all_comments_command,
            commands::clear_comments_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
