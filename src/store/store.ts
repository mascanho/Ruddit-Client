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

export { useSubredditsStore, useRedditPostsTab, useAddSingleSubReddit };
export type { PostDataWrapper, RedditPost };
