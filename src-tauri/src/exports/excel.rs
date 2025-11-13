use std::fs;

use crate::database::adding::DB;
use chrono::Local;
use directories::UserDirs;
use rust_xlsxwriter::{Format, FormatAlign, Workbook, XlsxError};
use serde_json::Value;

pub fn create_excel() -> Result<(), Box<dyn std::error::Error>> {
    // Get data from database with proper error handling
    let db = DB::new()?;
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
    let headers = ["Date", "Title", "URL", "Relevance", "Subreddit"];

    for (col, header) in headers.iter().enumerate() {
        worksheet.write_string_with_format(0, col as u16, *header, &header_format)?;
    }

    // Write data rows
    for (row, result) in data.iter().enumerate() {
        let row_num = (row + 1) as u32;
        let cells = [
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

    // Create directory with better error handling
    if let Err(e) = fs::create_dir_all(&folder_path) {
        eprintln!("Failed to create directory {:?}: {}", folder_path, e);
        return Err(Box::new(e));
    }

    // Try to save with explicit error handling
    workbook
        .save(folder_path.join(filename.as_str()))
        .map_err(|e| {
            eprintln!("Failed to save workbook to {:?}: {}", folder_path, e);
            Box::new(e)
        })?;
    println!("Successfully exported to {:?}", folder_path);
    Ok(())
}

// Export the filtered data by the LLM into a .xlsx
pub fn export_gemini_to_excel(json_str: &str) -> Result<(), XlsxError> {
    let gemini_values: Vec<Value> = match serde_json::from_str(json_str) {
        Ok(arr) => arr,
        Err(_) => {
            match serde_json::from_str::<Value>(json_str) {
                Ok(obj) => vec![obj],
                Err(e) => {
                    eprintln!("Warning: Failed to parse JSON, using empty data. Error: {}", e);
                    eprintln!("JSON content (first 1000 chars): {}", &json_str[..json_str.len().min(1000)]);
                    Vec::new() // Return empty vector instead of failing
                }
            }
        }
    };

    println!("Processing {} items from JSON", gemini_values.len());

    // Create workbook
    let mut workbook = Workbook::new();

    // Format for headers
    let header_format = Format::new()
        .set_bold()
        .set_align(FormatAlign::Center)
        .set_background_color("C6EFCE");

    // Add and setup leads worksheet
    let mut worksheet = workbook.add_worksheet();
    worksheet.set_name("Leads")?;

    // Write headers for leads sheet
    worksheet.write_string_with_format(0, 0, "Title", &header_format)?;
    worksheet.write_string_with_format(0, 1, "URL", &header_format)?;
    worksheet.write_string_with_format(0, 2, "Date", &header_format)?;
    worksheet.write_string_with_format(0, 3, "Relevance", &header_format)?;
    worksheet.write_string_with_format(0, 4, "Subreddit", &header_format)?;
    worksheet.write_string_with_format(0, 5, "Sentiment", &header_format)?;
    worksheet.write_string_with_format(0, 6, "Engagement Score", &header_format)?;

    // Write leads data
    for (row, value) in gemini_values.iter().enumerate() {
        let row = (row + 1) as u32;
        if let Some(obj) = value.as_object() {
            // Cache commonly used values
            let title = obj
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or_default();
            let url = obj.get("url").and_then(|v| v.as_str()).unwrap_or_default();

            worksheet.write_string(row, 0, title)?;
            worksheet.write_string(row, 1, url)?;

            if let Some(date) = obj.get("formatted_date").and_then(|v| v.as_str()) {
                worksheet.write_string(row, 2, date)?;
            }
            if let Some(relevance) = obj.get("relevance").and_then(|v| v.as_str()) {
                worksheet.write_string(row, 3, relevance)?;
            }
            if let Some(subreddit) = obj.get("subreddit").and_then(|v| v.as_str()) {
                worksheet.write_string(row, 4, subreddit)?;
            }
            if let Some(sentiment) = obj.get("sentiment").and_then(|v| v.as_str()) {
                worksheet.write_string(row, 5, sentiment)?;
            }
            if let Some(engagement_score) = obj.get("engagement_score").and_then(|v| v.as_str()) {
                worksheet.write_string(row, 6, engagement_score)?;
            }
        }
    }

    // Set column widths for leads sheet
    worksheet.set_column_width(0, 50)?; // Title
    worksheet.set_column_width(1, 30)?; // URL
    worksheet.set_column_width(2, 20)?; // Date
    worksheet.set_column_width(3, 15)?; // Relevance
    worksheet.set_column_width(4, 20)?; // Subreddit
    worksheet.set_column_width(5, 15)?; // Sentiment
    worksheet.set_column_width(6, 20)?; // Engagement Score

    // Add and setup comments worksheet
    worksheet = workbook.add_worksheet();
    worksheet.set_name("Comments")?;

    // Write headers for comments sheet
    worksheet.write_string_with_format(0, 0, "Post Title", &header_format)?;
    worksheet.write_string_with_format(0, 1, "Author", &header_format)?;
    worksheet.write_string_with_format(0, 2, "Comment", &header_format)?;
    worksheet.write_string_with_format(0, 3, "Sentiment", &header_format)?;
    worksheet.write_string_with_format(0, 4, "URL", &header_format)?;

    let mut row_num = 1;
    for value in &gemini_values {
        if let Some(obj) = value.as_object() {
            let title = obj
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or_default();
            let url = obj.get("url").and_then(|v| v.as_str()).unwrap_or_default();

            if let Some(comments) = obj.get("top_comments").and_then(|v| v.as_array()) {
                for comment in comments {
                    if let Some(comment_obj) = comment.as_object() {
                        worksheet.write_string(row_num, 0, title)?;
                        if let Some(author) = comment_obj.get("author").and_then(|v| v.as_str()) {
                            worksheet.write_string(row_num, 1, author)?;
                        }
                        if let Some(text) = comment_obj.get("text").and_then(|v| v.as_str()) {
                            worksheet.write_string(row_num, 2, text)?;
                        }
                        if let Some(sentiment) =
                            comment_obj.get("sentiment").and_then(|v| v.as_str())
                        {
                            worksheet.write_string(row_num, 3, sentiment)?;
                        }
                        worksheet.write_string(row_num, 4, url)?;
                        row_num += 1;
                    }
                }
            }
        }
    }

    {
        // Set column widths for comments sheet
        worksheet.set_column_width(0, 50)?; // Post Title
        worksheet.set_column_width(1, 20)?; // Author
        worksheet.set_column_width(2, 100)?; // Comment
        worksheet.set_column_width(3, 15)?; // Sentiment
        worksheet.set_column_width(4, 30)?; // URL
    }

    // Get user's desktop directory
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

    // Create output directory and save file
    let folder_name = "Reddit_data";
    let filename = format!(
        "Ruddit_leads_{}.xlsx",
        Local::now().format("%d-%m-%Y_%H-%M-%S")
    );

    let folder_path = desktop.join(folder_name);
    // Create directory with better error handling
    if let Err(e) = fs::create_dir_all(&folder_path) {
        eprintln!("Failed to create directory {:?}: {}", folder_path, e);
        return Err(XlsxError::IoError(e));
    }

    let save_path = folder_path.join(&filename);
    workbook.save(&save_path).map_err(|e| {
        eprintln!("Failed to save workbook to {:?}: {}", save_path, e);
        e
    })?;
    println!("Successfully exported to {:?}", save_path);
    Ok(())
}

// Function to export comments for a specific post
pub fn export_comments_from_db(post_id: &str) -> Result<(), XlsxError> {
    // Get comments from database
    let db = DB::new()
        .map_err(|e| XlsxError::IoError(std::io::Error::other(e)))?;

    let comments = db
        .get_post_comments(post_id)
        .map_err(|e| XlsxError::IoError(std::io::Error::other(e)))?;

    println!("Exporting {} comments to Excel", comments.len());

    // Create workbook and worksheet
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    // Set up headers with formatting
    let header_format = Format::new().set_align(FormatAlign::Center).set_bold();

    let headers = [
        "Subreddit",
        "Post Title",
        "Author",
        "Comment",
        "Score",
        "Date",
        "Link",
    ];
    for (col, header) in headers.iter().enumerate() {
        worksheet.write_string_with_format(0, col as u16, *header, &header_format)?;
    }

    // Write comment data
    for (idx, comment) in comments.iter().enumerate() {
        let row = (idx + 1) as u32;
        worksheet.write_string(row, 0, &comment.subreddit)?;
        worksheet.write_string(row, 1, &comment.post_id)?;
        worksheet.write_string(row, 2, &comment.author)?;
        worksheet.write_string(row, 3, &comment.body)?;
        worksheet.write_number(row, 4, comment.score as f64)?;
        worksheet.write_string(row, 5, &comment.formatted_date)?;
        worksheet.write_string(row, 6, format!("https://reddit.com{}", comment.permalink))?;
    }

    // Set column widths
    worksheet.set_column_width(0, 20)?; // Subreddit
    worksheet.set_column_width(1, 50)?; // Post Title
    worksheet.set_column_width(2, 20)?; // Author
    worksheet.set_column_width(3, 100)?; // Comment
    worksheet.set_column_width(4, 10)?; // Score
    worksheet.set_column_width(5, 20)?; // Date
    worksheet.set_column_width(6, 50)?; // Link

    // Save the workbook
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

    let folder_name = "Reddit_data";
    let filename = format!(
        "Reddit_comments_{}_{}",
        post_id,
        Local::now().format("%d-%m-%Y_%H-%M-%S")
    );

    let folder_path = desktop.join(folder_name);
    // Create directory with better error handling
    if let Err(e) = fs::create_dir_all(&folder_path) {
        eprintln!("Failed to create directory {:?}: {}", folder_path, e);
        return Err(XlsxError::IoError(e));
    }

    let save_path = folder_path.join(format!("{}.xlsx", filename));
    workbook.save(&save_path).map_err(|e| {
        eprintln!("Failed to save workbook to {:?}: {}", save_path, e);
        e
    })?;
    println!("Successfully exported to {:?}", save_path);
    Ok(())
}

// Function to export the leads that are generated from the LLM
pub async fn export_leads_with_gemini(data: &str) -> Result<(), XlsxError> {
    export_gemini_to_excel(data)
}

// Function to export the comments that are generated from the LLM
pub async fn export_comments_with_gemini(data: &str) -> Result<(), XlsxError> {
    let json_data: Value = match serde_json::from_str(data) {
        Ok(value) => value,
        Err(e) => {
            eprintln!("Warning: Failed to parse JSON in export_comments_with_gemini, using empty object. Error: {}", e);
            eprintln!("JSON content (first 1000 chars): {}", &data[..data.len().min(1000)]);
            Value::Null
        }
    };

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.set_name("Comments")?;

    let header_format = Format::new()
        .set_bold()
        .set_align(FormatAlign::Center)
        .set_background_color("C6EFCE");

    worksheet.write_string_with_format(0, 0, "Post Title", &header_format)?;
    worksheet.write_string_with_format(0, 1, "Author", &header_format)?;
    worksheet.write_string_with_format(0, 2, "Comment", &header_format)?;
    worksheet.write_string_with_format(0, 3, "Sentiment", &header_format)?;
    worksheet.write_string_with_format(0, 4, "URL", &header_format)?;

    let mut row = 1;
    if let Some(posts) = json_data.as_array() {
        for post in posts {
            if let Some(post_obj) = post.as_object() {
                let title = post_obj
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();
                let url = post_obj
                    .get("url")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();

                if let Some(comments) = post_obj.get("top_comments").and_then(|v| v.as_array()) {
                    for comment in comments {
                        if let Some(comment_obj) = comment.as_object() {
                            worksheet.write_string(row, 0, title)?;
                            worksheet.write_string(
                                row,
                                1,
                                comment_obj
                                    .get("author")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or_default(),
                            )?;
                            worksheet.write_string(
                                row,
                                2,
                                comment_obj
                                    .get("text")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or_default(),
                            )?;
                            worksheet.write_string(
                                row,
                                3,
                                comment_obj
                                    .get("sentiment")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or_default(),
                            )?;
                            worksheet.write_string(row, 4, url)?;
                            row += 1;
                        }
                    }
                }
            }
        }
    }

    worksheet.set_column_width(0, 50)?;
    worksheet.set_column_width(1, 20)?;
    worksheet.set_column_width(2, 100)?;
    worksheet.set_column_width(3, 15)?;
    worksheet.set_column_width(4, 30)?;

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

    let folder_name = "Reddit_data";
    let filename = format!(
        "Ruddit_comments_{}.xlsx",
        Local::now().format("%d-%m-%Y_%H-%M-%S")
    );

    let folder_path = desktop.join(folder_name);
    if let Err(e) = fs::create_dir_all(&folder_path) {
        eprintln!("Failed to create directory {:?}: {}", folder_path, e);
        return Err(XlsxError::IoError(e));
    }

    let save_path = folder_path.join(&filename);
    workbook.save(&save_path).map_err(|e| {
        eprintln!("Failed to save workbook to {:?}: {}", save_path, e);
        e
    })?;
    println!("Successfully exported to {:?}", save_path);
    Ok(())
}
