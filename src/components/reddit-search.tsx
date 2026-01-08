// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Sparkles,
  Flame,
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Radar,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppSettings } from "@/store/settings-store";
import { invoke } from "@tauri-apps/api/core";
import {
  useAddSingleSubReddit,
  useRedditPostsTab,
  useSubredditsStore,
} from "@/store/store";
import { RedditCommentsView } from "./reddit-comments-view";
import { toast } from "sonner";
import moment from "moment";
import { openUrl } from "@tauri-apps/plugin-opener";
import { KeywordHighlighter } from "./keyword-highlighter";
import {
  calculateIntent,
  categorizePost,
  getIntentColor,
} from "@/lib/marketing-utils";

// ... existing imports

type SearchResult = {
  id: string;
  title: string;
  subreddit: string;
  url: string;
  relevance_score: number; // Renamed from relevance
  sort_type: string; // Added new field
  snippet: string;
  timestamp?: number;
  formatted_date?: string;
  score?: number;
  num_comments?: number;
  author?: string;
  is_self?: boolean;
  name?: string;
  selftext?: string | null;
  thumbnail?: string | null;
  intent?: string; // allow string from backend
  category?: "brand" | "competitor" | "general";
  permalink?: string;
  date_added?: number;
};

type SortType = "hot" | "top" | "new";

export function RedditSearch({
  onAddResults,
  onNotifyNewPosts,
}: {
  onAddResults: (results: SearchResult[]) => void;
  onNotifyNewPosts: (count: number) => void;
}) {
  const [query, setQuery] = useState(
    () => localStorage.getItem("lastRedditSearchQuery") || "",
  );
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedSorts, setSelectedSorts] = useState<SortType[]>(() => {
    const saved = localStorage.getItem("lastRedditSearchSorts");
    return saved ? JSON.parse(saved) : ["hot"];
  });
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(localStorage.getItem("lastRedditSearchPage") || "1", 10);
  });
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    return parseInt(localStorage.getItem("lastRedditSearchRows") || "100", 10);
  });
  const { settings, updateSettings } = useAppSettings();
  const { setSubreddits, subreddits } = useSubredditsStore();
  const { addSingleSubreddit, subRedditsSaved } = useAddSingleSubReddit();

  // Comments state
  const [comments, setComments] = useState<Message[]>([]);
  const [commentsPost, setCommentsPost] = useState<SearchResult | null>(null);
  const [sortTypeForComments, setSortTypeForComments] = useState("best");

  // Helper function to escape special characters for regex

  // Persist query and sorts
  useEffect(() => {
    localStorage.setItem("lastRedditSearchQuery", query);
  }, [query]);

  useEffect(() => {
    localStorage.setItem(
      "lastRedditSearchSorts",
      JSON.stringify(selectedSorts),
    );
  }, [selectedSorts]);

  useEffect(() => {
    localStorage.setItem("lastRedditSearchPage", currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem("lastRedditSearchRows", rowsPerPage.toString());
  }, [rowsPerPage]);

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

  async function handleFetchSubreddits() {
    try {
      const fetchedPosts: PostDataWrapper[] = await invoke(
        "get_all_searched_posts",
      );
      const mappedResults: SearchResult[] = fetchedPosts.map((post) => ({
        id: post.id.toString(),
        title: post.title,
        subreddit: post.subreddit,
        url: post.url,
        relevance_score: post.relevance_score,
        sort_type: post.sort_type,
        snippet: post.selftext
          ? post.selftext.slice(0, 200) +
            (post.selftext.length > 200 ? "..." : "")
          : "",
        timestamp: post.timestamp,
        formatted_date: post.formatted_date,
        score: post.score,
        num_comments: post.num_comments,
        author: post.author,
        is_self: post.is_self,
        name: post.name,
        selftext: post.selftext,
        thumbnail: post.thumbnail,
        intent: post.intent,
        permalink: post.permalink,
        category: categorizePost(
          post.title,
          settings.brandKeywords,
          settings.competitorKeywords,
        ),
      }));
      setSubreddits(mappedResults);
      console.log("Subreddits:", mappedResults);
    } catch (error) {
      console.error("Error fetching subreddits:", error);
    }
  }

  // KEEP THE SEARCH PERSISTING by querying the DB of the search results
  async function persistSearch() {
    try {
      const fetchedPosts: PostDataWrapper[] = await invoke(
        "get_all_searched_posts",
      );
      const mappedResults: SearchResult[] = fetchedPosts.map((post) => ({
        id: post.id.toString(),
        title: post.title,
        subreddit: post.subreddit,
        url: post.url,
        relevance_score: post.relevance_score,
        sort_type: post.sort_type,
        snippet: post.selftext
          ? post.selftext.slice(0, 200) +
            (post.selftext.length > 200 ? "..." : "")
          : "",
        timestamp: post.timestamp,
        formatted_date: post.formatted_date,
        score: post.score,
        num_comments: post.num_comments,
        author: post.author,
        is_self: post.is_self,
        name: post.name,
        selftext: post.selftext,
        thumbnail: post.thumbnail,
        intent: post.intent,
        permalink: post.permalink,
        category: categorizePost(
          post.title,
          settings.brandKeywords,
          settings.competitorKeywords,
        ),
      }));
      setSubreddits(mappedResults);
      // NOTE: Removed setViewFilters reset here to rely on persisted state
      console.log("Subreddits:", mappedResults);
    } catch (error) {
      console.error("Error persisting search:", error);
    }
  }

  useEffect(() => {
    persistSearch();
  }, []);

  const toggleSort = (sort: SortType) => {
    setSelectedSorts((prev) => {
      if (prev.includes(sort)) {
        return prev.filter((s) => s !== sort);
      }
      return [...prev, sort];
    });
  };

  // HANDLE THE SEARCH FUNCTION
  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setCurrentPage(1);

    try {
      // Call Tauri command to query Reddit and store in database
      const fetchedPosts: PostDataWrapper[] = await invoke(
        "get_reddit_results",
        {
          sortTypes: selectedSorts, // Renamed parameter to match Rust backend
          query: query.trim(),
        },
      );

      const mappedResults: SearchResult[] = fetchedPosts.map((post) => ({
        id: post.id.toString(),
        title: post.title,
        subreddit: post.subreddit,
        url: post.url,
        relevance_score: post.relevance_score,
        sort_type: post.sort_type,
        snippet: post.selftext
          ? post.selftext.slice(0, 200) +
            (post.selftext.length > 200 ? "..." : "")
          : "",
        timestamp: post.timestamp,
        formatted_date: post.formatted_date,
        score: post.score,
        num_comments: post.num_comments,
        author: post.author,
        is_self: post.is_self,
        name: post.name,
        selftext: post.selftext,
        thumbnail: post.thumbnail,
        intent: post.intent,
        permalink: post.permalink,
        category: categorizePost(
          post.title,
          settings.brandKeywords,
          settings.competitorKeywords,
        ),
      }));
      setSubreddits(mappedResults);
      setViewFilters(selectedSorts); // Sync view filters with search params
      console.log("Search results:", mappedResults);
    } catch (error) {
      console.error("Search error:", error);
      toast.error(`Search failed: ${error}`);
    } finally {
      setIsSearching(false);
    }
  };

  // ADD SINGLE SUBREDDIT TO REDDIT POSTS TABLE
  const addToTable = async (result: SearchResult) => {
    try {
      // ID is already parsed by backend, sent as string to avoid JS precision loss
      const parsedId = parseInt(result.id, 10);

      // Client-side duplicate check using parsed ID
      const isClientSideDuplicate = subRedditsSaved.some(
        (post) => post.id === parsedId,
      );

      if (isClientSideDuplicate) {
        toast.info(
          `Post "${result.title}" is already in your tracking table.`,
          {
            position: "bottom-center",
          },
        );
        return; // Exit if already exists client-side
      }

      // TAURI COMMAND TO SEND TO BE
      const isInserted: boolean = await invoke("save_single_reddit_command", {
        post: {
          id: parsedId,
          timestamp: result.timestamp || Date.now(),
          formatted_date:
            result.formatted_date || new Date().toISOString().split("T")[0],
          title: result.title,
          url: result.url,
          sort_type: result.sort_type,
          relevance_score: result.relevance_score,
          subreddit: result.subreddit,
          permalink: result.permalink || result.url,
          engaged: 0,
          assignee: "",
          notes: "",
          name: result.name || `na-${result.id}`, // Generate if missing
          selftext: result.selftext || "",
          author: result.author || "unknown",
          score: result.score || 0,
          thumbnail: result.thumbnail || "",
          is_self: result.is_self || false,
          num_comments: result.num_comments || 0,
          intent: result.intent || "Low", // Use result intent
          date_added: result.date_added || 0,
        },
      });

      // Reconstruct singlePost here as the backend only returns a boolean
      const singlePost: PostDataWrapper = {
        id: parsedId,
        timestamp: result.timestamp || Date.now(),
        formatted_date:
          result.formatted_date || new Date().toISOString().split("T")[0],
        title: result.title,
        url: result.url,
        sort_type: result.sort_type,
        relevance_score: result.relevance_score,
        subreddit: result.subreddit,
        permalink: result.permalink || result.url, // Using permalink if available
        engaged: 0,
        assignee: "",
        notes: "",
        name: result.name || `t3_${result.id}`, // Generate if missing
        selftext: result.selftext || "",
        author: result.author || "unknown",
        score: result.score || 0,
        thumbnail: result.thumbnail || "",
        is_self: result.is_self || false,
        num_comments: result.num_comments || 0,
        status: "new",
        intent: result.intent || "Low",
        category: categorizePost(
          result.title,
          settings.brandKeywords,
          settings.competitorKeywords,
        ),
        date_added: result.date_added || 0,
      };

      if (!isInserted) {
        toast.info(
          `Post "${singlePost.title}" is already in your tracking table.`,
          {
            position: "bottom-center",
          },
        );
        return;
      }

      addSingleSubreddit(singlePost);

      // Ensure all parameters are defined
      if (!singlePost?.url || !singlePost?.title || !singlePost.is_self) {
        throw new Error("This is not a a valid reddit post ");
      }

      await invoke("get_post_comments_command", {
        url: singlePost.url,
        title: singlePost.title,
        sortType: singlePost.sort_type, // Use new field, camelCase for Tauri
        subreddit: singlePost.subreddit, // Add subreddit here
      });

      toast.info(`Added ${singlePost.title} post to table`, {
        position: "bottom-center",
      });
      onNotifyNewPosts(1);
    } catch (err: any) {
      console.error("Error in addToTable:", err);
      toast.error(`Failed to add post: ${err.message || err}`);
    }
  };

  const handleOpenInBrowser = async (url: string) => {
    try {
      await openUrl(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  const handleGetComments = async (result: SearchResult, sort_type: string) => {
    try {
      const fetchedComments = (await invoke("get_post_comments_command", {
        url: result.url,
        title: result.title,
        sortType: sort_type,
        subreddit: result.subreddit,
      })) as Message[];

      setComments(fetchedComments);
      setCommentsPost(result);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast.error(`Failed to fetch comments: ${error}`);
    }
  };

  const handleSortTypeForCommentsChange = (newSortType: string) => {
    setSortTypeForComments(newSortType);
    if (commentsPost) {
      handleGetComments(commentsPost, newSortType);
    }
  };

  const addAllToTable = async () => {
    let addedCount = 0;
    let duplicateCount = 0;

    for (const result of paginatedResults) {
      const parsedId = parseInt(result.id, 10);
      const singlePost: PostDataWrapper = {
        id: parsedId,
        timestamp: result.timestamp || Date.now(),
        formatted_date:
          result.formatted_date || new Date().toISOString().split("T")[0],
        title: result.title,
        url: result.url,
        sort_type: result.sort_type,
        relevance_score: result.relevance_score,
        subreddit: result.subreddit,
        permalink: result.permalink || result.url,
        engaged: 0,
        assignee: "",
        notes: "",
        name: result.name || `t3_${result.id}`,
        selftext: result.selftext || "",
        author: result.author || "unknown",
        score: result.score || 0,
        thumbnail: result.thumbnail || "",
        is_self: result.is_self || false,
        num_comments: result.num_comments || 0,
        status: "new",
        intent: result.intent || "Low",
        category: categorizePost(
          result.title,
          settings.brandKeywords,
          settings.competitorKeywords,
        ),
        date_added: result.date_added || 0,
      };

      // Client-side duplicate check
      const isClientSideDuplicate = subRedditsSaved.some(
        (post) => post.id === singlePost.id,
      );

      if (isClientSideDuplicate) {
        duplicateCount++;
        continue;
      }

      try {
        const isInserted: boolean = await invoke("save_single_reddit_command", {
          post: singlePost,
        });

        if (isInserted) {
          addSingleSubreddit(singlePost);
          addedCount++;
          if (
            singlePost.url &&
            singlePost.title &&
            singlePost.sort_type &&
            singlePost.subreddit
          ) {
            await invoke("get_post_comments_command", {
              url: singlePost.url,
              title: singlePost.title,
              sortType: singlePost.sort_type,
              subreddit: singlePost.subreddit,
            });
          }
        } else {
          // Backend reported it as a duplicate
          duplicateCount++;
        }
      } catch (err: any) {
        console.error(`Error adding post ${singlePost.title}:`, err);
        toast.error(
          `Failed to add post "${singlePost.title}": ${err.message || err}`,
        );
      }
    }

    if (addedCount > 0) {
      toast.success(`Successfully added ${addedCount} post(s) to table!`, {
        position: "bottom-center",
      });
      onNotifyNewPosts(addedCount);
    }
    if (duplicateCount > 0) {
      toast.info(
        `${duplicateCount} post(s) were already in your tracking table.`,
        {
          position: "bottom-center",
        },
      );
    }
  };

  const searchMonitored = () => {
    const monitored = [
      ...settings.monitoredSubreddits,
      ...settings.monitoredKeywords,
    ];
    if (monitored.length > 0) {
      setQuery(monitored.join(" OR "));
    }
  };

  const [viewSort, setViewSort] = useState<
    | "date-desc"
    | "date-asc"
    | "score-desc"
    | "score-asc"
    | "comments-desc"
    | "comments-asc"
    | "original"
  >(() => {
    return (
      (localStorage.getItem("lastRedditSearchViewSort") as any) || "date-desc"
    );
  });

  const [viewFilters, setViewFilters] = useState<SortType[]>(() => {
    const saved = localStorage.getItem("lastRedditSearchViewFilters");
    return saved ? JSON.parse(saved) : ["hot", "top", "new"];
  });

  const [viewIntentFilters, setViewIntentFilters] = useState<string[]>(() => {
    const saved = localStorage.getItem("lastRedditSearchViewIntentFilters");
    return saved ? JSON.parse(saved) : ["High", "Medium", "Low"];
  });

  const [gridColumns, setGridColumns] = useState<number>(() => {
    const saved = localStorage.getItem("lastRedditSearchGridColumns");
    return saved ? parseInt(saved, 10) : 4;
  });

  useEffect(() => {
    localStorage.setItem("lastRedditSearchViewSort", viewSort);
  }, [viewSort]);

  useEffect(() => {
    localStorage.setItem(
      "lastRedditSearchViewFilters",
      JSON.stringify(viewFilters),
    );
  }, [viewFilters]);

  useEffect(() => {
    localStorage.setItem(
      "lastRedditSearchViewIntentFilters",
      JSON.stringify(viewIntentFilters),
    );
  }, [viewIntentFilters]);

  useEffect(() => {
    localStorage.setItem("lastRedditSearchGridColumns", gridColumns.toString());
  }, [gridColumns]);

  // Filter local results based on viewSort and viewFilters
  const sortedSubreddits = [...subreddits]
    .filter((item) => {
      const types = (item.sort_type || "").split(",");
      const sortTypeMatch = viewFilters.some((filter) =>
        types.includes(filter),
      );

      const intent = item.intent || "Low";
      const intentMatch = viewIntentFilters.some(
        (f) => f.toLowerCase() === intent.toLowerCase(),
      );

      return sortTypeMatch && intentMatch;
    })
    .sort((a, b) => {
      if (viewSort === "original") return 0;

      if (viewSort.startsWith("date")) {
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;
        return viewSort === "date-desc" ? timeB - timeA : timeA - timeB;
      }

      if (viewSort.startsWith("score")) {
        const scoreA = a.score || 0;
        const scoreB = b.score || 0;
        return viewSort === "score-desc" ? scoreB - scoreA : scoreA - scoreB;
      }

      if (viewSort.startsWith("comments")) {
        const commentsA = a.num_comments || 0;
        const commentsB = b.num_comments || 0;
        return viewSort === "comments-desc"
          ? commentsB - commentsA
          : commentsA - commentsB;
      }

      return 0;
    });

  const toggleViewFilter = (filter: SortType) => {
    setViewFilters((prev) => {
      if (prev.includes(filter)) {
        return prev.filter((f) => f !== filter);
      }
      return [...prev, filter];
    });
  };

  const toggleViewIntentFilter = (filter: string) => {
    setViewIntentFilters((prev) => {
      if (prev.includes(filter)) {
        return prev.filter((f) => f !== filter);
      }
      return [...prev, filter];
    });
  };

  const totalPages = Math.ceil(sortedSubreddits.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedResults = sortedSubreddits.slice(startIndex, endIndex);

  function isColoredRelevance(sortType: string) {
    // Renamed parameter
    switch (
      sortType // Use new parameter
    ) {
      case "hot":
        return "bg-red-500";
      case "top":
        return "bg-blue-500";
      case "new":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  }

  console.log("paginatedResults:", paginatedResults);

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0 animate-in fade-in duration-500">
      {/* Search Bar Section */}
      <Card className="p-4 shadow-sm border-border/60 bg-white backdrop-blur-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider opacity-80 flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                Reddit Engine
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Query global subreddits and monitor specific keywords
              </p>
            </div>
            <div className="flex gap-1.5 p-1 bg-muted/30 rounded-lg border border-border/40">
              {(["hot", "top", "new"] as SortType[]).map((sort) => (
                <Button
                  key={sort}
                  variant={selectedSorts.includes(sort) ? "default" : "ghost"}
                  size="sm"
                  onClick={() => toggleSort(sort)}
                  disabled={isSearching}
                  className={`h-7 px-3 text-[10px] font-bold uppercase tracking-tight transition-all ${
                    selectedSorts.includes(sort)
                      ? "shadow-sm"
                      : "opacity-60 hover:opacity-100 hover:bg-background/80"
                  }`}
                >
                  {sort === "hot" && <Flame className="h-3 w-3 mr-1.5" />}
                  {sort === "top" && <TrendingUp className="h-3 w-3 mr-1.5" />}
                  {sort === "new" && <Clock className="h-3 w-3 mr-1.5" />}
                  {sort}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search subreddits, keywords, or topics..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 h-10 bg-background/80 border-border/60 focus:ring-1 focus:ring-primary/20 transition-all text-sm"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="px-6 h-10 font-bold uppercase text-[11px] tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              {isSearching ? (
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running...
                </div>
              ) : (
                "Search"
              )}
            </Button>
            {/*<Button
              variant="outline"
              onClick={searchMonitored}
              disabled={isSearching}
              className="h-10 border-border/60 text-[11px] font-bold uppercase tracking-wider hover:bg-primary/5 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
              Auto-Pilot
            </Button>*/}
          </div>
        </div>
      </Card>

      {subreddits.length > 0 ? (
        <Card className="p-0 border-border/60 overflow-hidden flex flex-col flex-1 min-h-0">
          {/* View Contol Bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b bg-muted/20 backdrop-blur-md sticky top-0 z-10 transition-colors">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">
                  Sort:
                </span>
                <select
                  className="bg-transparent border-none text-[11px] font-semibold text-primary focus:ring-0 cursor-pointer p-0 h-auto"
                  value={viewSort}
                  onChange={(e) => setViewSort(e.target.value as any)}
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="score-desc">Popularity</option>
                  <option value="score-asc">Lowest Score</option>
                  <option value="comments-desc">Engagement</option>
                  <option value="comments-asc">Fewest Comments</option>
                </select>
              </div>

              <div className="w-px h-3 bg-border/60" />

              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-40 mr-1">
                  View:
                </span>
                {(["hot", "top", "new"] as SortType[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => toggleViewFilter(filter)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter transition-all ${
                      viewFilters.includes(filter)
                        ? filter === "hot"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : filter === "top"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "opacity-30 hover:opacity-100"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="w-px h-3 bg-border/60" />

               <div className="flex items-center gap-1">
                 <span className="text-[10px] uppercase font-bold tracking-widest opacity-40 mr-1">
                   Intent:
                 </span>
                 {["High", "Medium", "Low"].map((intent) => (
                   <button
                     key={intent}
                     onClick={() => toggleViewIntentFilter(intent)}
                     className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter transition-all ${
                       viewIntentFilters.includes(intent)
                         ? "bg-primary/10 text-primary"
                         : "opacity-30 hover:opacity-100"
                     }`}
                   >
                     {intent}
                   </button>
                 ))}
               </div>

               <div className="w-px h-3 bg-border/60" />

               <div className="flex items-center gap-1">
                 <span className="text-[10px] uppercase font-bold tracking-widest opacity-40 mr-1">
                   Layout:
                 </span>
                 <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <Button
                       variant="ghost"
                       size="sm"
                       className="h-6 px-2 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-all border border-primary/20"
                     >
                       {gridColumns} Columns
                     </Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end">
                     {[1, 2, 3, 4, 5].map((cols) => (
                       <DropdownMenuItem
                         key={cols}
                         className="text-xs"
                         onClick={() => setGridColumns(cols)}
                       >
                         {cols} {cols === 1 ? 'Column' : 'Columns'}
                       </DropdownMenuItem>
                     ))}
                   </DropdownMenuContent>
                 </DropdownMenu>
               </div>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-[10px] font-mono opacity-50 uppercase mr-2">
                {subreddits.length} Nodes Discovered
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={addAllToTable}
                className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-all border border-primary/20 shadow-sm"
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Import All
              </Button>
            </div>
          </div>

          {/* Results List - Redesigned to be dense and sleek */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background/30 p-3 scrollbar-thin scrollbar-thumb-border/20 scrollbar-track-transparent">
            {paginatedResults.length > 0 ? (
              <div className={`grid gap-3 ${
                gridColumns === 1 ? 'grid-cols-1' :
                gridColumns === 2 ? 'grid-cols-1 md:grid-cols-2' :
                gridColumns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                gridColumns === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
                'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
              }`}>
                {paginatedResults.map((result) => (
                  <div
                    key={result.id}
                    className="group relative p-3 rounded-lg border border-border/40 bg-background/50 hover:bg-background hover:border-border/80 transition-all duration-200 h-full"
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Badge
                                variant="outline"
                                className="font-mono text-[9px] py-0 h-4 px-1.5 cursor-pointer hover:bg-accent/50 selection:bg-transparent bg-background/50 border-muted-foreground/10"
                              >
                                r/{result.subreddit}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                className="text-xs"
                                onClick={() =>
                                  addSubredditToMonitoring(result.subreddit)
                                }
                              >
                                <Radar className="h-4 w-4 mr-2" />
                                Monitor r/{result.subreddit}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <div className="flex gap-1">
                            {result.sort_type?.split(",").map((type) => (
                              <div
                                key={type}
                                className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-white ${
                                  type === "hot"
                                    ? "bg-gradient-to-r from-red-500 to-red-600"
                                    : type === "top"
                                      ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                      : "bg-gradient-to-r from-green-500 to-green-600"
                                }`}
                              >
                                {type}
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-1.5 ml-auto">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
                                    onClick={() =>
                                      handleGetComments(
                                        result,
                                        sortTypeForComments,
                                      )
                                    }
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View Comments</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
                                    onClick={() =>
                                      handleOpenInBrowser(result.url)
                                    }
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Open in Browser</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
                                    onClick={() => addToTable(result)}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Add to Tracking</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <div className="text-[10px] text-muted-foreground/50 font-mono">
                              {moment(result.formatted_date).fromNow()}
                            </div>
                          </div>
                        </div>

                        <h4
                          className="font-bold text-sm leading-tight group-hover:text-primary transition-colors cursor-pointer line-clamp-3"
                          onClick={() => handleOpenInBrowser(result.url)}
                        >
                          <KeywordHighlighter
                            text={result.title}
                            searchQuery={query}
                            brandKeywords={settings.brandKeywords}
                            competitorKeywords={settings.competitorKeywords}
                            generalKeywords={settings.monitoredKeywords}
                          />
                        </h4>

                        {result.snippet && (
                          <p className="text-[11px] text-muted-foreground/70 line-clamp-2 mb-2 leading-relaxed">
                            {result.snippet}
                          </p>
                        )}

                        <div className="flex items-center gap-2.5 mt-1.5">
                          {result.intent && (
                            <Badge
                              className={`${getIntentColor(
                                result.intent.toLowerCase(),
                              )} text-[9px] h-4.5 px-1 font-bold border-0 shadow-none`}
                            >
                              {result.intent.toUpperCase()}
                            </Badge>
                          )}

                          <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full border border-border/30">
                            <div className="flex items-center gap-1">
                              <ArrowUpDown className="h-2.5 w-2.5" />
                              <span>{result.score}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Plus className="h-2.5 w-2.5 opacity-50" />
                              <span>{result.num_comments}</span>
                            </div>
                            <div className="flex items-center gap-1 border-l pl-2 border-border/40">
                              <span className="opacity-50">BY:</span>
                              <span className="text-foreground/80">
                                {result.author}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <Search className="h-10 w-10 mb-2" />
                <p className="text-sm font-bold uppercase tracking-widest">
                  No Node Data
                </p>
              </div>
            )}
          </div>

          {/* Footer - Redesigned Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-1.5 bg-muted/10 border-t backdrop-blur-md relative z-10">
              <div className="flex items-center gap-3">
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
                  {Math.min(endIndex, subreddits.length)} of {subreddits.length}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-50 hover:opacity-100 transition-all active:scale-90"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-50 hover:opacity-100 transition-all active:scale-90"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/5 border border-primary/20">
                  <span className="text-[9px] font-bold text-primary opacity-60">
                    PAGE
                  </span>
                  <span className="text-[10px] font-bold text-primary font-mono">
                    {currentPage}
                  </span>
                  <span className="text-[9px] font-bold text-primary opacity-40">
                    /
                  </span>
                  <span className="text-[10px] font-bold text-primary font-mono">
                    {totalPages}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-50 hover:opacity-100 transition-all active:scale-90"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-50 hover:opacity-100 transition-all active:scale-90"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        !isSearching &&
        hasSearched &&
        query.trim() && (
          <div className="flex flex-col items-center justify-center p-12 bg-background/50 border border-dashed rounded-xl opacity-50 animate-in zoom-in duration-300">
            <Search className="h-8 w-8 mb-3 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest">
              Null Response
            </p>
            <p className="text-xs mt-1">Found 0 nodes for query: {query}</p>
          </div>
        )
      )}

      <RedditCommentsView
        isOpen={commentsPost !== null}
        onOpenChange={(open) => !open && setCommentsPost(null)}
        post={
          commentsPost
            ? {
                id: commentsPost.name || commentsPost.id,
                title: commentsPost.title,
                url: commentsPost.url,
                subreddit: commentsPost.subreddit,
              }
            : null
        }
        comments={comments}
        sortType={sortTypeForComments}
        onSortTypeChange={handleSortTypeForCommentsChange}
      />
    </div>
  );
}
