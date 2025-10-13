use crate::database;

pub fn clear_database() -> Result<(), Box<dyn std::error::Error>> {
    println!("Clearing database...");

    let db = database::adding::DB::new()?;

    match db.clear_database() {
        Ok(_) => println!("Database cleared successfully!"),
        Err(e) => println!("Failed to clear database: {}", e),
    }

    Ok(())
}
