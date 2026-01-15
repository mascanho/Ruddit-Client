/**
 * Custom hook for managing RedditTable component state
 * Centralizes all state management for the table
 */

import { useState, useEffect } from "react";
import { useAppSettings } from "@/store/settings-store";
import type { RedditPost, SortField, SortDirection } from "./reddit-table-types";
import { initialData } from "./reddit-table-constants";

/**
 * Hook that manages all state for the RedditTable component
 */
export function useRedditTableState() {
  // Main data state
  const [data, setData] = useState<RedditPost[]>(initialData);

  // Settings hook
  const { settings, updateSettings } = useAppSettings();

  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [engagementFilter, setEngagementFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");

  // Sorting states
  const [sortField, setSortField] = useState<SortField>(
    settings.defaultSortField === "none"
      ? null
      : (settings.defaultSortField as SortField),
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    settings.defaultSortDirection,
  );

  // UI states
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null);
  const [commentsPost, setCommentsPost] = useState<RedditPost | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(settings.rowsPerPage);
  const [showClearTableDialog, setShowClearTableDialog] = useState(false);
  const [sortTypeForComments, setSortTypeForComments] = useState("best");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingNotePost, setEditingNotePost] = useState<RedditPost | null>(null);
  const [editingSegmentPost, setEditingSegmentPost] = useState<RedditPost | null>(null);
  const [currentNote, setCurrentNote] = useState("");
  const [lastVisitTimestamp, setLastVisitTimestamp] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);

  // Load last visit timestamp on mount
  useEffect(() => {
    const savedTimestamp = parseInt(
      localStorage.getItem("atalaia-last-visit-timestamp") || "0",
      10,
    );
    setLastVisitTimestamp(savedTimestamp);
  }, []);

  // Update rows per page when settings change
  useEffect(() => {
    setRowsPerPage(settings.rowsPerPage);
  }, [settings.rowsPerPage]);

  return {
    // Data
    data,
    setData,

    // Filters
    statusFilter,
    setStatusFilter,
    engagementFilter,
    setEngagementFilter,
    segmentFilter,
    setSegmentFilter,

    // Sorting
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,

    // UI
    deleteId,
    setDeleteId,
    selectedPost,
    setSelectedPost,
    commentsPost,
    setCommentsPost,
    comments,
    setComments,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    showClearTableDialog,
    setShowClearTableDialog,
    sortTypeForComments,
    setSortTypeForComments,
    expandedRows,
    setExpandedRows,
    editingNotePost,
    setEditingNotePost,
    editingSegmentPost,
    setEditingSegmentPost,
    currentNote,
    setCurrentNote,
    lastVisitTimestamp,
    setLastVisitTimestamp,
    showPreview,
    setShowPreview,

    // Settings
    settings,
    updateSettings,
  };
}