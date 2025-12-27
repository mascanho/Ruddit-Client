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
import { useAppSettings } from "./app-settings";
import { Radar } from "lucide-react";
import { KeywordHighlighter } from "./keyword-highlighter";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useAddSingleSubReddit, useRedditPostsTab } from "@/store/store";
import { toast } from "sonner";
import moment from "moment";
import { useOpenUrl } from "@/hooks/useOpenUrl";
import { getStatusColor, getIntentColor } from "@/lib/marketing-utils";

// UI Components
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
  Search,
  ArrowUpDown,
  ExternalLink,
  MoreVertical,
  MessageCircle,
  Info,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  Pencil,
  Notebook,
  CheckCircle2,
  Circle,
  UserPlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
const initialData: RedditPost[] = []; // Declare initialData here




// Define RedditPost type to match Rust's PostDataWrapper
export type RedditPost = {
  id: string;
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
  selftext?: string;
  name?: string;
  date_added: number;
  // Client-side fields
  status?: "new" | "investigating" | "replied" | "closed" | "ignored";
  intent?: string;
  category?: "brand" | "competitor" | "general";
};

// Icons specific to post types
import { FileText, Link as LinkIcon } from "lucide-react";

const teamMembers = [
  { id: "user1", name: "Alex" },
  { id: "user2", name: "Maria" },
  { id: "user3", "name": "David" },
  { id: "user4", name: "Sarah" },
];

interface CommentTree extends Message {
  children: CommentTree[];
}

type SortField = keyof RedditPost | null;

type SortDirection = "asc" | "desc";

export function RedditTable({
  onAddComments,
  externalPosts = [],
  searchState,
  onSearchStateChange,
}: {
  onAddComments: (comments: Message[]) => void;
  externalPosts?: RedditPost[];
  searchState: SearchState;
  onSearchStateChange: (state: SearchState) => void;
}) {
  const [data, setData] = useState<RedditPost[]>(initialData);
  const { settings, updateSettings } = useAppSettings();

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
      localStorage.getItem("ruddit-crm-data") || "{}",
    );

    // Only update if we have new data to merge to avoid infinite loop if we put this in the dependency array incorrectly
    // Actually, we should do this when data *changes* from external sources (initial load)
    // But since `data` is local state initialized from `initialData` (empty) and then populated in useEffect,
    // we can intercept the setting of data there.
  }, []);

  const updateCrmData = (postId: string, updates: Partial<RedditPost>) => {
    // Update local state
    setData((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, ...updates } : p)),
    );

    // Update LocalStorage
    const storedCrm = JSON.parse(
      localStorage.getItem("ruddit-crm-data") || "{}",
    );
    const postData = storedCrm[postId] || {};
    storedCrm[postId] = { ...postData, ...updates };
    localStorage.setItem("ruddit-crm-data", JSON.stringify(storedCrm));
  };

  const searchQuery = searchState.redditSearch;
  const setSearchQuery = (value: string) =>
    onSearchStateChange({ ...searchState, redditSearch: value });
  const subredditFilter = searchState.redditSubreddit;
  const setSubredditFilter = (value: string) =>
    onSearchStateChange({ ...searchState, redditSubreddit: value });
  const relevanceFilter = searchState.redditRelevance;
  const setRelevanceFilter = (value: string) =>
    onSearchStateChange({ ...searchState, redditRelevance: value });

  const [sortField, setSortField] = useState<SortField>(
    settings.defaultSortField === "none"
      ? null
      : (settings.defaultSortField as SortField),
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    settings.defaultSortDirection,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null);
  const [commentsPost, setCommentsPost] = useState<RedditPost | null>(null);
  const [comments, setComments] = useState<Message[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(settings.rowsPerPage);
  const [showClearTableDialog, setShowClearTableDialog] = useState(false);
  const [sortTypeForComments, setSortTypeForComments] = useState("best"); // Renamed from relevance
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingNotePost, setEditingNotePost] = useState<RedditPost | null>(
    null,
  );
  const [currentNote, setCurrentNote] = useState("");
  const [lastVisitTimestamp, setLastVisitTimestamp] = useState<number>(() => {
    return parseInt(localStorage.getItem("ruddit-last-visit-timestamp") || "0", 10);
  });

  const maxDateAdded = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.max(...data.map(p => p.date_added));
  }, [data]);

  const latestPostTimestamp = useMemo(() => {
    const newPosts = data.filter(p => p.date_added > lastVisitTimestamp);
    if (newPosts.length === 0) return 0;
    return Math.max(...newPosts.map(p => p.timestamp));
  }, [data, lastVisitTimestamp]);

  const handleTableInteraction = () => {
    if (maxDateAdded > lastVisitTimestamp) {
      setLastVisitTimestamp(maxDateAdded);
      localStorage.setItem("ruddit-last-visit-timestamp", maxDateAdded.toString());
    }
  };

  const handleEditNote = (post: RedditPost) => {
    handleTableInteraction();
    setEditingNotePost(post);
    setCurrentNote(post.notes || "");
  };

  const handleSaveNote = async () => {
    if (!editingNotePost) return;

    try {
      await invoke("update_post_notes", {
        id: parseInt(editingNotePost.id, 10),
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

  const handleAssign = async (postId: string, personName: string) => {
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
        id: parseInt(postId, 10),
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

  const handleEngagedToggle = async (postId: string, isEngaged: boolean) => {
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

    try {
      await invoke("update_post_engaged_status", {
        id: parseInt(postId, 10),
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
    }
  };

  useEffect(() => {
    if (externalPosts.length > 0) {
      const storedCrm = JSON.parse(
        localStorage.getItem("ruddit-crm-data") || "{}",
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
        }));

        // Also update existing posts with CRM data if needed (e.g. on reload)
        const updatedPrev = prev.map((p) => ({
          ...p,
          status: storedCrm[p.id]?.status || p.status || "new",
          intent: storedCrm[p.id]?.intent || p.intent,
          category: storedCrm[p.id]?.category || p.category,
        }));

        return [...updatedPrev, ...mergedNewPosts];
      });
    }
  }, [externalPosts, toast]);

  const subreddits = useMemo(() => {
    return Array.from(new Set(data.map((post) => post.subreddit)));
  }, [data, externalPosts]);

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

      return matchesSearch && matchesSubreddit && matchesRelevance;
    });

    if (sortField) {
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
    sortField,
    sortDirection,
    externalPosts,
  ]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, currentPage, rowsPerPage, externalPosts]);

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, subredditFilter, relevanceFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleDelete = async (id: string) => {
    if (!settings.confirmDelete) {
      setData(data.filter((post) => post.id !== id));
      return;
    }

    await invoke("remove_single_reddit_command", { post: id });
    toast.info("Post deleted successfully");

    // Wait a few seconds before reloading
    await new Promise((resolve) => setTimeout(resolve, 500));
    window.location.reload();
  };

  const handleGetComments = async (post: RedditPost, sort_type: string) => {
    // Renamed parameter
    const fetchedComments = (await invoke("get_post_comments_command", {
      url: post.url,
      title: post.title,
      sortType: sort_type, // Use new parameter, camelCase for Tauri
      subreddit: post.subreddit, // Add subreddit here
    })) as Message[];

    setComments(fetchedComments);
    setCommentsPost(post);
    onAddComments(fetchedComments);
    setData((prevData) =>
      prevData.map((p) =>
        p.id === post.id ? { ...p, num_comments: fetchedComments.length } : p,
      ),
    );
  };

  const handleSortTypeForCommentsChange = async (newSortType: string) => {
    // Renamed function and parameter
    setSortTypeForComments(newSortType);
    if (commentsPost) {
      const newComments = (await invoke("get_post_comments_command", {
        url: commentsPost.url,
        title: commentsPost.title,
        sortType: newSortType, // Use new parameter, camelCase for Tauri
        subreddit: commentsPost.subreddit, // Add subreddit here
      })) as Message[];
      setComments(newComments);
      onAddComments(newComments);
      setData((prevData) =>
        prevData.map((p) =>
          p.id === commentsPost.id
            ? { ...p, num_comments: newComments.length }
            : p,
        ),
      );
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSubredditFilter("all");
    setRelevanceFilter("all");
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
    sortField;

  const handleClearTable = async () => {
    try {
      await invoke("clear_saved_reddits");
      toast("Table is being deleted", {
        description: "All your entries will be lost.",
        position: "top-center",
        action: {
          label: "Warning",
          onClick: () => console.log("Undo"),
        },
      });

      // delay 1 second
      await new Promise((resolve) => setTimeout(resolve, 2000));

      window.location.reload();
    } catch (err) {
      console.log(err);
    }
  };

  const handleExportToCsv = async () => {
    if (filteredAndSortedData.length === 0) {
      toast.info("No data to export.");
      return;
    }

    const headers = Object.keys(
      filteredAndSortedData[0],
    ) as (keyof RedditPost)[];
    const csvRows = [];

    // Add headers
    csvRows.push(headers.map((header) => `"${header}"`).join(","));

    // Add data rows
    for (const row of filteredAndSortedData) {
      const values = headers.map((header) => {
        const value = row[header];
        const stringValue =
          value === undefined || value === null ? "" : String(value);
        return `"${stringValue.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    }

    const csvString = csvRows.join("\n");

    try {
      const filePath = await save({
        filters: [
          {
            name: "CSV",
            extensions: ["csv"],
          },
        ],
        defaultPath: `reddit_posts_${new Date().toISOString().slice(0, 10)}.csv`,
      });

      if (filePath) {
        await invoke("save_text_file", { path: filePath, contents: csvString });
        toast.success(`Data exported to ${filePath} successfully!`);
      } else {
        toast.info("Export cancelled.");
      }
    } catch (error) {
      console.error("Failed to export data:", error);
      toast.error("Failed to export data.");
    }
  };

  return (
    <>
      <Card className="px-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={subredditFilter} onValueChange={setSubredditFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All subreddits" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subreddits</SelectItem>
                {subreddits.map((subreddit) => (
                  <SelectItem key={subreddit} value={subreddit}>
                    r/{subreddit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={relevanceFilter} onValueChange={setRelevanceFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All relevance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All relevance</SelectItem>
                <SelectItem value="high">High (80+)</SelectItem>
                <SelectItem value="medium">Medium (60-79)</SelectItem>
                <SelectItem value="low">Low (&lt;60)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportToCsv}>
              Export to CSV
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowClearTableDialog(true)}
            >
              Clear Table
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedData.length} of {data.length} posts
          </div>
        </div>
      </Card>

      <Card className="p-0 m-0 h-[770px] flex flex-col">
        {/* Single Table Container with Fixed Header */}
        <div className="flex-1 overflow-auto relative">
          <Table>
            {/* Fixed Header */}
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-[40px] p-3">
                  {/* Expand/Collapse */}
                  <Notebook className="h-4 w-4" />
                </TableHead>
                <TableHead className="w-[30px] p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 font-medium"
                  >
                    #
                  </Button>
                </TableHead>
                <TableHead className="w-[30px] p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 font-medium"
                    onClick={() => handleSort("formatted_date")}
                  >
                    Date
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[300px] p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 font-medium"
                    onClick={() => handleSort("title")}
                  >
                    Title
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[150px] p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 font-medium"
                    onClick={() => handleSort("subreddit")}
                  >
                    Subreddit
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>

                <TableHead className="w-[100px] p-3 font-medium text-center">
                  Intent
                </TableHead>

                <TableHead className="w-[30px] p-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 font-medium"
                    onClick={() => handleSort("engaged")}
                  >
                    Engaged
                  </Button>
                </TableHead>
                <TableHead className="w-[120px] p-3 text-center font-medium">
                  Status
                </TableHead>
                <TableHead className="w-[100px] p-3 text-center">
                  <div className="flex items-center justify-center font-medium">
                    Assignee
                  </div>
                </TableHead>
                <TableHead className="w-[70px] p-3 text-center font-medium">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            {/* Scrollable Body */}
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11} // Updated colSpan
                    className="h-10 text-center text-muted-foreground"
                  >
                    No posts found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((post, index) => (
                  <Fragment key={post.id}>
                    <TableRow
                      key={post.id}
                      onClick={handleTableInteraction}
                      className={`group text-xs p-0 h-2 transition-colors duration-500 border-l-2 ${post.date_added > lastVisitTimestamp
                        ? post.timestamp === latestPostTimestamp
                          ? "bg-green-500/20 dark:bg-green-500/30 border-l-green-600"
                          : "bg-green-500/5 dark:bg-green-500/10 border-l-green-400"
                        : "border-l-transparent"
                        } ${settings.tableDensity === "compact"
                          ? "h-2"
                          : settings.tableDensity === "spacious"
                            ? "h-2"
                            : "h-2"
                        }`}
                    >
                      <TableCell className="px-3 p-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleRowExpansion(post.id)}
                          className="h-8 w-8"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${expandedRows.has(post.id) ? "rotate-180" : ""
                              }`}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-medium w-[30px] p-3">
                        {(currentPage - 1) * rowsPerPage + index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs w-[110px] px-3">
                        {post?.formatted_date?.slice(0, 10).trim() || "N/A"}
                      </TableCell>
                      <TableCell className="min-w-[300px] px-3">
                        <div className="flex items-center gap-2">
                          <div className="mt-0.5 text-muted-foreground/50">
                            {post.is_self ? <FileText className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
                          </div>
                          <div
                            onClick={() => openUrl(post.url)}
                            className="line-clamp-1 font-medium cursor-pointer hover:underline flex-1"
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
                        <div className="flex items-center gap-2 mt-1">
                          {post.category === "brand" && (
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-800 text-[10px] h-5"
                            >
                              Brand
                            </Badge>
                          )}
                          {post.category === "competitor" && (
                            <Badge
                              variant="secondary"
                              className="bg-orange-100 text-orange-800 text-[10px] h-5"
                            >
                              Competitor
                            </Badge>
                          )}
                          <div
                            className="flex items-center gap-3 text-[10px] text-muted-foreground"
                          >
                            <div className="flex items-center gap-1 cursor-pointer hover:text-primary"
                              onClick={() => handleGetComments(post, post.sort_type)}>
                              <MessageCircle className="h-3 w-3" />
                              <span>{post.num_comments ?? 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ArrowUpDown className="h-3 w-3" />
                              <span>{post.score ?? 0}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-[150px] px-3">
                        <div className="flex flex-col gap-0.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Badge variant="outline" className="font-mono w-fit text-[10px] py-0 h-4 cursor-pointer hover:bg-accent/50 selection:bg-transparent">
                                r/{post.subreddit}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => addSubredditToMonitoring(post.subreddit)}>
                                <Radar className="h-4 w-4 mr-2" />
                                Add to Monitoring
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {post.author && (
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <User className="h-2.5 w-2.5" />
                              u/{post.author}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="w-[100px] px-3 text-center">
                        {post.intent && (
                          <Badge
                            className={`${getIntentColor(post.intent.toLowerCase())} text-[10px] h-5 px-1.5 font-medium border-0`}
                          >
                            {post.intent.toUpperCase()}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="w-[20px] px-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-transparent"
                          onClick={() =>
                            handleEngagedToggle(post.id, post.engaged !== 1)
                          }
                        >
                          {post.engaged === 1 ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 fill-green-500/20" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/30" />
                          )}
                        </Button>
                      </TableCell>

                      <TableCell className="w-[120px] px-3">
                        <div className="flex justify-center">
                          <Select
                            value={post.status || "new"}
                            onValueChange={(value) =>
                              updateCrmData(post.id, { status: value as any })
                            }
                          >
                            <SelectTrigger
                              className={`w-full flex justify-center  h-7 text-xs px-2 border-0 shadow-none ring-0 focus:ring-0 ${getStatusColor(post.status)} bg-opacity-20 hover:bg-opacity-30 transition-colors font-medium rounded-full text-center`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="text-center flex justify-center">
                              <SelectItem
                                className="text-center w-full flex justify-center"
                                value="new"
                              >
                                New
                              </SelectItem>
                              <SelectItem value="investigating">
                                Investigating
                              </SelectItem>
                              <SelectItem value="replied">Replied</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                              <SelectItem value="ignored">Ignored</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>

                      <TableCell className="w-[100px] px-3">
                        <div className="flex justify-center">
                          <Select
                            value={post.assignee || "unassigned"}
                            onValueChange={(value) =>
                              handleAssign(post.id, value)
                            }
                          >
                            <SelectTrigger className="w-8 h-8 rounded-full p-0 border-0 ring-0 focus:ring-0 [&>svg]:hidden flex items-center justify-center">
                              <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
                                {post.assignee &&
                                  post.assignee !== "unassigned" ? (
                                  <>
                                    <AvatarImage
                                      src={`https://avatar.vercel.sh/${post.assignee}`}
                                      alt={post.assignee}
                                    />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                      {post.assignee.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </>
                                ) : (
                                  <AvatarFallback className="bg-transparent border border-dashed border-muted-foreground/50 hover:border-muted-foreground hover:bg-muted/50 transition-colors">
                                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            </SelectTrigger>
                            <SelectContent align="center">
                              <SelectItem
                                className="text-xs"
                                value="unassigned"
                              >
                                Unassigned
                              </SelectItem>
                              {teamMembers.map((member) => (
                                <SelectItem
                                  className="text-xs"
                                  key={member.id}
                                  value={member.name}
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage
                                        src={`https://avatar.vercel.sh/${member.name}`}
                                      />
                                      <AvatarFallback className="text-[10px]">
                                        {member.name.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    {member.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="w-[70px] px-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleGetComments(post, post.sort_type)
                              }
                            >
                              <MessageCircle className="h-4 w-4" />
                              Get Comments
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditNote(post)}
                            >
                              <Pencil className="h-4 w-4" />
                              Add/Edit Note
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSelectedPost(post)}
                            >
                              <Info className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a
                                href={post.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Open Link
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteId(post.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(post.id) && (
                      <TableRow>
                        <TableCell colSpan={11} className="p-0">
                          {" "}
                          {/* Updated colSpan */}
                          <div className="p-4 bg-muted/30 border-x border-b rounded-b-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Card className="bg-background/50">
                                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                                  <CardTitle className="text-sm font-medium">Post Content</CardTitle>
                                  {post.permalink && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openUrl(post.permalink)}>
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  )}
                                </CardHeader>
                                <CardContent className="py-0 px-4 pb-4">
                                  <ScrollArea className="h-[120px] w-full pr-4">
                                    <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                                      {post.selftext || (post.is_self ? "No content." : "This is an external link post.")}
                                    </div>
                                  </ScrollArea>
                                </CardContent>
                              </Card>

                              <Card className="bg-background/50">
                                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                                  <CardTitle className="text-sm font-medium">Internal Notes</CardTitle>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleEditNote(post)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </CardHeader>
                                <CardContent className="py-0 px-4 pb-4">
                                  <ScrollArea className="h-[120px] w-full pr-4">
                                    <div className="text-xs">
                                      {post.notes ? (
                                        <p>{post.notes}</p>
                                      ) : (
                                        <p className="text-muted-foreground italic">
                                          No notes for this post yet.
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

        {/* Pagination Section */}
        {filteredAndSortedData.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t flex-none">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Rows per page:
              </span>
              <Select
                value={rowsPerPage.toString()}
                onValueChange={(v) => {
                  setRowsPerPage(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <ChevronLeft className="h-4 w-4 -ml-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                  <ChevronRight className="h-4 w-4 -ml-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Note Editing Dialog */}
      <Dialog
        open={editingNotePost !== null}
        onOpenChange={() => setEditingNotePost(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add/Edit Note</DialogTitle>
            <DialogDescription>
              Add or edit notes for the post: "{editingNotePost?.title}"
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={currentNote}
            onChange={(e) => setCurrentNote(e.target.value)}
            placeholder="Type your notes here..."
            rows={6}
          />
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
                <a
                  href={selectedPost.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {selectedPost.url}
                </a>
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
      />
    </>
  );
}
