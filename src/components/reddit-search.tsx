"use client";

import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useAppSettings } from "./app-settings";

type SearchResult = {
  id: string;
  title: string;
  subreddit: string;
  url: string;
  relevance: number;
  snippet: string;
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
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedSorts, setSelectedSorts] = useState<SortType[]>(["hot"]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { toast } = useToast();
  const { settings } = useAppSettings();

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

  const generateMockResults = (
    searchQuery: string,
    sortType: SortType,
  ): SearchResult[] => {
    const templates = [
      {
        titleTemplate: `How to implement ${searchQuery} in production`,
        subreddits: ["webdev", "programming", "javascript"],
      },
      {
        titleTemplate: `Best practices for ${searchQuery}`,
        subreddits: ["coding", "learnprogramming", "typescript"],
      },
      {
        titleTemplate: `${searchQuery} performance optimization tips`,
        subreddits: ["nextjs", "react", "webdev"],
      },
      {
        titleTemplate: `Understanding ${searchQuery} - A comprehensive guide`,
        subreddits: ["programming", "webdev", "javascript"],
      },
      {
        titleTemplate: `${searchQuery} vs alternatives - What should you choose?`,
        subreddits: ["webdev", "programming", "coding"],
      },
    ];

    let relevanceModifier = 0;
    if (sortType === "hot") {
      relevanceModifier = 15;
    } else if (sortType === "top") {
      relevanceModifier = 20;
    } else if (sortType === "new") {
      relevanceModifier = -10;
    }

    return templates.map((template, index) => ({
      id: `search_${sortType}_${Date.now()}_${index}`,
      title: template.titleTemplate,
      subreddit:
        template.subreddits[
          Math.floor(Math.random() * template.subreddits.length)
        ],
      url: `https://reddit.com/r/${template.subreddits[0]}/post${index}`,
      relevance: Math.max(
        0,
        Math.min(100, Math.floor(Math.random() * 30) + 60 + relevanceModifier),
      ),
      snippet: `Discussion about ${searchQuery} and its applications in modern web development...`,
    }));
  };

  // HANDLE THE SEARCH FUNCTION
  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setCurrentPage(1);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate results for each selected sort type
    const allResults: SearchResult[] = [];
    selectedSorts.forEach((sortType) => {
      const mockResults = generateMockResults(query, sortType);
      allResults.push(...mockResults);
    });

    setResults(allResults);
    setIsSearching(false);

    toast({
      title: "Search complete",
      description: `Found ${allResults.length} results across ${selectedSorts.join(", ")} for "${query}"`,
    });
  };

  const addToTable = (result: SearchResult) => {
    onAddResults([
      {
        id: result.id,
        date: new Date().toISOString().split("T")[0],
        title: result.title,
        url: result.url,
        relevance: result.relevance,
        subreddit: result.subreddit,
      },
    ]);

    onNotifyNewPosts(1);

    toast({
      title: "Added to Reddit Posts",
      description: `"${result.title.substring(0, 50)}..." has been added`,
    });
  };

  const addAllToTable = () => {
    onAddResults(
      results.map((result) => ({
        id: result.id,
        date: new Date().toISOString().split("T")[0],
        title: result.title,
        url: result.url,
        relevance: result.relevance,
        subreddit: result.subreddit,
      })),
    );

    onNotifyNewPosts(results.length);

    toast({
      title: `${results.length} posts added to Reddit Posts`,
      description: "All search results have been added to your table",
    });

    setResults([]);
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

  const totalPages = Math.ceil(results.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedResults = results.slice(startIndex, endIndex);

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

        {results.length > 0 && (
          <>
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {results.length} results found
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

            <div className="space-y-3">
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
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addToTable(result)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
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
                    {Math.min(endIndex, results.length)} of {results.length}
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
