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

type SearchResult = {
  id: string;
  title: string;
  subreddit: string;
  url: string;
  relevance: number;
  snippet: string;
  timestamp?: number;
  formatted_date?: string;
};

type SortType = "hot" | "top" | "new";

export function RedditSearch({
  onAddResults,
  onNotifyNewPosts,
}: {
  onAddResults: (results: SearchResult[]) => void;
  onNotifyNewPosts: (count: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSorts, setSelectedSorts] = useState<SortType[]>(["hot"]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const { settings } = useAppSettings();
  const { setSubreddits, subreddits } = useSubredditsStore();
  const { redditPosts, setRedditPosts } = useRedditPostsTab();
  const { addSingleSubreddit } = useAddSingleSubReddit();

  async function handleFetchSubreddits() {
    try {
      await invoke("get_all_searched_posts").then((subreddits) => {
        setSubreddits(subreddits);
        console.log("Subreddits:", subreddits);
      });
    } catch (error) {
      console.error("Error fetching subreddits:", error);
    }
  }

  // KEEP THE SEARCH PERSISTING by querying the DB of the search results
  async function persistSearch() {
    try {
      await invoke("get_all_searched_posts").then((subreddits) => {
        setSubreddits(subreddits);
        console.log("Subreddits:", subreddits);
      });
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
        // Don't allow deselecting all
        if (prev.length === 1) return prev;
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
      const result: string = await invoke("get_reddit_results", {
        relevance: selectedSorts,
        query: query.trim(),
      });

      console.log("Database result:", result);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
      handleFetchSubreddits();
    }
  };

  // ADD SINGLE SUBREDDIT TO REDDIT POSTS TABLE
  const addToTable = async (result: SearchResult) => {
    try {
      // TAURI COMMAND TO SEND TO BE
      const singlePost = await invoke("save_single_reddit_command", {
        post: {
          id: parseInt(result.id),
          timestamp: result.timestamp || Date.now(),
          formatted_date:
            result.formatted_date || new Date().toISOString().split("T")[0],
          title: result.title,
          url: result.url,
          relevance: result.relevance.toString(),
          subreddit: result.subreddit,
          permalink: result.url,
        },
      });

      console.log("Post Title:", singlePost.title);

      // Now singlePost should match PostDataWrapper format
      addSingleSubreddit(singlePost);

      // Ensure all parameters are defined
      if (!singlePost?.url || !singlePost?.title) {
        throw new Error("Post URL or title is missing");
      }

      await invoke("get_post_comments_command", {
        url: singlePost.url,
        title: singlePost.title,
        relevance: "top",
      });

      toast.info(`Added ${singlePost.title} post to table`, {
        position: "bottom-center",
      });
    } catch (err) {
      console.error("Error in addToTable:", err);
      toast.error(`Failed to add post: ${err.message}`);
    }

    onNotifyNewPosts(1);
  };

  const handleOpenInBrowser = async (url: string) => {
    try {
      await openUrl(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  const addAllToTable = () => {
    onAddResults(
      subreddits.map((result) => ({
        id: result.id,
        date: new Date().toISOString().split("T")[0],
        title: result.title,
        url: result.url,
        relevance: result.relevance,
        subreddit: result.subreddit,
      })),
    );

    onNotifyNewPosts(subreddits.length);
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

  const totalPages = Math.ceil(subreddits.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedResults = subreddits.slice(startIndex, endIndex);

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
                {selectedSorts.map((sort) => (
                  <Badge key={sort} variant="secondary" className="text-xs">
                    {sort === "hot" && <Flame className="h-3 w-3 mr-1" />}
                    {sort === "top" && <TrendingUp className="h-3 w-3 mr-1" />}
                    {sort === "new" && <Clock className="h-3 w-3 mr-1" />}
                    {sort}
                  </Badge>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addAllToTable}>
                <Plus className="h-4 w-4 mr-2" />
                Add All to Table
              </Button>
            </div>

            <div className="space-y-3 max-h-[580px] overflow-y-auto">
              {paginatedResults.map((result) => (
                <Card
                  key={result.id}
                  className="p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium mb-1 line-clamp-2">
                        {result.title}
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {result.snippet}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">
                          r/{result.subreddit}
                        </Badge>
                        <Badge
                          className={
                            result.relevance >= 80
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : result.relevance >= 60
                                ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }
                        >
                          {result.relevance}% relevant
                        </Badge>

                        <div className="flex space-x-2 items-center">
                          <span className="text-black font-semibold">
                            Posted on:{" "}
                          </span>
                          <span>{result?.formatted_date}</span>
                          <span>-</span>
                          <span>
                            {moment(
                              result?.formatted_date,
                              "YYYY-MM-DD",
                            ).fromNow()}
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
