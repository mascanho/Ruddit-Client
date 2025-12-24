import { create } from "zustand";

// This should match your Rust PostDataWrapper
interface PostDataWrapper {
  id: number;
  timestamp: number;
  formatted_date: string;
  title: string;
  url: string;
  sort_type: string;
  relevance_score: number;
  subreddit: string;
  permalink: string;
  engaged: number;
  assignee: string;
  notes: string;
  name: string;
  selftext?: string | null;
  author: string;
  score: number;
  thumbnail?: string | null;
  is_self: boolean;
  num_comments: number;
  intent: string;
  // Client-side only?
  status?: "new" | "investigating" | "replied" | "closed" | "ignored";
  category?: "brand" | "competitor" | "general";
}

interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  url: string;
  relevance: number;
  snippet: string;
  formatted_date: string;
}

interface SubredditsStore {
  subreddits: PostDataWrapper[]; // Changed from Subreddit[] to PostDataWrapper[]
  setSubreddits: (subreddits: PostDataWrapper[]) => void;
}

interface RedditPostsTabStore {
  redditPosts: RedditPost[];
  setRedditPosts: (redditPosts: RedditPost[]) => void;
}

interface SingleSubredditTable {
  subRedditsSaved: PostDataWrapper[]; // Changed to match backend format
  setSingleSubreddit: (subreddits: PostDataWrapper[]) => void;
  addSingleSubreddit: (subreddit: PostDataWrapper) => void; // Changed parameter type
  clearSavedSubredditsTable: () => void; // Add this method to clear the table
}

const useSubredditsStore = create<SubredditsStore>((set) => ({
  subreddits: [],
  setSubreddits: (subreddits: PostDataWrapper[]) => set({ subreddits }),
}));

const useRedditPostsTab = create<RedditPostsTabStore>((set) => ({
  redditPosts: [],
  setRedditPosts: (redditPosts: RedditPost[]) => set({ redditPosts }),
}));

const useAddSingleSubReddit = create<SingleSubredditTable>((set, get) => ({
  subRedditsSaved: [],
  setSingleSubreddit: (subRedditsSaved: PostDataWrapper[]) =>
    set({ subRedditsSaved }),
  addSingleSubreddit: (subreddit: PostDataWrapper) => {
    const current = get().subRedditsSaved || [];
    const exists = current.some((s) => s.id === subreddit.id);
    if (!exists) {
      set({ subRedditsSaved: [...current, subreddit] });
    }
  },
  clearSavedSubredditsTable: () => set({ subRedditsSaved: [] }),
}));

// AUTOMATION STORE
interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

interface AutomationStore {
  isRunning: boolean;
  intervalMinutes: number;
  lastRun: Date | null;
  logs: LogEntry[];
  foundPosts: PostDataWrapper[];
  setIsRunning: (isRunning: boolean) => void;
  setIntervalMinutes: (minutes: number) => void;
  setLastRun: (date: Date) => void;
  addLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  clearLogs: () => void;
  addFoundPosts: (posts: PostDataWrapper[]) => void;
  clearFoundPosts: () => void;
}

const useAutomationStore = create<AutomationStore>((set) => ({
  isRunning: false,
  intervalMinutes: 15,
  lastRun: null,
  logs: [],
  foundPosts: [],
  setIsRunning: (isRunning) => set({ isRunning }),
  setIntervalMinutes: (intervalMinutes) => set({ intervalMinutes }),
  setLastRun: (lastRun) => set({ lastRun }),
  addLog: (message, type = "info") =>
    set((state) => ({
      logs: [
        {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date(),
          message,
          type,
        },
        ...state.logs,
      ].slice(0, 100), // Keep last 100 logs
    })),
  clearLogs: () => set({ logs: [] }),
  addFoundPosts: (newPosts) =>
    set((state) => {
      // Avoid duplicates based on ID
      const existingIds = new Set(state.foundPosts.map((p) => p.id));
      const uniqueNewPosts = newPosts.filter((p) => !existingIds.has(p.id));
      return {
        foundPosts: [...uniqueNewPosts, ...state.foundPosts].slice(0, 500), // Limit total stored posts
      };
    }),
  clearFoundPosts: () => set({ foundPosts: [] }),
}));

export { useSubredditsStore, useRedditPostsTab, useAddSingleSubReddit, useAutomationStore };
export type { PostDataWrapper, RedditPost, LogEntry };
