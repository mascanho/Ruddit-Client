//@ts-nocheck
"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { Message, SearchState } from "./smart-data-tables";
import { RedditCommentsView } from "./reddit-comments-view";
import { KeywordHighlighter } from "./keyword-highlighter";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { useAddSingleSubReddit } from "@/store/store";
import { toast } from "sonner";
import moment from "moment";
import { useOpenUrl } from "@/hooks/useOpenUrl";
import {
  getStatusColor,
  getIntentColor,
  getSegmentColor,
  getToneColor,
} from "@/lib/marketing-utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// UI Components
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Icons
import {
  ChevronDown,
  User,
  Pencil,
  CheckCircle2,
  Circle,
  Star,
  MessageCircle,
  ArrowUpDown,
  Radar,
  UserPlus,
  MoreVertical,
  Trash2,
  Notebook,
  ExternalLink,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  TrendingUp,
  Activity,
  MessageSquare,
  History,
  Shield,
  Globe,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Post types
import { FileText, Link as LinkIcon, Hash } from "lucide-react";

// Extracted modules
import type {
  RedditPost,
  RedditTableProps,
  SortField,
} from "./reddit-table-types";
import { teamMembers, TABLE_COLUMN_WIDTHS } from "./reddit-table-constants";
import { useRedditTableState } from "./useRedditTableState";
import { useDataManagement } from "./useDataManagement";
import {
  getFilteredAndSortedData,
  getUniqueSubreddits,
  toggleRowExpansion,
  handleSort as handleSortUtil,
  exportToCSV,
  exportToJSON,
} from "./reddit-table-utils";

// Sub-components
import { Filters } from "./Filters";
import { Actions } from "./Actions";
import { RedditTableHeader } from "./RedditTableHeader";

/**
 * Main RedditTable component function
 *
 * @param onAddComments - Callback to add comments to the parent component
 * @param externalPosts - Posts data from external sources (optional)
 * @param searchState - Current search/filter state
 * @param onSearchStateChange - Callback to update search state
 * @param isActive - Whether this tab is currently active
 */
export function RedditTable({
  onAddComments,
  externalPosts = [],
  searchState,
  onSearchStateChange,
  isActive = false,
  onOpenSettings,
}: RedditTableProps & { onOpenSettings?: () => void }) {
  // Use custom hook for state management
  const {
    data,
    setData,
    statusFilter,
    setStatusFilter,
    engagementFilter,
    setEngagementFilter,
    segmentFilter,
    setSegmentFilter,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
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
    toneFilter,
    setToneFilter,
    editingTonePost,
    setEditingTonePost,
    settings,
    updateSettings,
  } = useRedditTableState();

  const {
    addSingleSubreddit,
    removeSingleSubreddit,
    clearSavedSubredditsTable,
  } = useAddSingleSubReddit();

  const addSubredditToMonitoring = (subreddit: string) => {
    const cleaned = subreddit.trim().toLowerCase().replace(/^r\//, "");
    if (settings.monitoredSubreddits.includes(cleaned)) {
      toast.info(`Already monitoring r/${cleaned}`, {
        position: "bottom-center",
      });
      return;
    }

    updateSettings({
      monitoredSubreddits: [...settings.monitoredSubreddits, cleaned],
    });

    toast.success(`Now monitoring r/${cleaned}`, {
      position: "bottom-center",
    });
  };

  const addSubredditToBlacklist = (subreddit: string) => {
    const cleaned = subreddit.trim().toLowerCase().replace(/^r\//, "");
    if ((settings.blacklistSubreddits || []).includes(cleaned)) {
      toast.info(`r/${cleaned} is already blacklisted`, {
        position: "bottom-center",
      });
      return;
    }

    updateSettings({
      blacklistSubreddits: [...(settings.blacklistSubreddits || []), cleaned],
    });

    toast.success(`r/${cleaned} added to blacklist`, {
      position: "bottom-center",
    });
  };

  const openUrl = useOpenUrl();
  const keywordsToHighlight = useMemo(() => {
    return [
      ...(settings.monitoredKeywords || []),
      ...(settings.brandKeywords || []),
      ...(settings.competitorKeywords || []),
    ].filter(Boolean);
  }, [
    settings.monitoredKeywords,
    settings.brandKeywords,
    settings.competitorKeywords,
  ]);

  // Load CRM data from localStorage on mount and merge with data
  useEffect(() => {
    if (data.length === 0) return;
    const storedCrm = JSON.parse(
      localStorage.getItem("atalaia-crm-data") || "{}",
    );

    // Only update if we have new data to merge to avoid infinite loop if we put this in the dependency array incorrectly
    // Actually, we should do this when data *changes* from external sources (initial load)
    // But since `data` is local state initialized from `initialData` (empty) and then populated in useEffect,
    // we can intercept the setting of data there.
  }, []);

  const updateCrmData = (postId: number, updates: Partial<RedditPost>) => {
    // Update local state
    setData((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, ...updates } : p)),
    );

    // Update LocalStorage
    const storedCrm = JSON.parse(
      localStorage.getItem("atalaia-crm-data") || "{}",
    );
    const postData = storedCrm[postId] || {};
    storedCrm[postId] = { ...postData, ...updates };
    localStorage.setItem("atalaia-crm-data", JSON.stringify(storedCrm));
  };

  useEffect(() => {
    if (externalPosts.length > 0) {
      const storedCrm = JSON.parse(
        localStorage.getItem("atalaia-crm-data") || "{}",
      );

      setData((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newPosts = externalPosts.filter((p) => !existingIds.has(p.id));

        // Merge with CRM data
        const mergedNewPosts = newPosts.map((p) => ({
          ...p,
          status: storedCrm[p.id]?.status || p.status || "new",
          intent: storedCrm[p.id]?.intent || p.intent || "low", // default to low if unknown? or calculate?
          category: storedCrm[p.id]?.category || p.category || "general",
          engaged: storedCrm[p.id]?.engaged ?? p.engaged ?? 0, // Add engaged status
          segment: storedCrm[p.id]?.segment || p.segment || "",
          tone: storedCrm[p.id]?.tone || p.tone || "neutral",
        }));

        // Also update existing posts with CRM data if needed (e.g. on reload)
        const updatedPrev = prev.map((p) => ({
          ...p,
          status: storedCrm[p.id]?.status || p.status || "new",
          intent: storedCrm[p.id]?.intent || p.intent,
          category: storedCrm[p.id]?.category || p.category,
          engaged: storedCrm[p.id]?.engaged ?? p.engaged ?? 0, // Add engaged status
          segment: storedCrm[p.id]?.segment || p.segment || "",
          tone: storedCrm[p.id]?.tone || p.tone || "neutral",
        }));

        return [...updatedPrev, ...mergedNewPosts];
      });
    }
  }, [externalPosts, toast]);

  const searchQuery = searchState.redditSearch;
  const setSearchQuery = (value: string) =>
    onSearchStateChange({ ...searchState, redditSearch: value });
  const subredditFilter = searchState.redditSubreddit;
  const setSubredditFilter = (value: string) =>
    onSearchStateChange({ ...searchState, redditSubreddit: value });
  const relevanceFilter = searchState.redditRelevance;
  const setRelevanceFilter = (value: string) =>
    onSearchStateChange({ ...searchState, redditRelevance: value });

  // State management is now handled by useRedditTableState hook

  const maxDateAdded = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.max(...data.map((p) => p.date_added));
  }, [data]);

  const latestPostTimestamp = useMemo(() => {
    const newPosts = data.filter((p) => p.date_added > lastVisitTimestamp);
    if (newPosts.length === 0) return 0;
    return Math.max(...newPosts.map((p) => p.timestamp));
  }, [data, lastVisitTimestamp]);

  // Effect to persist the latest timestamp to localStorage for the next session
  // Done only when the tab becomes active to "acknowledge" current posts
  useEffect(() => {
    if (isActive && maxDateAdded > 0) {
      localStorage.setItem(
        "atalaia-last-visit-timestamp",
        maxDateAdded.toString(),
      );
    }
  }, [isActive, maxDateAdded === 0]); // Trigger when isActive changes or when first data arrives

  const handleEditNote = (post: RedditPost) => {
    setEditingNotePost(post);
    setCurrentNote(post.notes || "");
  };

  const handleSaveNote = async () => {
    if (!editingNotePost) return;

    try {
      await invoke("update_post_notes", {
        id: editingNotePost.id,
        notes: currentNote,
      });
      toast.success("Note saved successfully");

      // Update local data
      setData((prevData) =>
        prevData.map((p) =>
          p.id === editingNotePost.id ? { ...p, notes: currentNote } : p,
        ),
      );
      // also update external posts

      setEditingNotePost(null);
      setCurrentNote("");
    } catch (error) {
      console.error("Failed to save note:", error);
      toast.error("Failed to save note");
    }
  };

  const toggleRowExpansion = (id: string) => {
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

  const handleAssign = async (postId: number, personName: string) => {
    const postToUpdate = data.find((p) => p.id === postId);
    if (!postToUpdate) return;

    const originalAssignee = postToUpdate.assignee;
    const assigneeToSave = personName === "unassigned" ? "" : personName;

    // Optimistic update
    setData((prevData) =>
      prevData.map((p) =>
        p.id === postId ? { ...p, assignee: assigneeToSave } : p,
      ),
    );

    try {
      await invoke("update_post_assignee", {
        id: postId,
        assignee: assigneeToSave,
        title: postToUpdate.title,
      });

      if (personName !== "unassigned") {
        toast.success(
          `Post "${postToUpdate.title.slice(0, 20)}..." assigned to ${personName}.`,
        );
      } else {
        toast.info(`Post "${postToUpdate.title.slice(0, 20)}..." unassigned.`);
      }
    } catch (error) {
      console.error("Failed to assign post:", error);
      toast.error("Failed to assign post");
      // Revert on error
      setData((prevData) =>
        prevData.map((p) =>
          p.id === postId ? { ...p, assignee: originalAssignee } : p,
        ),
      );
    }
  };

  const handleEngagedToggle = async (postId: number, isEngaged: boolean) => {
    const postToUpdate = data.find((p) => p.id === postId);
    if (!postToUpdate) return;

    const originalEngagedStatus = postToUpdate.engaged;
    const newEngagedStatus = isEngaged ? 1 : 0;

    // Optimistic update
    setData((prevData) =>
      prevData.map((p) =>
        p.id === postId ? { ...p, engaged: newEngagedStatus } : p,
      ),
    );

    // Update CRM data in localStorage
    updateCrmData(postId, { engaged: newEngagedStatus });

    try {
      await invoke("update_post_engaged_status", {
        id: postId,
        engaged: newEngagedStatus,
      });

      toast.success(
        `Post "${postToUpdate.title.slice(0, 20)}..." marked as ${isEngaged ? "engaged" : "not engaged"}.`,
      );
    } catch (error) {
      console.error("Failed to update engaged status:", error);
      toast.error("Failed to update engaged status");
      // Revert on error
      setData((prevData) =>
        prevData.map((p) =>
          p.id === postId ? { ...p, engaged: originalEngagedStatus } : p,
        ),
      );
      // Revert localStorage on error as well
      updateCrmData(postId, { engaged: originalEngagedStatus });
    }
  };

  const handleInterestChange = async (postId: number, newInterest: number) => {
    const postToUpdate = data.find((p) => p.id === postId);
    if (!postToUpdate) return;

    const originalInterest = postToUpdate.interest;

    // Optimistic update
    setData((prevData) =>
      prevData.map((p) =>
        p.id === postId ? { ...p, interest: newInterest } : p,
      ),
    );

    try {
      await invoke("update_post_interest", {
        id: postId,
        interest: newInterest,
      });

      toast.success(
        `Interest level updated for "${postToUpdate.title.slice(0, 20)}...".`,
        {
          duration: 1500,
        },
      );
    } catch (error) {
      console.error("Failed to update interest status:", error);
      toast.error("Failed to update interest level");
      // Revert on error
      setData((prevData) =>
        prevData.map((p) =>
          p.id === postId ? { ...p, interest: originalInterest } : p,
        ),
      );
    }
  };

  const handleSegmentChange = (postId: number, newSegment: string) => {
    const postToUpdate = data.find((p) => p.id === postId);
    if (!postToUpdate) return;

    const originalSegment = postToUpdate.segment;

    // Optimistic update
    setData((prevData) =>
      prevData.map((p) =>
        p.id === postId ? { ...p, segment: newSegment } : p,
      ),
    );

    // Update CRM data in localStorage
    updateCrmData(postId, { segment: newSegment });

    toast.success(
      `Segment updated for "${postToUpdate.title.slice(0, 20)}...".`,
      {
        duration: 1500,
      },
    );
  };

  const handleToneChange = (
    postId: number,
    newTone: "positive" | "neutral" | "negative",
  ) => {
    setData((prevData) =>
      prevData.map((p) => (p.id === postId ? { ...p, tone: newTone } : p)),
    );

    updateCrmData(postId, { tone: newTone });

    toast.success("Tone updated", { duration: 1500 });
  };

  const subreddits = useMemo(() => {
    return Array.from(new Set(data.map((post) => post.subreddit)));
  }, [data, externalPosts]);

  const segments = useMemo(() => {
    return settings.monitoredSegments || [];
  }, [settings.monitoredSegments]);

  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.subreddit.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSubreddit =
        subredditFilter === "all" || post.subreddit === subredditFilter;

      const matchesRelevance =
        relevanceFilter === "all" ||
        (relevanceFilter === "high" && post.relevance_score >= 80) || // Use relevance_score
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

      const matchesSegment =
        segmentFilter === "all" || post.segment === segmentFilter;

      const matchesTone =
        toneFilter === "all" || (post.tone || "neutral") === toneFilter;

      return (
        matchesSearch &&
        matchesSubreddit &&
        matchesRelevance &&
        matchesStatus &&
        matchesEngagement &&
        matchesSegment &&
        matchesTone
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
  }, [
    data,
    searchQuery,
    subredditFilter,
    relevanceFilter,
    statusFilter,
    engagementFilter,
    segmentFilter,
    toneFilter,
    sortField,
    sortDirection,
    externalPosts,
  ]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const paginatedData = useMemo(() => {
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, startIndex, endIndex]);

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    subredditFilter,
    relevanceFilter,
    statusFilter,
    engagementFilter,
    segmentFilter,
    toneFilter,
  ]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleDelete = async (id: number) => {
    if (!settings.confirmDelete) {
      setData(data.filter((post) => post.id !== id));
      removeSingleSubreddit(id); // Update store
      return;
    }

    await invoke("remove_single_reddit_command", { post: id });
    toast.info("Post deleted successfully");
    setData((prevData) => prevData.filter((post) => post.id !== id));
    removeSingleSubreddit(id); // Update store
    // No need to reload the window, UI updates via state change
  };

  const handleGetComments = async (post: RedditPost, sort_type: string) => {
    if (!post.subreddit || post.subreddit === "N/A" || !post.permalink) {
      toast.error("Decryption Failed: Non-Reddit Node", {
        description:
          "This record lacks a valid Reddit transmission path. Signal synchronization is impossible.",
      });
      return;
    }

    try {
      const fetchedComments = (await invoke("get_post_comments_command", {
        url: post.permalink,
        title: post.title,
        sortType: sort_type,
        subreddit: post.subreddit,
        fullname: post.name,
      })) as Message[];

      setComments(fetchedComments || []);
      setCommentsPost(post);
      onAddComments(fetchedComments || []);
      setData((prevData) =>
        prevData.map((p) =>
          p.id === post.id
            ? { ...p, num_comments: (fetchedComments || []).length }
            : p,
        ),
      );
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast.error(`Transmission Error: ${error}`, {
        description:
          "Failed to fetch Reddit comments. Please verify your connection.",
      });
    }
  };

  const handleSortTypeForCommentsChange = async (newSortType: string) => {
    setSortTypeForComments(newSortType);
    if (commentsPost) {
      await handleGetComments(commentsPost, newSortType);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSubredditFilter("all");
    setRelevanceFilter("all");
    setStatusFilter("all");
    setEngagementFilter("all");
    setSegmentFilter("all");
    setSortField(null);
    setCurrentPage(1);
  };

  const getRelevanceBadge = (relevance_score: number) => {
    // Renamed parameter
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

  const hasActiveFilters =
    searchQuery ||
    subredditFilter !== "all" ||
    relevanceFilter !== "all" ||
    statusFilter !== "all" ||
    engagementFilter !== "all" ||
    segmentFilter !== "all" ||
    sortField;

  const handleClearTable = async () => {
    try {
      await invoke("clear_saved_reddits");
      toast("Table is being cleared", {
        description: "All your entries will be removed from the UI.",
        position: "top-center",
      });
      setData([]); // Clear local state
      clearSavedSubredditsTable(); // Update store
      // No need to reload the window, UI updates via state change
    } catch (err) {
      console.log(err);
    }
  };

  const handleExportToCsv = async () => {
    if (filteredAndSortedData.length === 0) {
      toast.info("No data to export.");
      return;
    }

    const headers = [
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
    ];

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...filteredAndSortedData.map((row) => {
        return headers
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

  const handleExportToJSON = async () => {
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

  const handleImportClick = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Data Files",
            extensions: ["json", "csv"],
          },
        ],
      });

      if (!selected) return;

      const filePath = Array.isArray(selected) ? selected[0] : selected;
      if (!filePath) return;

      const content = await readTextFile(filePath);
      let importedPosts: RedditPost[] = [];

      if (filePath.endsWith(".json")) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          importedPosts = parsed;
        } else {
          toast.error("Invalid JSON structure. Expected an array.");
          return;
        }
      } else if (filePath.endsWith(".csv")) {
        const lines = content.split(/\r\n|\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          toast.error("CSV file appears empty or missing headers");
          return;
        }

        const parseCSVLine = (line: string): string[] => {
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

        const headerLine = lines[0];
        const headers = parseCSVLine(headerLine).map((h) =>
          h.trim().replace(/^"|"$/g, ""),
        );

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          // Be more tolerant: as long as we have some values, try to map them
          if (values.length === 0) continue;

          const rowData: any = {};
          headers.forEach((header, idx) => {
            const key = header.trim();
            const val = (values[idx] || "").trim().replace(/^"|"$/g, "");

            if (
              [
                "score",
                "num_comments",
                "timestamp",
                "relevance_score",
                "date_added",
                "engaged",
                "interest",
              ].includes(key)
            ) {
              rowData[key] = Number(val) || 0;
            } else if (key === "id") {
              const idStr = String(val);
              // Handle Reddit base36 IDs if they were exported as strings
              if (/[a-z]/i.test(idStr)) {
                rowData.id = parseInt(idStr, 36);
              } else {
                rowData.id = Number(idStr) || 0;
              }
            } else if (key === "is_self") {
              rowData[key] = val === "true" || val === "1";
            } else {
              rowData[key] = val;
            }
          });

          // Ensure basic validity
          if (rowData.id) {
            importedPosts.push(rowData as RedditPost);
          }
        }
      }

      if (importedPosts.length > 0) {
        console.log(`Attempting to import ${importedPosts.length} posts...`);

        let addedCount = 0;
        let duplicateCount = 0;

        for (const post of importedPosts) {
          try {
            // Save to database
            const isInserted = await invoke("save_single_reddit_command", {
              post,
            });

            if (isInserted) {
              addSingleSubreddit(post as any);
              addedCount++;
            } else {
              duplicateCount++;
            }
          } catch (e) {
            console.error("Failed to save imported post:", post.id, e);
          }
        }

        if (addedCount > 0) {
          toast.success(
            `Registry updated: ${addedCount} new nodes transmitted.`,
          );
        } else if (duplicateCount > 0) {
          toast.info(`${duplicateCount} nodes were already in the registry.`);
        }

        // Reset filters in UI to show results immediately
        setStatusFilter("all");
        setEngagementFilter("all");
        setSegmentFilter("all");
        setToneFilter("all");
        setSubredditFilter("all");
        setRelevanceFilter("all");
        if (onSearchStateChange) {
          onSearchStateChange({
            ...searchState,
            redditSearch: "",
            redditSubreddit: "all",
            redditRelevance: "all",
          });
        }
      } else {
        toast.info("Null Buffer: No valid data found in import source.");
      }
    } catch (err) {
      console.error("Import error", err);
      toast.error("Failed to process file");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3">
      <Card className="p-2 shadow-sm border-border/60 bg-white backdrop-blur-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Filters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            subredditFilter={subredditFilter}
            setSubredditFilter={setSubredditFilter}
            relevanceFilter={relevanceFilter}
            setRelevanceFilter={setRelevanceFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            engagementFilter={engagementFilter}
            setEngagementFilter={setEngagementFilter}
            segmentFilter={segmentFilter}
            setSegmentFilter={setSegmentFilter}
            toneFilter={toneFilter}
            setToneFilter={setToneFilter}
            subreddits={subreddits}
            segments={segments}
            onOpenSettings={onOpenSettings}
          />
          <Actions
            filteredAndSortedDataLength={filteredAndSortedData.length}
            onExportCsv={handleExportToCsv}
            onExportJson={handleExportToJSON}
            onImport={handleImportClick}
            onClearTable={() => setShowClearTableDialog(true)}
          />
          <div className="text-[10px] uppercase font-bold tracking-widest opacity-60 px-2 border-l border-border/40 ml-2">
            {filteredAndSortedData.length} / {data.length}
          </div>
        </div>
      </Card>

      <Card className="p-0 m-0 flex-1 min-h-0 flex flex-col">
        {/* Single Table Container with Fixed Header */}
        <div className="flex-1 overflow-auto relative custom-scroll">
          <Table
            containerClassName="overflow-visible"
            className="table-fixed w-full border-separate border-spacing-0"
          >
            <colgroup>
              <col className="w-[32px]" />
              <col className="w-[30px]" />
              <col className="w-[75px]" />
              <col />
              <col className="w-[160px]" />
              <col className="w-[95px]" />
              <col className="w-[40px]" />
              <col className="w-[45px]" />
              <col className="w-[70px]" />
              <col className="w-[60px]" />
              <col className="w-[85px]" />
              <col className="w-[80px]" />
              <col className="w-[45px]" />
            </colgroup>
            <RedditTableHeader onSort={handleSort} />

            {/* Scrollable Body */}
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={13}
                    className="h-24 text-center text-muted-foreground opacity-50"
                  >
                    No posts matching your current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((post, index) => (
                  <Fragment key={post.id}>
                    <TableRow
                      key={post.id}
                      className={`group hover:z-10 relative text-[11px] transition-all duration-300 border-b border-border/40
                        ${
                          post.date_added > lastVisitTimestamp
                            ? "bg-blue-500/5 dark:bg-blue-500/10 border-l-[3px] border-l-blue-500/80 shadow-[inset_1px_0_0_0_rgba(59,130,246,0.2)]"
                            : `border-l-[3px] border-l-transparent hover:bg-muted/30 ${index % 2 === 0 ? "bg-background" : "bg-muted/5"}`
                        }
                        ${
                          settings.tableDensity === "compact"
                            ? "h-[32px]"
                            : settings.tableDensity === "spacious"
                              ? "h-16"
                              : "h-12"
                        }`}
                    >
                      <TableCell className="px-1 text-center relative">
                        {post.notes && (
                          <div className="absolute top-1 right-1">
                            <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowExpansion(post.id.toString());
                          }}
                          className={`h-7 w-7 rounded-lg transition-all duration-300 shadow-none relative z-10 flex items-center justify-center mx-auto hover:bg-primary/10 hover:text-primary ${
                            expandedRows.has(post.id.toString())
                              ? "bg-primary/5 text-primary opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform duration-500 ${
                              expandedRows.has(post.id.toString())
                                ? "rotate-180"
                                : ""
                            }`}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="text-muted-foreground/30 font-mono text-[9px] px-1 text-center group-hover:text-muted-foreground/60 transition-colors">
                        {(currentPage - 1) * rowsPerPage + index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] px-2 whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-foreground/80">
                            {post?.formatted_date?.slice(5, 10).trim() || "N/A"}
                          </span>
                          <span className="text-[8px] opacity-50 uppercase tracking-tighter">
                            {post?.formatted_date?.slice(0, 4)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 min-w-0 max-w-0 w-full overflow-hidden">
                        <div className="flex flex-col gap-1 py-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="shrink-0 h-6 w-6 rounded-md bg-muted/40 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-all border border-border/40">
                              {post.is_self ? (
                                <FileText className="h-3 w-3" />
                              ) : (
                                <LinkIcon className="h-3 w-3" />
                              )}
                            </div>
                            <div
                              onClick={() => openUrl(post.url)}
                              className="font-semibold text-[11.5px] cursor-pointer hover:underline truncate text-foreground/80 group-hover:text-primary transition-all duration-300"
                              title={post.title}
                            >
                              <KeywordHighlighter
                                text={post.title || "No title"}
                                brandKeywords={settings.brandKeywords}
                                competitorKeywords={settings.competitorKeywords}
                                generalKeywords={settings.monitoredKeywords}
                                searchQuery={searchQuery}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-[9px] font-medium">
                            <div
                              className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-primary transition-colors bg-muted/20 px-1.5 py-0.5 rounded border border-border/20"
                              onClick={() =>
                                handleGetComments(post, post.sort_type)
                              }
                            >
                              <MessageSquare className="h-2.5 w-2.5 opacity-60" />
                              <span>{post.num_comments ?? 0} comments</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/20 px-1.5 py-0.5 rounded border border-border/20">
                              <TrendingUp className="h-2.5 w-2.5 opacity-60" />
                              <span>{post.score ?? 0} karma</span>
                            </div>
                            {post.author && (
                              <div className="flex items-center gap-1.5 text-muted-foreground/60 hover:text-primary transition-colors">
                                <User className="h-2.5 w-2.5 opacity-40" />
                                <span className="truncate opacity-80 uppercase tracking-tighter font-bold">
                                  u/{post.author}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-1 text-center overflow-hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Badge
                              variant="outline"
                              className={`font-mono text-[9px] py-0.5 h-5 px-2.5 cursor-pointer hover:scale-105 active:scale-95 selection:bg-transparent transition-all truncate max-w-full inline-flex items-center gap-1.5 border-dashed ${
                                (settings.blacklistSubreddits || []).includes(
                                  post.subreddit
                                    .toLowerCase()
                                    .replace(/^r\//, ""),
                                )
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20"
                                  : "bg-background/80 border-muted-foreground/20 hover:border-primary/40 hover:text-primary"
                              }`}
                              title={`r/${post.subreddit}`}
                            >
                              <Globe className="h-2.5 w-2.5 opacity-40" />
                              r/{post.subreddit}
                            </Badge>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            className="rounded-xl border-border/40 shadow-2xl backdrop-blur-xl"
                          >
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-40">
                              Community Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="opacity-40" />
                            <DropdownMenuItem
                              className="text-xs focus:bg-primary/5 focus:text-primary rounded-lg transition-colors"
                              onClick={() =>
                                addSubredditToMonitoring(post.subreddit)
                              }
                            >
                              <Radar className="h-3.5 w-3.5 mr-2 opacity-60" />
                              Monitor Intelligence Feed
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      <TableCell className="px-1 min-w-[90px]">
                        <Select
                          value={post.status || "new"}
                          onValueChange={(value) =>
                            updateCrmData(post.id, { status: value as any })
                          }
                        >
                          <SelectTrigger
                            className={`w-full h-7 text-[9px] uppercase tracking-widest px-2.5 border-0 shadow-none ring-0 focus:ring-0 ${getStatusColor(
                              post.status,
                            )} hover:brightness-110 active:scale-95 transition-all font-black rounded-lg`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-border/40 shadow-2xl bg-background/95 backdrop-blur-xl">
                            <SelectItem
                              value="new"
                              className="text-[10px] font-bold uppercase tracking-wider"
                            >
                              New Lead
                            </SelectItem>
                            <SelectItem
                              value="investigating"
                              className="text-[10px] font-bold uppercase tracking-wider"
                            >
                              Researching
                            </SelectItem>
                            <SelectItem
                              value="replied"
                              className="text-[10px] font-bold uppercase tracking-wider"
                            >
                              Engaged
                            </SelectItem>
                            <SelectItem
                              value="closed"
                              className="text-[10px] font-bold uppercase tracking-wider"
                            >
                              Won / Closed
                            </SelectItem>
                            <SelectItem
                              value="ignored"
                              className="text-[10px] font-bold uppercase tracking-wider"
                            >
                              Disqualified
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="px-1 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 rounded-lg transition-all active:scale-75 ${post.engaged === 1 ? "bg-green-500/10 text-green-600 hover:bg-green-500/20" : "hover:bg-muted opacity-40"}`}
                          onClick={() =>
                            handleEngagedToggle(post.id, post.engaged !== 1)
                          }
                        >
                          {post.engaged === 1 ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>

                      <TableCell className="px-1 text-center">
                        <Select
                          value={post.assignee || "unassigned"}
                          onValueChange={(value) =>
                            handleAssign(post.id, value)
                          }
                        >
                          <SelectTrigger className="w-8 h-8 rounded-xl mx-auto p-0.5 border border-border/40 bg-muted/20 ring-0 focus:ring-0 [&>svg]:hidden transition-all hover:border-primary/40 active:scale-90 shadow-sm">
                            <Avatar className="h-full w-full rounded-[10px]">
                              {post.assignee &&
                              post.assignee !== "unassigned" ? (
                                <>
                                  <AvatarImage
                                    src={`https://avatar.vercel.sh/${post.assignee}`}
                                    alt={post.assignee}
                                  />
                                  <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-black">
                                    {post.assignee.slice(0, 1).toUpperCase()}
                                  </AvatarFallback>
                                </>
                              ) : (
                                <AvatarFallback className="bg-transparent opacity-20 group-hover:opacity-40">
                                  <UserPlus className="h-3.5 w-3.5" />
                                </AvatarFallback>
                              )}
                            </Avatar>
                          </SelectTrigger>
                          <SelectContent
                            align="center"
                            className="rounded-xl border-border/40 shadow-2xl bg-background/95 backdrop-blur-xl"
                          >
                            <DropdownMenuLabel className="text-[9px] uppercase tracking-widest opacity-40">
                              Assign Resource
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <SelectItem
                              value="unassigned"
                              className="text-xs font-medium"
                            >
                              Unassigned
                            </SelectItem>
                            {teamMembers.map((member) => (
                              <SelectItem
                                key={member.id}
                                value={member.name}
                                className="text-xs font-medium"
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-4 w-4">
                                    <AvatarImage
                                      src={`https://avatar.vercel.sh/${member.name}`}
                                    />
                                    <AvatarFallback>
                                      {member.name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  {member.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="px-1 text-center">
                        {editingSegmentPost?.id === post.id ? (
                          <Select
                            value={post.segment || "none"}
                            onValueChange={(value) => {
                              handleSegmentChange(
                                post.id,
                                value === "none" ? "" : value,
                              );
                              setEditingSegmentPost(null);
                            }}
                          >
                            <SelectTrigger
                              className={`h-7 text-[9px] uppercase tracking-widest px-2 border-0 shadow-none ring-0 focus:ring-0 ${getSegmentColor(post.segment)} hover:brightness-110 transition-all font-black rounded-lg max-w-[70px] truncate`}
                            >
                              <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/40 bg-background/95 backdrop-blur-xl">
                              <SelectItem
                                value="none"
                                className="text-[10px] font-bold uppercase tracking-wider"
                              >
                                No Segment
                              </SelectItem>
                              {(settings.monitoredSegments || []).map(
                                (segment) => (
                                  <SelectItem
                                    key={segment}
                                    value={segment}
                                    className="text-[10px] font-bold uppercase tracking-wider"
                                  >
                                    {segment}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            className={`${getSegmentColor(post.segment)} text-[9px] h-5 px-2 font-black border-0 shadow-sm cursor-pointer hover:brightness-110 active:scale-95 transition-all rounded-lg uppercase tracking-tighter`}
                            onClick={() => setEditingSegmentPost(post)}
                          >
                            {post.segment || "None"}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="px-1 text-center">
                        {post.intent && (
                          <Badge
                            className={`${getIntentColor(
                              post.intent.toLowerCase(),
                            )} text-[9px] h-5 px-2 font-black border-0 shadow-sm rounded-lg uppercase tracking-tighter`}
                          >
                            {post.intent.toUpperCase()}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="px-1 text-center">
                        {editingTonePost?.id === post.id ? (
                          <Select
                            value={post.tone || "neutral"}
                            onValueChange={(value) => {
                              handleToneChange(post.id, value as any);
                              setEditingTonePost(null);
                            }}
                          >
                            <SelectTrigger
                              className={`h-7 text-[9px] uppercase tracking-widest px-2 border-0 shadow-none ring-0 focus:ring-0 ${getToneColor(post.tone)} hover:brightness-110 transition-all font-black rounded-lg max-w-[70px] truncate`}
                            >
                              <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/40 bg-background/95 backdrop-blur-xl text-xs uppercase font-bold tracking-tight">
                              <SelectItem
                                value="positive"
                                className="text-green-600"
                              >
                                Positive
                              </SelectItem>
                              <SelectItem value="neutral">Neutral</SelectItem>
                              <SelectItem
                                value="negative"
                                className="text-red-600"
                              >
                                Negative
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            className={`${getToneColor(post.tone)} text-[9px] h-5 px-2 font-black border-0 shadow-sm cursor-pointer hover:brightness-110 active:scale-95 transition-all rounded-lg uppercase tracking-tighter`}
                            onClick={() => setEditingTonePost(post)}
                          >
                            {(post.tone || "neutral").toUpperCase()}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="px-1 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <Star
                              key={level}
                              className={`h-3 w-3 cursor-pointer transition-all duration-300 hover:scale-125 ${
                                (post.interest || 0) >= level
                                  ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]"
                                  : "text-muted-foreground/10 hover:text-yellow-400/30"
                              }`}
                              onClick={() => {
                                const newLevel =
                                  post.interest === level ? level - 1 : level;
                                handleInterestChange(post.id, newLevel);
                              }}
                            />
                          ))}
                        </div>
                      </TableCell>

                      <TableCell className="px-1 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg opacity-20 group-hover:opacity-100 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300 active:scale-90"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-xl border-border/40 shadow-2xl bg-background/95 backdrop-blur-xl"
                          >
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-40">
                              Operations
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="opacity-40" />
                            <DropdownMenuItem
                              className="text-xs transition-colors rounded-lg focus:bg-primary/5 focus:text-primary"
                              onClick={() =>
                                handleGetComments(post, post.sort_type)
                              }
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-2 opacity-60" />
                              Intelligence View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs transition-colors rounded-lg focus:bg-primary/5 focus:text-primary"
                              onClick={() => openUrl(post.url)}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-2 opacity-60" />
                              Open Source Matrix
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs transition-colors rounded-lg focus:bg-primary/5 focus:text-primary"
                              onClick={() => setEditingNotePost(post)}
                            >
                              <Notebook className="h-3.5 w-3.5 mr-2 opacity-60" />
                              Internal Intelligence Note
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="opacity-40" />
                            <DropdownMenuItem
                              className="text-xs text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors rounded-lg"
                              onClick={() => setDeleteId(post.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Purge Record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(post.id.toString()) && (
                      <TableRow className="bg-muted/10">
                        <TableCell colSpan={13} className="p-0 border-b">
                          <div className="p-3 bg-muted/20 border-x">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Card className="shadow-none border-border/40 bg-background/60">
                                <CardHeader className="py-2 px-3 flex flex-row items-center justify-between space-y-0">
                                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                                    Post Content
                                  </CardTitle>
                                  {post.permalink && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 rounded-full shadow-none flex items-center justify-center hover:bg-primary/10 hover:text-primary"
                                      onClick={() => openUrl(post.permalink)}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  )}
                                </CardHeader>
                                <CardContent className="py-0 px-3 pb-3">
                                  <ScrollArea className="h-[100px] w-full pr-2">
                                    <div className="text-[11px] leading-relaxed text-foreground/80 whitespace-pre-wrap">
                                      {post.selftext ||
                                        (post.is_self
                                          ? "No content."
                                          : "This is an external link post.")}
                                    </div>
                                  </ScrollArea>
                                </CardContent>
                              </Card>

                              <Card className="shadow-none border-border/40 bg-background/60">
                                <CardHeader className="py-2 px-3 flex flex-row items-center justify-between space-y-0">
                                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                                    Internal Notes
                                  </CardTitle>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 rounded-full shadow-none flex items-center justify-center hover:bg-primary/10 hover:text-primary"
                                    onClick={() => handleEditNote(post)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </CardHeader>
                                <CardContent className="py-0 px-3 pb-3">
                                  <ScrollArea className="h-[100px] w-full pr-2">
                                    <div className="text-[11px] leading-relaxed">
                                      {post.notes ? (
                                        <div className="markdown-content prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-1 [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-xs [&_h2]:font-bold [&_h2]:mb-1 [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_a]:text-primary [&_a]:underline">
                                          <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                          >
                                            {post.notes}
                                          </ReactMarkdown>
                                        </div>
                                      ) : (
                                        <p className="text-muted-foreground italic opacity-60">
                                          No notes available.
                                        </p>
                                      )}
                                    </div>
                                  </ScrollArea>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer - Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted/10 border-t backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">
                  Display:
                </span>
                <select
                  className="bg-transparent border-none text-[11px] font-semibold text-primary focus:ring-0 cursor-pointer p-0 h-auto"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  {[10, 25, 50, 100].map((v) => (
                    <option key={v} value={v}>
                      {v} / Page
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase">
                Batch: {startIndex + 1}—
                {Math.min(endIndex, filteredAndSortedData.length)} of{" "}
                {filteredAndSortedData.length}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-50 hover:opacity-100 transition-all active:scale-90"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-50 hover:opacity-100 transition-all active:scale-90"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-primary/5 border border-primary/20">
                <span className="text-[10px] font-bold text-primary opacity-60">
                  PAGE
                </span>
                <span className="text-[11px] font-bold text-primary font-mono">
                  {currentPage}
                </span>
                <span className="text-[10px] font-bold text-primary opacity-40">
                  /
                </span>
                <span className="text-[11px] font-bold text-primary font-mono">
                  {totalPages}
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-50 hover:opacity-100 transition-all active:scale-90"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-50 hover:opacity-100 transition-all active:scale-90"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Note Editing Dialog */}
      <Dialog
        open={editingNotePost !== null}
        onOpenChange={() => {
          setEditingNotePost(null);
          setShowPreview(false);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Add/Edit Note</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="h-7 text-[10px] uppercase font-bold tracking-wider"
              >
                {showPreview ? "Edit Mode" : "Preview Mode"}
              </Button>
            </div>
            <DialogDescription>
              Add or edit notes for the post: "{editingNotePost?.title}"
            </DialogDescription>
          </DialogHeader>

          {showPreview ? (
            <div className="min-h-[144px] p-3 rounded-md bg-muted/30 border border-border/50 markdown-content prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-1 [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-xs [&_h2]:font-bold [&_h2]:mb-1 [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_a]:text-primary [&_a]:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentNote || "*No notes content to preview*"}
              </ReactMarkdown>
            </div>
          ) : (
            <Textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="Type your notes here... (Markdown supported)"
              rows={6}
              className="font-mono text-sm"
              autoFocus
            />
          )}

          <div className="text-[10px] text-muted-foreground opacity-50 flex justify-between items-center mt-1">
            <span>
              Supports **bold**, _italic_, - lists, [links](url), etc.
            </span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNotePost(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {settings.confirmDelete && (
        <AlertDialog
          open={deleteId !== null}
          onOpenChange={() => setDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                post from your data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && handleDelete(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Clear Table Dialog */}
      <AlertDialog
        open={showClearTableDialog}
        onOpenChange={setShowClearTableDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear entire table?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete ALL
              posts from your table ({data.length} posts will be removed).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearTable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Table
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Post Details Dialog */}
      <AlertDialog
        open={selectedPost !== null}
        onOpenChange={() => setSelectedPost(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post Details</AlertDialogTitle>
          </AlertDialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Title
                </div>
                <div className="text-sm">{selectedPost.title}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Date
                </div>
                <div className="text-sm font-mono">
                  {selectedPost.formatted_date}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Subreddit
                </div>
                <Badge variant="outline" className="font-mono">
                  r/{selectedPost.subreddit}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Relevance Score
                </div>
                <div className="flex items-center gap-2">
                  {getRelevanceBadge(selectedPost.relevance_score)}
                  <span className="text-sm">
                    {selectedPost.relevance_score}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Comments
                </div>
                <div className="text-sm">{selectedPost.num_comments ?? 0}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Sort Type
                </div>
                <Badge variant="secondary" className="font-mono">
                  {selectedPost.sort_type}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  URL
                </div>
                <div
                  onClick={() => openUrl(selectedPost.url)}
                  className="text-sm text-primary hover:underline break-all cursor-pointer"
                >
                  {selectedPost.url}
                </div>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSelectedPost(null)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Comments Dialog */}
      <RedditCommentsView
        isOpen={commentsPost !== null}
        onOpenChange={(open) => !open && setCommentsPost(null)}
        post={commentsPost}
        comments={comments}
        sortType={sortTypeForComments}
        onSortTypeChange={handleSortTypeForCommentsChange}
        onCommentAdded={(newComment) => {
          setComments((prev) => [newComment, ...prev]);
          onAddComments([newComment]);
        }}
      />
    </div>
  );
}
