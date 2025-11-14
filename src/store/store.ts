import { create } from "zustand";

interface Subreddit {
  id: string;
  name: string;
  // add other properties as needed
}

interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  url: string;
  relevance: number;
  snippet: string;
  // add other properties as needed
}

interface SubredditsStore {
  subreddits: Subreddit[];
  setSubreddits: (subreddits: Subreddit[]) => void;
}

interface RedditPostsTabStore {
  redditPosts: RedditPost[];
  setRedditPosts: (redditPosts: RedditPost[]) => void;
}

const useSubredditsStore = create<SubredditsStore>((set) => ({
  subreddits: [],
  setSubreddits: (subreddits: Subreddit[]) => set({ subreddits }),
}));

const useRedditPostsTab = create<RedditPostsTabStore>((set) => ({
  redditPosts: [],
  setRedditPosts: (redditPosts: RedditPost[]) => set({ redditPosts }),
}));

export { useSubredditsStore, useRedditPostsTab };
