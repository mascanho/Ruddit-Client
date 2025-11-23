import { create } from "zustand";

// This should match your Rust PostDataWrapper
interface PostDataWrapper {
  id: string; // i64 in Rust
  timestamp: number; // i64 in Rust
  formatted_date: string;
  title: string;
  url: string;
  relevance: string; // Changed from number to string
  subreddit: string;
  permalink: string;
}

interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  url: string;
  relevance_score: number;
  sort_type: string;
  snippet: string;
  formatted_date: string;
  engaged: number;
  assignee: string;
  notes: string;
  name: string;
  selftext: string | null;
  author: string;
  score: number;
  thumbnail: string | null;
  is_self: boolean;
  num_comments: number;
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
