/**
 * Utility functions for the Reddit Table component
 * Contains helper functions for data processing, formatting, and calculations
 */

import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import moment from "moment";
import type { RedditPost, SortField, SortDirection } from "./reddit-table-types";
import { CSV_HEADERS } from "./reddit-table-constants";

/**
 * Creates a relevance badge component based on score
 */
export const getRelevanceBadge = (relevance_score: number) => {
  if (relevance_score >= 80) {
    return (
      <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20">
        High
      </Badge>
    );
  }
  if (relevance_score >= 60) {
    return (
      <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20">
        Medium
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20">
      Low
    </Badge>
  );
};

/**
 * Calculates the maximum date_added timestamp from posts
 */
export const getMaxDateAdded = (data: RedditPost[]): number => {
  if (data.length === 0) return 0;
  return Math.max(...data.map((p) => p.date_added));
};

/**
 * Finds the latest post timestamp from new posts since last visit
 */
export const getLatestPostTimestamp = (data: RedditPost[], lastVisitTimestamp: number): number => {
  const newPosts = data.filter((p) => p.date_added > lastVisitTimestamp);
  if (newPosts.length === 0) return 0;
  return Math.max(...newPosts.map((p) => p.timestamp));
};

/**
 * Checks if any filters are currently active
 */
export const hasActiveFilters = (
  searchQuery: string,
  subredditFilter: string,
  relevanceFilter: string,
  sortField: SortField,
): boolean => {
  return !!(
    searchQuery ||
    subredditFilter !== "all" ||
    relevanceFilter !== "all" ||
    sortField
  );
};

/**
 * Clears all filters and resets to default state
 */
export const clearFilters = (
  setSearchQuery: (value: string) => void,
  setSubredditFilter: (value: string) => void,
  setRelevanceFilter: (value: string) => void,
  setSortField: (field: SortField) => void,
  setCurrentPage: (page: number) => void,
) => {
  setSearchQuery("");
  setSubredditFilter("all");
  setRelevanceFilter("all");
  setSortField(null);
  setCurrentPage(1);
};

/**
 * Filters and sorts data based on current filters and sort settings
 */
export const getFilteredAndSortedData = (
  data: RedditPost[],
  searchQuery: string,
  subredditFilter: string,
  relevanceFilter: string,
  statusFilter: string,
  engagementFilter: string,
  sortField: SortField,
  sortDirection: SortDirection,
  externalPosts?: RedditPost[],
): RedditPost[] => {
  const filtered = data.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.subreddit.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubreddit =
      subredditFilter === "all" || post.subreddit === subredditFilter;

    const matchesRelevance =
      relevanceFilter === "all" ||
      (relevanceFilter === "high" && post.relevance_score >= 80) ||
      (relevanceFilter === "medium" &&
        post.relevance_score >= 60 &&
        post.relevance_score < 80) ||
      (relevanceFilter === "low" && post.relevance_score < 60);

    const matchesStatus =
      statusFilter === "all" || (post.status || "new") === statusFilter;

    const matchesEngagement =
      engagementFilter === "all" ||
      (engagementFilter === "engaged" && post.engaged === 1) ||
      (engagementFilter === "not_engaged" && post.engaged !== 1);

    return (
      matchesSearch &&
      matchesSubreddit &&
      matchesRelevance &&
      matchesStatus &&
      matchesEngagement
    );
  });

  // Always sort by date_added descending as the primary sort
  filtered.sort((a, b) => b.date_added - a.date_added);

  // Apply secondary sort if a sortField is selected and it's not date_added
  if (sortField && sortField !== "date_added") {
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }

  return filtered;
};

/**
 * Gets unique subreddits from the data
 */
export const getUniqueSubreddits = (data: RedditPost[], externalPosts?: RedditPost[]): string[] => {
  return Array.from(new Set(data.map((post) => post.subreddit)));
};

/**
 * Toggles row expansion state
 */
export const toggleRowExpansion = (
  id: string,
  expandedRows: Set<string>,
  setExpandedRows: (setter: (prev: Set<string>) => Set<string>) => void,
) => {
  setExpandedRows((prev) => {
    const newSet = new Set(prev);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return newSet;
  });
};

/**
 * Handles sort field and direction changes
 */
export const handleSort = (
  field: SortField,
  currentSortField: SortField,
  currentSortDirection: SortDirection,
  setSortField: (field: SortField) => void,
  setSortDirection: (direction: SortDirection) => void,
) => {
  if (currentSortField === field) {
    setSortDirection(currentSortDirection === "asc" ? "desc" : "asc");
  } else {
    setSortField(field);
    setSortDirection("desc");
  }
};

/**
 * Parses CSV line with proper quote handling
 */
export const parseCSVLine = (line: string): string[] => {
  const values: string[] = [];
  let inQuote = false;
  let currentVal = "";
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuote && line[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (char === "," && !inQuote) {
      values.push(currentVal);
      currentVal = "";
    } else {
      currentVal += char;
    }
  }
  values.push(currentVal);
  return values;
};

/**
 * Exports data to CSV format
 */
export const exportToCSV = async (
  filteredAndSortedData: RedditPost[],
  save: (options: any) => Promise<string | null>,
  writeTextFile: (path: string, content: string) => Promise<void>,
) => {
  if (filteredAndSortedData.length === 0) {
    toast.info("No data to export.");
    return;
  }

  const csvContent = [
    CSV_HEADERS.map((h) => `"${h}"`).join(","),
    ...filteredAndSortedData.map((row) => {
      return CSV_HEADERS
        .map((header) => {
          let val = row[header as keyof RedditPost] ?? "";
          if (typeof val === "number") val = val.toString();
          if (typeof val === "boolean") val = val ? "true" : "false";
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",");
    }),
  ].join("\n");

  try {
    const filePath = await save({
      filters: [
        {
          name: "CSV File",
          extensions: ["csv"],
        },
      ],
      defaultPath: `ruddit_table_export_${moment().format("YYYY-MM-DD_HHmm")}.csv`,
    });

    if (filePath) {
      await writeTextFile(filePath, csvContent);
      toast.success(
        `Exported ${filteredAndSortedData.length} items to CSV successfully`,
      );
    }
  } catch (error) {
    console.error("Failed to export data:", error);
    toast.error("Failed to export data.");
  }
};

/**
 * Exports data to JSON format
 */
export const exportToJSON = async (
  filteredAndSortedData: RedditPost[],
  save: (options: any) => Promise<string | null>,
  writeTextFile: (path: string, content: string) => Promise<void>,
) => {
  if (filteredAndSortedData.length === 0) {
    toast.info("No data to export.");
    return;
  }

  const dataStr = JSON.stringify(filteredAndSortedData, null, 2);

  try {
    const filePath = await save({
      filters: [
        {
          name: "JSON File",
          extensions: ["json"],
        },
      ],
      defaultPath: `ruddit_table_export_${moment().format("YYYY-MM-DD_HHmm")}.json`,
    });

    if (filePath) {
      await writeTextFile(filePath, dataStr);
      toast.success(
        `Exported ${filteredAndSortedData.length} items to JSON successfully`,
      );
    }
  } catch (error) {
    console.error("Failed to export JSON:", error);
    toast.error("Failed to export JSON.");
  }
};