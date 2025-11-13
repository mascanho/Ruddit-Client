use clap::Parser;

//TODO: implement token input with clap

#[derive(Debug, Parser)]
#[command(name = "Ruddit")]
#[command(version = "0.1")]
#[command(about = "Ruddit - A lead finder for Reddit built with Rust", long_about = None)]
#[command(version, about, long_about = None)]
pub struct Args {
    /// Open database folder
    #[arg(short = 'O', long, help = "Open the folder containing the database")]
    pub open_db: bool,

    /// Gemini model key
    #[arg(short, long, help = "Query Gemini to discover insights in your data")]
    pub gemini: Option<String>,

    /// Subreddit name to fetch posts from (-s)
    #[arg(short, long, help = "Subreddit name to fetch posts from")]
    pub subreddit: Option<String>,

    /// Relevance filter for search results (-r)
    #[arg(
        short,
        long,
        help = "Relevance filter for search results ( hot | new | top | comments | relevance )"
    )]
    pub relevance: Option<String>,

    /// Export the results (-e)
    #[arg(short, long, help = "Export all the results, without filtering")]
    pub export: bool,

    /// Clear cached data (-c)
    #[arg(
        short = 'C',
        long,
        help = "Delete all the data from the databse ** DANGER **"
    )]
    pub clear: bool,

    /// Search for a specific keyword (-f) (requires --relevance)
    #[arg(
        short,
        long,
        requires = "relevance",
        help = "Search for a specific keyword (requires --relevance)"
    )]
    pub find: Option<String>,

    /// Export pre-defined data based on arguments and config file (-l)
    #[arg(
        short,
        long,
        help = "Export data based on pre-defined keyword arguments in your config file"
    )]
    pub leads: bool,

    /// Open the configuration file in the OS default editor (-S)
    #[arg(
        short = 'S',
        long,
        help = "Open the configuration file in the OS default editor"
    )]
    pub settings: bool,

    /// Fetch comments for a specific post ID (-C)
    #[arg(short = 'c', long, help = "Fetch comments for a specific post ID")]
    pub comments: Option<String>,

    /// Limit the number of comments to fetch (-n)
    #[arg(
        short = 'n',
        long,
        help = "Limit the number of comments to fetch",
        default_value = "100"
    )]
    pub comment_limit: usize,
}
