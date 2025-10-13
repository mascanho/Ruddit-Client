use std::fs;

use crate::database::{self, adding::PostDataWrapper};
use chrono::Local;
use directories::UserDirs;
use rust_xlsxwriter::{Format, FormatAlign, Workbook, XlsxError};
use serde_json::Value;

pub fn create_excel() -> Result<(), Box<dyn std::error::Error>> {
    // Get data from database with proper error handling
    let db = database::adding::DB::new()?;
    let data = db.get_db_results()?;

    let user_dirs = UserDirs::new().ok_or("Failed to get user directories")?;
    let desktop = user_dirs
        .desktop_dir()
        .ok_or("Failed to get desktop directory")?;

    println!("Exporting {} records to Excel", data.len());

    // Create new workbook
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.set_name("Reddit Posts")?;

    // Create header format
    let header_format = Format::new().set_align(FormatAlign::Center).set_bold();

    // Write headers
    let headers = [
        // "Timestamp",
        "Date",
        "Title",
        "URL",
        "Relevance",
        "Subreddit",
    ];

    for (col, header) in headers.iter().enumerate() {
        worksheet.write_string_with_format(0, col as u16, *header, &header_format)?;
    }

    // Write data rows
    for (row, result) in data.iter().enumerate() {
        let row_num = (row + 1) as u32;
        let cells = [
            // result.timestamp.to_string(),
            result.formatted_date.clone(),
            result.title.clone(),
            result.url.clone(),
            result.relevance.clone(),
            result.subreddit.clone(),
        ];

        for (col, cell) in cells.iter().enumerate() {
            worksheet.write_string(row_num, col as u16, cell)?;
        }
    }

    // Auto-fit columns for better readability
    worksheet.autofit();

    // Save to file with timestamp
    let filename = format!(
        "Reddit_data_{}.xlsx",
        Local::now().format("%d-%m-%Y_%H-%M-%S")
    );

    let folder_name = "Reddit_data";
    let folder_path = desktop.join(folder_name);

    if let Err(e) = fs::create_dir_all(&folder_path) {
        eprintln!("Failed to create directory: {}", e);
        return Err(e.into());
    }

    workbook.save(folder_path.join(filename.as_str()))?;

    println!("Successfully exported to {:?}", desktop.join(folder_name));
    Ok(())
}

// Export the filtered data by the LLM into a .xlsx
pub fn export_gemini_to_excel(gemini_data: &str) -> Result<(), XlsxError> {
    let gemini_values: Vec<Value> = serde_json::from_str(gemini_data)
        .or_else(|_| serde_json::from_str(gemini_data).map(|v: Value| vec![v]))
        .expect("Failed to parse JSON as an array or a single object");

    let user_dirs = UserDirs::new().ok_or_else(|| {
        XlsxError::IoError(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Failed to get user directories",
        ))
    })?;
    let desktop = user_dirs.desktop_dir().ok_or_else(|| {
        XlsxError::IoError(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Failed to get desktop directory",
        ))
    })?;

    println!("Exporting {} records to Excel", gemini_values.len());

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.set_name("Gemini Leads")?;

    let header_format = Format::new().set_align(FormatAlign::Center).set_bold();

    if let Some(first_item) = gemini_values.get(0) {
        if let Some(obj) = first_item.as_object() {
            let headers: Vec<&str> = obj.keys().map(|s| s.as_str()).collect();
            for (col, header) in headers.iter().enumerate() {
                worksheet.write_string_with_format(0, col as u16, *header, &header_format)?;
            }

            for (row, value) in gemini_values.iter().enumerate() {
                let row_num = (row + 1) as u32;
                if let Some(obj) = value.as_object() {
                    for (col, header) in headers.iter().enumerate() {
                        let cell_value = obj.get(*header).and_then(|v| v.as_str()).unwrap_or("");
                        worksheet.write_string(row_num, col as u16, cell_value)?;
                    }
                }
            }
        }
    }

    worksheet.autofit();

    let filename = format!(
        "Ruddit_leads_{}.xlsx",
        Local::now().format("%d-%m-%Y_%H-%M-%S")
    );
    let folder_name = "Reddit_data";
    let folder_path = desktop.join(folder_name);

    fs::create_dir_all(&folder_path).map_err(|e| XlsxError::IoError(e))?;

    let save_path = folder_path.join(&filename);
    workbook.save(&save_path)?;

    println!("Successfully exported to {:?}", save_path);
    Ok(())
}

// Function to export the leads that are generated from the LLM
// This happens when the user passes the -l or -lead flag
pub async fn export_leads_with_gemini(data: &str) {}
