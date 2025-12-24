# Ruddit Client

Ruddit is a powerful desktop application aimed at Reddit lead generation, brand monitoring, and automation. Built with **Tauri** and **Next.js**, it combines the performance of a native desktop app with the flexibility of modern web technologies.

## Features

- **📊 Smart Post Tracking**: Monitor and track posts across multiple subreddits in real-time. View relevance scores and detailed post information.
- **🔍 Advanced Search**: Search Reddit directly within the application with customizable filters and detailed results.
- **🤖 Automation System**: Built-in persistent **Automation Runner** that executes background tasks and schedules independently of the active UI tab.
- **💬 Message Management**: View and manage messages and comments in a dedicated table view.
- **✨ AI Assistant**: Chat with your data using the integrated AI Data Chat to get insights from your tracked posts and messages.
- **⚙️ Configurable Settings**: extensive application settings including font size adjustments, monitored keywords, and more.
- **📂 Local Database**: All data is stored locally for privacy and speed. Easily access your database folder from the UI.

## Technology Stack

- **Frontend**: [Next.js 15](https://nextjs.org), [React 19](https://react.dev), [Tailwind CSS 4](https://tailwindcss.com)
- **Desktop Framework**: [Tauri 2.0](https://tauri.app)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com), [Lucide React](https://lucide.dev)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Visualization**: [Recharts](https://recharts.org)

## Getting Started

### Prerequisites

Ensure you have the following installed:

1.  **Node.js** (Latest LTS recommended)
2.  **Rust & Cargo** (for Tauri) -> [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation

1.  Clone the repository and install dependencies:

    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

### Development

To run the application in development mode (Desktop App):

```bash
npm run tauri dev
```

This command starts the Next.js frontend and the Tauri backend simultaneously.

To run just the web frontend (in browser):

```bash
npm run dev
```

### Building for Production

To build the application for your OS:

```bash
npm run tauri build
```

## Project Structure

- `src/`: Next.js frontend source code
  - `components/`: UI components and feature logic
    - `smart-data-tables.tsx`: Main application dashboard
    - `automation-runner.tsx`: Background automation service
  - `store/`: Zustand state management
- `src-tauri/`: Rust backend and Tauri configuration

## Learn More

- [Tauri Documentation](https://tauri.app/)
- [Next.js Documentation](https://nextjs.org/docs)
