<div align="center">
  <img src="public/atalaia.png" alt="Atalaia Logo" width="200" style="border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); margin: 20px 0;">
  <h1>Atalaia</h1>
</div>

**Atalaia** is a desktop application for interacting with Reddit and leveraging Google's Gemini AI, built with Tauri, Next.js, and Rust.

## ✨ Features

- **Reddit Integration**: Connect to Reddit to fetch posts, search, and view comments.
- **AI-Powered Insights**: Leverage Google's Gemini AI to analyze Reddit data, generate leads, and answer questions.
- **Modern UI**: A sleek and responsive user interface built with Next.js and shadcn/ui.
- **Cross-Platform**: Runs on Windows, macOS, and Linux thanks to Tauri.
- **Data Export**: Export data to Excel.
- **Secure API Key Management**: Securely store your API keys.

## 🚀 Getting Started

To get started with Atalaia, you'll need to have Node.js and Rust installed.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mascanho/atalaia.git
   cd atalaia
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run tauri dev
   ```

## ⚙️ Configuration

You will need to configure your Reddit and Gemini API keys in the application settings.

1. **Create a Reddit App**: Go to your [Reddit apps](https://www.reddit.com/prefs/apps) page and create a new "script" app.
2. **Get a Gemini API Key**: Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
3. **Set API Keys**: Launch the application and navigate to the settings page to enter your API keys.

## 💻 Usage

Atalaia provides a user-friendly interface to explore Reddit content and leverage AI for insights.

- **Search**: Search for posts and comments on Reddit.
- **Analyze**: Use the AI-powered chat to ask questions about the data.
- **Generate Leads**: Automatically identify potential leads from Reddit discussions.
- **Export**: Save your findings to an Excel file.

## 🛠️ Technologies Used

- [Tauri](https://tauri.app/)
- [Next.js](https://nextjs.org/)
- [Rust](https://www.rust-lang.org/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

## 🙌 Contributing

Contributions are welcome! If you have ideas for new features or find a bug, please open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License.