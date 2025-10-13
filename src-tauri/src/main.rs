// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// USER CONFIG MODULES
pub mod actions;
pub mod ai;
pub mod database;
pub mod exports;
pub mod settings;

fn main() {
    app_lib::run();
}
