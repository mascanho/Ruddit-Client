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
} from "lucide-react";
import { useAppSettings } from "./app-settings";
import { invoke } from "@tauri-apps/api/core";
import {
  useAddSingleSubReddit,
  useRedditPostsTab,
  useSubredditsStore,
} from "@/store/store";
import { toast } from "sonner";
import moment from "moment";
import { openUrl } from "@tauri-apps/plugin-opener";
import { calculateIntent, categorizePost, getIntentColor } from "@/lib/marketing-utils";

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
  intent?: "high" | "medium" | "low";
  category?: "brand" | "competitor" | "general";
};

type SortType = "hot" | "top" | "new";

export function RedditSearch({
  onAddResults,
  onNotifyNewPosts,
}: {
  onAddResults: (results: SearchResult[]) => void;
  onNotifyNewPosts: (count: number) => void;
}) {
  const [query, setQuery] = useState(() => localStorage.getItem("lastRedditSearchQuery") || "");
  const [isSearching, setIsSearching] = useState(false);
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
  const { settings } = useAppSettings();
  const { setSubreddits, subreddits } = useSubredditsStore();
  const { addSingleSubreddit, subRedditsSaved } = useAddSingleSubReddit();

  // Helper function to escape special characters for regex
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
  };

  // Persist query and sorts
  useEffect(() => {
    localStorage.setItem("lastRedditSearchQuery", query);
  }, [query]);

  useEffect(() => {
    localStorage.setItem("lastRedditSearchSorts", JSON.stringify(selectedSorts));
  }, [selectedSorts]);

  useEffect(() => {
    localStorage.setItem("lastRedditSearchPage", currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem("lastRedditSearchRows", rowsPerPage.toString());
  }, [rowsPerPage]);

  // Helper function to highlight keywords in text
  const highlightKeywords = (text: string, currentQuery: string) => {
    if (!text || !currentQuery.trim()) return text;

    const rawKeywords = currentQuery
      .split(/\s+/)
      .filter((k) => k.length > 0);

    if (rawKeywords.length === 0) return text;

    // Create a single regex with all keywords joined by |
    // Escape keywords for the regex pattern
    const escapedKeywords = rawKeywords.map(escapeRegExp);
    const regex = new RegExp(`(${escapedKeywords.join("|")})`, "gi");

    // Split the text based on the regex. capturing groups are included in the result.
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) => {
          // Check if this part matches any of the keywords (case insensitive)
          // We check if the part (lowercased) matches any of the raw keywords (lowercased)
          const isMatch = rawKeywords.some(
            (k) => part.toLowerCase() === k.toLowerCase(),
          );

          if (isMatch) {
            return (
              <span key={i} className="bg-yellow-200 font-bold text-black">
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
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
        snippet: post.selftext ? post.selftext.slice(0, 200) + (post.selftext.length > 200 ? "..." : "") : "",
        timestamp: post.timestamp,
        formatted_date: post.formatted_date,
        score: post.score,
        num_comments: post.num_comments,
        author: post.author,
        is_self: post.is_self,
        name: post.name,
        selftext: post.selftext,
        thumbnail: post.thumbnail,
        intent: calculateIntent(post.title),
        category: categorizePost(
          post.title,
          settings.brandKeywords,
          settings.competitorKeywords
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
        snippet: post.selftext ? post.selftext.slice(0, 200) + (post.selftext.length > 200 ? "..." : "") : "",
        timestamp: post.timestamp,
        formatted_date: post.formatted_date,
        score: post.score,
        num_comments: post.num_comments,
        author: post.author,
        is_self: post.is_self,
        name: post.name,
        selftext: post.selftext,
        thumbnail: post.thumbnail,
        intent: calculateIntent(post.title),
        category: categorizePost(
          post.title,
          settings.brandKeywords,
          settings.competitorKeywords
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
        snippet: post.selftext ? post.selftext.slice(0, 200) + (post.selftext.length > 200 ? "..." : "") : "",
        timestamp: post.timestamp,
        formatted_date: post.formatted_date,
        score: post.score,
        num_comments: post.num_comments,
        author: post.author,
        is_self: post.is_self,
        name: post.name,
        selftext: post.selftext,
        thumbnail: post.thumbnail,
        intent: calculateIntent(post.title),
        category: categorizePost(
          post.title,
          settings.brandKeywords,
          settings.competitorKeywords
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
          permalink: result.url,
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
        permalink: result.url, // Using url as permalink
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
        intent: calculateIntent(result.title),
        category: categorizePost(
          result.title,
          settings.brandKeywords,
          settings.competitorKeywords
        ),
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

  const addAllToTable = async () => {
    let addedCount = 0;
    let duplicateCount = 0;

    for (const result of paginatedResults) {
      const parsedId = parseInt(result.id, 10);
      const singlePost: PostDataWrapper = {
        id: parsedId,
        timestamp: result.timestamp || Date.now(),
        formatted_date: result.formatted_date || new Date().toISOString().split("T")[0],
        title: result.title,
        url: result.url,
        sort_type: result.sort_type,
        relevance_score: result.relevance_score,
        subreddit: result.subreddit,
        permalink: result.url,
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
        intent: calculateIntent(result.title),
        category: categorizePost(
          result.title,
          settings.brandKeywords,
          settings.competitorKeywords
        ),
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
          if (singlePost.url && singlePost.title && singlePost.sort_type && singlePost.subreddit) {
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
        toast.error(`Failed to add post "${singlePost.title}": ${err.message || err}`);
      }
    }

    if (addedCount > 0) {
      toast.success(`Successfully added ${addedCount} post(s) to table!`, {
        position: "bottom-center",
      });
      onNotifyNewPosts(addedCount);
    }
    if (duplicateCount > 0) {
      toast.info(`${duplicateCount} post(s) were already in your tracking table.`, {
        position: "bottom-center",
      });
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
    "date-desc" | "date-asc" | "score-desc" | "score-asc" | "comments-desc" | "comments-asc" | "original"
  >(() => {
    return (localStorage.getItem("lastRedditSearchViewSort") as any) || "date-desc";
  });

  const [viewFilters, setViewFilters] = useState<SortType[]>(() => {
    const saved = localStorage.getItem("lastRedditSearchViewFilters");
    return saved ? JSON.parse(saved) : ["hot", "top", "new"];
  });

  useEffect(() => {
    localStorage.setItem("lastRedditSearchViewSort", viewSort);
  }, [viewSort]);

  useEffect(() => {
    localStorage.setItem("lastRedditSearchViewFilters", JSON.stringify(viewFilters));
  }, [viewFilters]);

  // Filter local results based on viewSort and viewFilters
  const sortedSubreddits = [...subreddits]
    .filter((item) => {
      const types = (item.sort_type || "").split(",");
      return viewFilters.some(filter => types.includes(filter));
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
        return viewSort === "comments-desc" ? commentsB - commentsA : commentsA - commentsB;
      }

      return 0;
    });

  const toggleViewFilter = (filter: SortType) => {
    setViewFilters((prev) => {
      if (prev.includes(filter)) {
        return prev.filter(f => f !== filter);
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
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Search Reddit</h3>
          <p className="text-sm text-muted-foreground">
            Search for posts across Reddit and add them to your tracking table
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Find by:</span>
          <div className="flex gap-2">
            <Button
              variant={selectedSorts.includes("hot") ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSort("hot")}
              disabled={isSearching}
            >
              <Flame className="h-4 w-4 mr-2" />
              Hot
            </Button>
            <Button
              variant={selectedSorts.includes("top") ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSort("top")}
              disabled={isSearching}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Top
            </Button>
            <Button
              variant={selectedSorts.includes("new") ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSort("new")}
              disabled={isSearching}
            >
              <Clock className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>
          {selectedSorts.length > 1 && (
            <Badge variant="secondary" className="text-xs">
              {selectedSorts.length} filters active
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subreddits, keywords, or topics..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
          >
            {isSearching ? "Searching..." : "Search"}
          </Button>
          <Button
            variant="outline"
            onClick={searchMonitored}
            disabled={isSearching}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Use Monitored
          </Button>
        </div>

        {subreddits.length > 0 && (
          <>
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {subreddits.length} results found
                </p>
                <div className="h-4 w-px bg-border mx-2" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Sort order:</span>
                  <select
                    className="border rounded px-2 py-1 text-xs bg-background"
                    value={viewSort}
                    onChange={(e) => setViewSort(e.target.value as any)}
                  >
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="score-desc">Highest Score</option>
                    <option value="score-asc">Lowest Score</option>
                    <option value="comments-desc">Most Comments</option>
                    <option value="comments-asc">Fewest Comments</option>
                    <option value="original">Unsorted</option>
                  </select>
                </div>
                <div className="h-4 w-px bg-border mx-2" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Filter view:</span>
                  <Button
                    variant={viewFilters.includes("hot") ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleViewFilter("hot")}
                  >
                    <Flame className="h-3 w-3 mr-1" />
                    Hot
                  </Button>
                  <Button
                    variant={viewFilters.includes("top") ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleViewFilter("top")}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Top
                  </Button>
                  <Button
                    variant={viewFilters.includes("new") ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleViewFilter("new")}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    New
                  </Button>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={addAllToTable}>
                <Plus className="h-4 w-4 mr-2" />
                Add All to Table
              </Button>
            </div>

            <div className="space-y-3 max-h-[570px] overflow-y-auto">
              {paginatedResults.map((result) => (
                <Card
                  key={result.id}
                  className="p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium mb-1 line-clamp-2 text-base">
                        {highlightKeywords(result.title, query)}
                      </h4>
                      {result.snippet && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {result.snippet}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        {result.intent && (
                          <Badge className={getIntentColor(result.intent)}>
                            {result.intent.toUpperCase()} INTENT
                          </Badge>
                        )}

                        <Badge variant="outline" className="font-mono text-xs">
                          r/{result.subreddit}
                        </Badge>

                        {result.sort_type?.split(",").map((type) => (
                          <Badge key={type} className={isColoredRelevance(type)}>
                            {type}
                          </Badge>
                        ))}

                        <div className="h-4 w-px bg-border mx-1" />

                        <div className="flex items-center gap-4">
                          <span title="Score">
                            Score: <span className="font-medium text-foreground">{result.score}</span>
                          </span>
                          <span title="Comments">
                            Comments: <span className="font-medium text-foreground">{result.num_comments}</span>
                          </span>
                          <span title="Author">
                            By: <span className="font-medium text-foreground">{result.author}</span>
                          </span>
                          <span title="Date">
                            {moment(result.formatted_date).fromNow()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => handleOpenInBrowser(result.url)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addToTable(result)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">
                      Rows per page:
                    </label>
                    <select
                      className="border rounded px-2 py-1 text-sm bg-background"
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-
                    {Math.min(endIndex, subreddits.length)} of{" "}
                    {subreddits.length}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
