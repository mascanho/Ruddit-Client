<div align="center">
  <img src="https://github.com/mascanho/ruddit/blob/master/src/public/ruddit.png" alt="Ruddit Logo" width="200" style="border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); margin: 20px 0;">
  <h1>Ruddit</h1>
</div>

**Ruddit** is a command-line (CLI) application for interacting with Reddit and leveraging Google's Gemini AI, built with Rust.

## ✨ Features

- **Reddit API Interaction**: Connects to the Reddit API to fetch posts from subreddits and perform searches.
- **Gemini AI Integration**: Uses Google's Gemini AI to analyze and answer questions based on the collected Reddit data, providing structured JSON responses.
- **Lead Generation**: Automatically generate leads from the collected Reddit data using Gemini AI.
- **Command-Line Interface**: All operations are performed through a comprehensive set of commands using `clap`.
- **Database Storage**: Uses a local SQLite database to store Reddit post data.
- **Data Export**: Export collected data to Excel format.
- **Secure API Key Management**: Securely stores and manages your Reddit and Gemini API keys in a configuration file.

## 🚀 Installation

To install Ruddit, you need to have Rust and Cargo installed. If you don't, follow the instructions on the [official Rust website](https://www.rust-lang.org/tools/install).

Once Rust is set up, clone the repository and install the application:

```bash
git clone https://github.com/mascanho/ruddit.git
cd ruddit
cargo install --path .
```

This will install the `ruddit` executable in your Cargo bin directory (usually `~/.cargo/bin`), making it available from anywhere in your terminal.

## ⚙️ Configuration

Before using Ruddit, you need to configure your Reddit and Gemini API keys.

1. **Create a Reddit App**: Go to your [Reddit apps](https://www.reddit.com/prefs/apps) page and create a new "script" app.
2. **Get a Gemini API Key**: Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
3. **Set API Keys**: When you first run `ruddit`, it will create a `settings.toml` file in your system's config directory. You can also run `ruddit --settings` to open the configuration file for editing.

   - **Linux:** `~/.config/ruddit/settings.toml`
   - **macOS:** `~/Library/Application Support/ruddit/settings.toml`
   - **Windows:** `C:\Users\<YourUser>\AppData\Roaming\ruddit\settings.toml`

   The `settings.toml` file will look like this:

   ```toml
   [api_keys]
   REDDIT_API_ID = "your_api_id_here"
   REDDIT_API_SECRET = "your_api_secret_here"
   GEMINI_API_KEY = "your_api_key_here"
   SUBREDDIT = "supplychain"
   RELEVANCE = "hot"
   ```

## 💻 Usage

Ruddit provides several command-line options to interact with Reddit and Gemini.

### Fetching Reddit Posts

Fetch posts from a specific subreddit and relevance (hot, new, top, etc.).

```bash
ruddit --subreddit <subreddit_name> --relevance <relevance>
```

If no subreddit or relevance is provided, it will default to `supplychain` and `hot`.

### Searching Reddit

Search for posts on Reddit with a specific query.

```bash
ruddit --find "<search_query>" --relevance <relevance>
```

### Interacting with Gemini AI

Ask a question to the Gemini AI based on the data stored in the local database.

```bash
ruddit --gemini "<your_question>"
```

### Generating Leads with Gemini AI

Automatically generate leads from the collected Reddit data using Gemini AI.

```bash
ruddit --leads
```

### Exporting Data

Export the collected Reddit data to an Excel file. The file will be saved in a `Reddit_data` folder on your desktop.

```bash
ruddit --export
```

### Clearing the Database

Clear all the data from the local SQLite database.

```bash
ruddit --clear
```

### Managing Settings

Open the `settings.toml` configuration file for editing.

```bash
ruddit --settings
```

### Adding API Keys

Add your Reddit API key directly from the command line.

```bash
ruddit --apikey <your_api_key>
```

## 🛠️ Technologies Used

- [Rust](https://www.rust-lang.org/)
- [Reqwest](https://docs.rs/reqwest/latest/reqwest/) (for HTTP requests to the Reddit API)
- [Serde](https://serde.rs/) (for serialization/deserialization)
- [Tokio](https://tokio.rs/) (for asynchronous operations)
- [Clap](https://docs.rs/clap/latest/clap/) (for argument parsing)
- [Rusqlite](https://docs.rs/rusqlite/latest/rusqlite/) (for SQLite database)
- [Chrono](https://docs.rs/chrono/latest/chrono/) (for date and time)
- [TOML](https://docs.rs/toml/latest/toml/) (for configuration file parsing)
- [Rust XlsxWriter](https://docs.rs/rust_xlsxwriter/latest/rust_xlsxwriter/) (for writing Excel files)
- [gemini-rust](https://crates.io/crates/gemini-rust) (for interacting with the Gemini API)

## 🙌 Contributing

Contributions are welcome! If you have ideas for new features or find a bug, please open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License.
