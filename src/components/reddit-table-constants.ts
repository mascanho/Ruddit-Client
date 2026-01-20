/**
 * Constants and initial data for the Reddit Table component
 */

import type { RedditPost } from "./reddit-table-types";

/**
 * Initial empty array for Reddit posts data
 */
export const initialData: RedditPost[] = []; // Declare initialData here

/**
 * List of team members for assignment functionality
 */
export const teamMembers = [
  { id: "user1", name: "Alex" },
  { id: "user2", name: "Maria" },
  { id: "user3", name: "David" },
  { id: "user4", name: "Sarah" },
];

/**
 * CSV export headers for Reddit posts
 */
export const CSV_HEADERS = [
  "id",
  "timestamp",
  "formatted_date",
  "title",
  "subreddit",
  "url",
  "score",
  "num_comments",
  "intent",
  "author",
  "selftext",
  "status",
  "category",
  "engaged",
  "assignee",
  "notes",
  "interest",
  "segment",
  "tone",
];

/**
 * Table column widths configuration
 */
export const TABLE_COLUMN_WIDTHS = {
  notes: "w-[32px]",
  index: "w-[30px]",
  date: "w-[75px]",
  content: "", // flexible
  subreddit: "w-[160px]",
  status: "w-[95px]",
  engaged: "w-[40px]",
  owner: "w-[45px]",
  segments: "w-[70px]",
  intent: "w-[60px]",
  interest: "w-[80px]",
  tone: "w-[85px]",
  op: "w-[45px]",
} as const;