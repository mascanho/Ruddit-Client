import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  date_added: number;
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
  removeSingleSubreddit: (postId: number) => void;
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
  removeSingleSubreddit: (postId: number) => {
    set((state) => ({
      subRedditsSaved: state.subRedditsSaved.filter((p) => p.id !== postId),
    }));
  },
  clearSavedSubredditsTable: () => set({ subRedditsSaved: [] }),
}));

// AUTOMATION STORE
interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

interface AutomationStore {
  isRunning: boolean;
  intervalMinutes: number;
  lastRun: number | null;
  logs: LogEntry[];
  foundPosts: PostDataWrapper[];
  setIsRunning: (isRunning: boolean) => void;
  setIntervalMinutes: (minutes: number) => void;
  setLastRun: (timestamp: number) => void;
  addLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  clearLogs: () => void;
  addFoundPosts: (posts: PostDataWrapper[]) => void;
  clearFoundPosts: () => void;
}

const useAutomationStore = create<AutomationStore>()(
  persist(
    (set) => ({
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
              timestamp: Date.now(),
              message,
              type,
            },
            ...state.logs,
          ],
        })),
      clearLogs: () => set({ logs: [] }),
      addFoundPosts: (newPosts) =>
        set((state) => {
          const existingIds = new Set(state.foundPosts.map((p) => p.id));
          const uniqueNewPosts = newPosts.filter((p) => !existingIds.has(p.id));
          return {
            foundPosts: [...uniqueNewPosts, ...state.foundPosts],
          };
        }),
      clearFoundPosts: () => set({ foundPosts: [] }),
    }),
    {
      name: "ruddit-automation-storage",
    }
  )
);

export { useSubredditsStore, useRedditPostsTab, useAddSingleSubReddit, useAutomationStore };
export type { PostDataWrapper, RedditPost, LogEntry };
