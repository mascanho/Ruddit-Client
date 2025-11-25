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
import { useAppSettings } from "./app-settings";
import { invoke } from "@tauri-apps/api/core";
import { useAddSingleSubReddit, useRedditPostsTab } from "@/store/store";
import { toast } from "sonner";
import moment from "moment";
import { useOpenUrl } from "@/hooks/useOpenUrl";

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
} from "lucide-react";
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
  name: string;
  selftext: string | null;
  author: string;
  score: number;
  thumbnail: string | null;
  is_self: boolean;
  num_comments: number;
};

const teamMembers = [
  { id: "user1", name: "Alex" },
  { id: "user2", name: "Maria" },
  { id: "user3", name: "David" },
  { id: "user4", name: "Sarah" },
];

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
  const { settings } = useAppSettings();

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
        id: postId,
        assignee: assigneeToSave,
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
    }
  };

  useEffect(() => {
    if (externalPosts.length > 0) {
      setData((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newPosts = externalPosts.filter((p) => !existingIds.has(p.id));

        if (newPosts.length > 0) {
          // toast({
          //   title: "New posts added",
          //   description: `${newPosts.length} new post${newPosts.length > 1 ? "s" : ""} added to Reddit Posts`,
          //   duration: 3000,
          // });
        }

        return [...prev, ...newPosts];
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

  const openUrl = useOpenUrl();

  const handleOpenInbrowser = (url: any) => {
    openUrl(url);
  };

  return (
    <>
      <Card className="px-6 pb-2">
        <div className="space-y-1">
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
            <Button
              variant="destructive"
              onClick={() => setShowClearTableDialog(true)}
            >
              Clear Table
            </Button>
          </div>
          <div className="text-xs pt-1 text-muted-foreground">
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
                <TableHead className="w-[60px] p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 font-medium"
                    onClick={() => handleSort("index")}
                  >
                    #
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[110px] p-3">
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

                <TableHead className="w-[100px] p-3 font-medium">URL</TableHead>
                {/* <TableHead className="w-[100px] p-3"> */}
                {/*   <Button */}
                {/*     variant="ghost" */}
                {/*     size="sm" */}
                {/*     className="-ml-3 h-8 font-medium" */}
                {/*     onClick={() => handleSort("relevance_score")} */}
                {/*   > */}
                {/*     Score */}
                {/*     <ArrowUpDown className="ml-2 h-3 w-3" /> */}
                {/*   </Button> */}
                {/* </TableHead> */}
                {/* <TableHead className="w-[100px] p-3"> */}
                {/*   <Button */}
                {/*     variant="ghost" */}
                {/*     size="sm" */}
                {/*     className="-ml-3 h-8 font-medium" */}
                {/*     onClick={() => handleSort("sort_type")} */}
                {/*   > */}
                {/*     Type */}
                {/*     <ArrowUpDown className="ml-2 h-3 w-3" /> */}
                {/*   </Button> */}
                {/* </TableHead> */}
                <TableHead className="w-[180px] p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 font-medium"
                    onClick={() => handleSort("engaged")}
                  >
                    Engaged
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[150px] p-3">
                  <div className="flex items-center font-medium">
                    <User className="mr-2 h-4 w-4" />
                    Assignee
                  </div>
                </TableHead>
                <TableHead className="w-[70px] p-3 font-medium">
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
                      className={`group text-xs p-0 h-2 ${
                        settings.tableDensity === "compact"
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
                            className={`h-4 w-4 transition-transform ${
                              expandedRows.has(post.id) ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-medium w-[60px] p-3">
                        {(currentPage - 1) * rowsPerPage + index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-sm w-[110px] px-3">
                        {post?.formatted_date?.slice(0, 10).trim() || "N/A"}
                      </TableCell>
                      <TableCell className="min-w-[300px] px-3">
                        <div className="line-clamp-2 font-medium">
                          {post.title?.slice(0, 100) || "No title"}
                          {post.title?.length > 100 && "..."}
                        </div>
                      </TableCell>
                      <TableCell className="w-[150px] px-3">
                        <Badge variant="outline" className="font-mono">
                          r/{post.subreddit}
                        </Badge>
                      </TableCell>

                      <TableCell className="w-[100px] px-3">
                        <span
                          onClick={() => handleOpenInbrowser(post.url)}
                          className="flex items-center text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-sm"
                        >
                          Link
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </span>
                      </TableCell>
                      {/* <TableCell className="w-[100px] p-3"> */}
                      {/*   <div className="flex items-center gap-2"> */}
                      {/*     {getRelevanceBadge(post.relevance_score)} */}
                      {/*     <span className="text-sm"> */}
                      {/*       {post.relevance_score}% */}
                      {/*     </span> */}
                      {/*   </div> */}
                      {/* </TableCell> */}
                      {/* <TableCell className="w-[100px] p-3"> */}
                      {/*   <Badge variant="secondary" className="font-mono"> */}
                      {/*     {post.sort_type} */}
                      {/*   </Badge> */}
                      {/* </TableCell> */}
                      <TableCell className="w-[180px] px-3 text-xs">
                        <Select
                          value={post.engaged === 1 ? "engaged" : "not engaged"}
                          onValueChange={(value) =>
                            handleEngagedToggle(post.id, value === "engaged")
                          }
                        >
                          <SelectTrigger className="text-xs px-2">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem className="text-xs" value="engaged">
                              Engaged
                            </SelectItem>
                            <SelectItem className="text-xs" value="not engaged">
                              Not engaged
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="w-[150px] px-3">
                        <Select
                          value={post.assignee || "unassigned"}
                          onValueChange={(value) =>
                            handleAssign(post.id, value)
                          }
                        >
                          <SelectTrigger className="px-2 text-xs">
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem className="text-xs" value="unassigned">
                              Unassigned
                            </SelectItem>
                            {teamMembers.map((member) => (
                              <SelectItem
                                className="text-xs"
                                key={member.id}
                                value={member.name}
                              >
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="w-[70px] px-3">
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
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Get Comments
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditNote(post)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Add/Edit Note
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSelectedPost(post)}
                            >
                              <Info className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a
                                href={post.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open Link
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteId(post.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
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
                          <div className="p-4 bg-muted/50">
                            <Card>
                              <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Notes</CardTitle>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditNote(post)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </CardHeader>
                              <CardContent>
                                {post.notes ? (
                                  <p>{post.notes}</p>
                                ) : (
                                  <p className="text-muted-foreground">
                                    No notes for this post yet.
                                  </p>
                                )}
                              </CardContent>
                            </Card>
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
      <Dialog
        open={commentsPost !== null}
        onOpenChange={() => setCommentsPost(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Comments
            </DialogTitle>
            {commentsPost && (
              <DialogDescription className="space-y-1">
                <div className="font-medium text-foreground line-clamp-2">
                  {commentsPost?.title}
                </div>
                <div className="flex items-center gap-2 text-xs justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="font-mono">
                      r/{comments[0]?.subreddit}
                    </Badge>
                    <span className="text-muted-foreground">
                      {comments?.length} comments
                    </span>
                  </div>
                  <section className="flex items-center space-x-2">
                    <span className="text-black">Sort By:</span>
                    <Select
                      value={sortTypeForComments}
                      onValueChange={handleSortTypeForCommentsChange}
                    >
                      <SelectTrigger size="xs" className="w-[110px]">
                        <SelectValue placeholder="Best" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="best">Best</SelectItem>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="controversial">
                          Controversial
                        </SelectItem>
                        <SelectItem value="old">Old</SelectItem>
                        <SelectItem value="q&a">Q&A</SelectItem>
                      </SelectContent>
                    </Select>
                  </section>
                </div>
              </DialogDescription>
            )}
          </DialogHeader>
          <ScrollArea className="max-h-[calc(80vh-180px)] pr-4">
            <div className="space-y-4">
              {comments.map((comment, index) => (
                <Card key={comment.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {comment?.author?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {comment?.author}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {comment?.formatted_date?.slice(0, 10)}
                        </span>
                        <span className="text-xs text-primary">
                          {moment(
                            comment?.formatted_date,
                            "YYYY-MM-DD",
                          ).fromNow()}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{comment?.body}</p>
                    </div>
                  </div>
                </Card>
              ))}
              {comments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No comments available
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
