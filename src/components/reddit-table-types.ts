/**
 * Types and interfaces for the Reddit Table component
 * Defines data structures used throughout the component
 */

import type { Message, SearchState } from "./smart-data-tables";

/**
 * Represents a Reddit post with all its properties
 */
export type RedditPost = {
  id: number;
  timestamp: number;
  formatted_date: string;
  title: string;
  url: string;
  sort_type: string; // Renamed from relevance
  relevance_score: number; // Added new field
  subreddit: string;
  permalink: string;
  engaged: number; // Changed from boolean to number (0 or 1)
  assignee: string;
  notes: string;
  num_comments?: number;
  author?: string;
  score?: number;
  is_self?: boolean;
  selftext?: string | null;
  name?: string;
  date_added: number;
  interest: number; // Added new field (0-5)
  // Client-side fields
  status?: "new" | "investigating" | "replied" | "closed" | "ignored";
  intent?: string;
  category?: "brand" | "competitor" | "general";
  segment?: string;
  tone?: "positive" | "neutral" | "negative";
};

/**
 * Represents a comment tree structure for nested comments
 */
export interface CommentTree extends Message {
  children: CommentTree[];
}

/**
 * Field types that can be used for sorting
 */
export type SortField = keyof RedditPost | null;

/**
 * Direction for sorting (ascending or descending)
 */
export type SortDirection = "asc" | "desc";

/**
 * Props interface for the RedditTable component
 */
export interface RedditTableProps {
  onAddComments: (comments: Message[]) => void;
  externalPosts?: RedditPost[];
  searchState: SearchState;
  onSearchStateChange: (state: SearchState) => void;
  isActive?: boolean;
}