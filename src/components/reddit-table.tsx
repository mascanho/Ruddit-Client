"use client";

import { useState, useMemo, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Search,
  MoreVertical,
  Trash2,
  ExternalLink,
  ArrowUpDown,
  X,
  Info,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message, SearchState, RedditPost } from "./smart-data-tables";
import { useAppSettings } from "./app-settings";
import { invoke } from "@tauri-apps/api/core";
import { useAddSingleSubReddit, useRedditPostsTab } from "@/store/store";
import { toast } from "sonner";
import moment from "moment";
import { useOpenUrl } from "@/hooks/useOpenUrl";

const initialData: RedditPost[] = []; // Declare initialData here

type SortField = keyof RedditPost | null;
type SortDirection = "asc" | "desc";

const generateMockComments = (
  postId: string,
  postTitle: string,
  subreddit: string,
): Message[] => {
  const commentCount = Math.floor(Math.random() * 8) + 3; // 3-10 comments
  const comments: Message[] = [];

  const sampleComments = [
    "This is really helpful, thanks for sharing!",
    "I've been looking for something like this.",
    "Great post! Saved for later reference.",
    "Anyone else having issues with this approach?",
    "This worked perfectly for my use case.",
    "Appreciate the detailed explanation!",
    "Has anyone tried this in production?",
    "Commenting to follow this thread.",
    "This is exactly what I needed today.",
    "Thanks! This solved my problem.",
  ];

  const usernames = [
    "techie_sam",
    "dev_nina",
    "code_wizard",
    "react_fan",
    "js_master",
    "web_guru",
    "frontend_pro",
    "backend_ace",
  ];

  for (let i = 0; i < commentCount; i++) {
    comments.push({
      id: `comment_${postId}_${i}`,
      username: usernames[Math.floor(Math.random() * usernames.length)],
      message:
        sampleComments[Math.floor(Math.random() * sampleComments.length)],
      date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      source: `r/${subreddit} - ${postTitle}`,
    });
  }

  return comments;
};

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
  const [relevance, setRelevance] = useState("best");

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
        (relevanceFilter === "high" && post.relevance >= 80) ||
        (relevanceFilter === "medium" &&
          post.relevance >= 60 &&
          post.relevance < 80) ||
        (relevanceFilter === "low" && post.relevance < 60);

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

  const handleGetComments = async (post: RedditPost, relevance: string) => {
    const fetchedComments = (await invoke("get_post_comments_command", {
      url: post.url,
      title: post.title,
      relevance: relevance,
    })) as Message[];

    setComments(fetchedComments);
    setCommentsPost(post);
    onAddComments(fetchedComments);
  };

  const handleRelevanceChange = async (newRelevance: string) => {
    setRelevance(newRelevance);
    if (commentsPost) {
      const newComments = (await invoke("get_post_comments_command", {
        url: commentsPost.url,
        title: commentsPost.title,
        relevance: newRelevance,
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

  const getRelevanceBadge = (relevance: number) => {
    if (relevance >= 80) {
      return (
        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20">
          High
        </Badge>
      );
    }
    if (relevance >= 60) {
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
      <Card className="p-6">
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

            <Button
              variant="destructive"
              onClick={() => setShowClearTableDialog(true)}
            >
              Clear Table
            </Button>

            {/* {hasActiveFilters && ( */}
            {/*   <Button variant="outline" size="icon" onClick={clearFilters}> */}
            {/*     <X className="h-4 w-4" /> */}
            {/*   </Button> */}
            {/* )} */}
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedData.length} of {data.length} posts
          </div>
        </div>
      </Card>

      <Card className="p-0 m-0 h-[800px]">
        <div className="border-b">
          <div className="overflow-x-auto">
            <Table className="m-0 p-0">
              <TableHeader>
                <TableRow className="m-0 p-0">
                  <TableHead className="w-[60px] bg-background sticky top-0 z-10">
                    #
                  </TableHead>
                  <TableHead className="w-[110px] bg-background sticky top-0 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("date")}
                    >
                      Date
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[300px] bg-background sticky top-0 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("title")}
                    >
                      Title
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px] bg-background sticky top-0 z-10">
                    URL
                  </TableHead>
                  <TableHead className="w-[180px] bg-background sticky top-0 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("relevance")}
                    >
                      Engaged
                    </Button>
                  </TableHead>
                  <TableHead className="w-[150px] bg-background sticky top-0 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("subreddit")}
                    >
                      Subreddit
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[70px] bg-background sticky top-0 z-10">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          </div>
        </div>

        <div className="max-h-[680px] h-[680px] overflow-y-auto overflow-x-auto p-0">
          <Table className="p-0 -mt-4 z-20">
            <TableBody className="p-0 -mt-5 z-20">
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-2 p-0 text-center text-muted-foreground"
                  >
                    No posts found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((post, index) => (
                  <TableRow
                    key={post.id}
                    className={`group p-0 m-0 ${settings.tableDensity === "compact" ? "h-10" : settings.tableDensity === "spacious" ? "h-10" : "h-10"}`}
                  >
                    <TableCell className="text-muted-foreground text-sm font-medium w-[60px]">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-sm w-[110px]">
                      {post?.formatted_date.slice(0, 10).trim()}
                    </TableCell>
                    <TableCell className="min-w-[300px]">
                      <div className="line-clamp-2 font-medium">
                        {post.title.slice(0, 100)}
                        {post.title.length > 100 && "..."}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleOpenInbrowser(post.url)}>
                      <span className="w-[100px] flex items-center text-blue-800 mt-2 hover:underline cursor-pointer">
                        Link
                        <ExternalLink className="h-3 w-3 ml-1 hover:underline cursor-pointer" />
                      </span>
                    </TableCell>
                    <TableCell className="w-[180px]">
                      <div className="flex items-center gap-2">
                        {getRelevanceBadge(post.relevance)}
                        <span className="text-sm text-muted-foreground">
                          {post.relevance}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="w-[150px]">
                      <Badge variant="outline" className="font-mono">
                        r/{post.subreddit}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-[70px]">
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
                            onClick={() => handleGetComments(post, relevance)}
                          >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Get Comments
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
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredAndSortedData.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
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
                <div className="text-sm font-mono">{selectedPost.date}</div>
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
                  {getRelevanceBadge(selectedPost.relevance)}
                  <span className="text-sm">{selectedPost.relevance}%</span>
                </div>
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

                  {/* Select the comments relevance to then fetch again if the user changes the relevance */}

                  <section className="flex items-center space-x-2">
                    <span className="text-black">Relevance:</span>
                    <Select
                      value={relevance}
                      onValueChange={handleRelevanceChange}
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
                    </Select>{" "}
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
                          {comment?.formatted_date.slice(0, 10)}
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
