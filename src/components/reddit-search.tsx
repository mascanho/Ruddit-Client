import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Radar,
  MessageSquare,
  ExternalLink,
  FileSpreadsheet,
  FileJson,
  Upload,
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
import { useAddSingleSubReddit, useSubredditsStore } from "@/store/store";
import type { Message } from "./smart-data-tables";
import { RedditCommentsView } from "./reddit-comments-view";
import { toast } from "sonner";
import moment from "moment";
import { openUrl } from "@tauri-apps/plugin-opener";
import { KeywordHighlighter } from "./keyword-highlighter";
import { getIntentColor } from "@/lib/marketing-utils";

// Import modularized utilities
import {
  SearchBar,
  exportToCSV,
  exportToJSON,
  importData,
  filterAndSortResults,
  performSearch,
  fetchAllSearchedPosts,
  addResultToTable,
  addAllResultsToTable,
  type SearchResult,
  type SortType,
  type ViewSortType,
} from "./reddit-search/index";

export function RedditSearch({
  onAddResults,
  onNotifyNewPosts,
}: {
  onAddResults: (results: SearchResult[]) => void;
  onNotifyNewPosts: (count: number) => void;
}) {
  // Search state
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedSorts, setSelectedSorts] = useState<SortType[]>(["hot"]);

  // Load from localStorage after hydration
  useEffect(() => {
    const savedQuery = localStorage.getItem("lastRedditSearchQuery");
    if (savedQuery) setQuery(savedQuery);

    const saved = localStorage.getItem("lastRedditSearchSorts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedSorts(parsed);
      } catch (e) {
        // If parsing fails, keep default
      }
    }
  }, []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  // Load pagination settings from localStorage after hydration
  useEffect(() => {
    const savedPage = localStorage.getItem("lastRedditSearchPage");
    const savedRows = localStorage.getItem("lastRedditSearchRowsPerPage");

    if (savedPage) {
      const page = parseInt(savedPage, 10);
      if (!isNaN(page)) setCurrentPage(page);
    }

    if (savedRows) {
      const rows = parseInt(savedRows, 10);
      if (!isNaN(rows)) setRowsPerPage(rows);
    }
  }, []);

  // View state
  const [viewSort, setViewSort] = useState<ViewSortType>("date-desc");
  const [viewFilters, setViewFilters] = useState<SortType[]>(["hot", "top", "new"]);

  // Load view settings from localStorage after hydration
  useEffect(() => {
    const savedSort = localStorage.getItem("lastRedditSearchViewSort") as ViewSortType;
    if (savedSort) setViewSort(savedSort);

    const savedFilters = localStorage.getItem("lastRedditSearchViewFilters");
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        if (parsed && parsed.length > 0) {
          setViewFilters(parsed);
        }
      } catch (e) {
        // If parsing fails, keep default
      }
    }
  }, []);
  const [viewIntentFilters, setViewIntentFilters] = useState<string[]>(["High", "Medium", "Low"]);

  // Load intent filters from localStorage after hydration
  useEffect(() => {
    const saved = localStorage.getItem("lastRedditSearchViewIntentFilters");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setViewIntentFilters(parsed);
      } catch (e) {
        // If parsing fails, keep default
      }
    }
  }, []);
  const [filterQuery, setFilterQuery] = useState("");
  const [gridColumns, setGridColumns] = useState<number>(4);

  // Load grid columns from localStorage after hydration
  useEffect(() => {
    const saved = localStorage.getItem("lastRedditSearchGridColumns");
    if (saved) {
      const cols = parseInt(saved, 10);
      if (!isNaN(cols)) setGridColumns(cols);
    }
  }, []);

  // Comments state
  const [comments, setComments] = useState<Message[]>([]);
  const [commentsPost, setCommentsPost] = useState<SearchResult | null>(null);
  const [sortTypeForComments, setSortTypeForComments] = useState("best");

  // Stores
  const { settings, updateSettings } = useAppSettings();
  const { setSubreddits, subreddits } = useSubredditsStore();
  const { addSingleSubreddit, subRedditsSaved } = useAddSingleSubReddit();

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lastRedditSearchQuery", query);
    }
  }, [query]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "lastRedditSearchSorts",
        JSON.stringify(selectedSorts),
      );
    }
  }, [selectedSorts]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lastRedditSearchPage", currentPage.toString());
    }
  }, [currentPage]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lastRedditSearchRows", rowsPerPage.toString());
    }
  }, [rowsPerPage]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lastRedditSearchViewSort", viewSort);
    }
  }, [viewSort]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "lastRedditSearchViewFilters",
        JSON.stringify(viewFilters),
      );
    }
  }, [viewFilters]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "lastRedditSearchViewIntentFilters",
        JSON.stringify(viewIntentFilters),
      );
    }
  }, [viewIntentFilters]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lastRedditSearchGridColumns", gridColumns.toString());
    }
  }, [gridColumns]);

  // Load persisted search results on mount
  useEffect(() => {
    const loadPersistedResults = async () => {
      try {
        const results = await fetchAllSearchedPosts(
          settings.brandKeywords,
          settings.competitorKeywords,
        );
        setSubreddits(results as any); // Type cast - SearchResult is compatible with PostDataWrapper
      } catch (error) {
        console.error("Error loading persisted results:", error);
      }
    };
    loadPersistedResults();
  }, []);

  // Handlers
  const toggleSort = (sort: SortType) => {
    setSelectedSorts((prev) => {
      if (prev.includes(sort)) {
        return prev.filter((s) => s !== sort);
      }
      return [...prev, sort];
    });
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setCurrentPage(1);

    try {
      const results = await performSearch({
        query,
        sortTypes: selectedSorts,
        brandKeywords: settings.brandKeywords,
        competitorKeywords: settings.competitorKeywords,
      });
      setSubreddits(results as any); // Type cast - SearchResult is compatible with PostDataWrapper
      setViewFilters(selectedSorts);
    } catch (error) {
      // Error already handled in performSearch
    } finally {
      setIsSearching(false);
    }
  };

  // Filter and sort results (moved up to be available for exports)
  const sortedSubreddits = filterAndSortResults(subreddits as any, {
    viewSort,
    viewFilters,
    viewIntentFilters,
    filterQuery,
  });

  const handleExportCSV = () => exportToCSV(sortedSubreddits as any);
  const handleExportJSON = () => exportToJSON(sortedSubreddits as any);
  const handleImportClick = () => {
    importData((data) => {
      console.log("Importing data:", data);
      setSubreddits(data as any);
      // Reset filters to show all imported data
      setViewFilters(["hot", "top", "new"]);
      setViewIntentFilters(["High", "Medium", "Low"]);
      setFilterQuery("");
      setCurrentPage(1);
    });
  };

  const addToTable = async (result: SearchResult) => {
    await addResultToTable({
      result,
      brandKeywords: settings.brandKeywords,
      competitorKeywords: settings.competitorKeywords,
      subRedditsSaved,
      addSingleSubreddit,
      onNotifyNewPosts,
    });
  };

  const addAllToTable = async () => {
    await addAllResultsToTable(
      paginatedResults,
      settings.brandKeywords,
      settings.competitorKeywords,
      subRedditsSaved,
      addSingleSubreddit,
      onNotifyNewPosts,
    );
  };

  const handleOpenInBrowser = async (url: string) => {
    try {
      await openUrl(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  const handleGetComments = async (result: SearchResult, sort_type: string) => {
    // Prioritize permalink as it always points to the Reddit thread
    const targetUrl = result.permalink || result.url;

    if (!result.subreddit || result.subreddit === "N/A" || !targetUrl) {
      toast.error("Decryption Failed: Non-Reddit Node", {
        description:
          "This search result lacks a valid Reddit path. Signal synchronization is impossible.",
      });
      return;
    }

    try {
      const fetchedComments = (await invoke("get_post_comments_command", {
        url: targetUrl,
        title: result.title,
        sortType: sort_type,
        subreddit: result.subreddit,
        fullname: result.name,
      })) as Message[];

      setComments(fetchedComments || []);
      setCommentsPost(result);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast.error(`Transmission Error: ${error}`, {
        description:
          "Failed to fetch Reddit comments. Please verify your connection.",
      });
    }
  };

  const handleSortTypeForCommentsChange = (newSortType: string) => {
    setSortTypeForComments(newSortType);
    if (commentsPost) {
      handleGetComments(commentsPost, newSortType);
    }
  };

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

  // Pagination
  const totalPages = Math.ceil(sortedSubreddits.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedResults = sortedSubreddits.slice(startIndex, endIndex);

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0 animate-in fade-in duration-500">
      {/* Search Bar */}
      <SearchBar
        query={query}
        setQuery={setQuery}
        handleSearch={handleSearch}
        isSearching={isSearching}
        selectedSorts={selectedSorts}
        toggleSort={toggleSort}
      />

      {subreddits.length > 0 ? (
        <Card className="p-0 border-border/60 overflow-hidden flex flex-col flex-1 min-h-0">
          {/* View Control Bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b bg-muted/20 backdrop-blur-md sticky top-0 z-10 transition-colors">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">
                  Sort:
                </span>
                <select
                  className="bg-transparent border-none text-[11px] font-semibold text-primary focus:ring-0 cursor-pointer p-0 h-auto"
                  value={viewSort}
                  onChange={(e) => setViewSort(e.target.value as ViewSortType)}
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
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter transition-all ${viewFilters.includes(filter)
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

              {/* Local Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={filterQuery ? "secondary" : "ghost"}
                    size="sm"
                    className={`h-6 px-2 text-[10px] uppercase font-bold tracking-wider ${filterQuery
                      ? "text-primary"
                      : "opacity-60 hover:opacity-100"
                      }`}
                  >
                    <Search className="h-3 w-3 mr-1.5" />
                    {filterQuery ? "Filtered" : "Filter"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px] p-2">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">
                      Filter Results
                    </span>
                    <Input
                      placeholder="Type to filter..."
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className="h-8 text-xs bg-muted/30"
                      autoFocus
                    />
                    {filterQuery && (
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFilterQuery("")}
                          className="h-6 text-[10px] hover:bg-destructive/10 hover:text-destructive"
                        >
                          Clear Filter
                        </Button>
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-3 bg-border/60" />

              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-40 mr-1">
                  Intent:
                </span>
                {["High", "Medium", "Low"].map((intent) => (
                  <button
                    key={intent}
                    onClick={() => toggleViewIntentFilter(intent)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter transition-all ${viewIntentFilters.includes(intent)
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
                        {cols} {cols === 1 ? "Column" : "Columns"}
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

              <div className="flex items-center gap-1 border-r border-border/40 pr-2 mr-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-60 hover:opacity-100 hover:text-green-500"
                        onClick={handleExportCSV}
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <p>
                        Export CSV ({sortedSubreddits.length} filtered items)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-60 hover:opacity-100 hover:text-orange-500"
                        onClick={handleExportJSON}
                      >
                        <FileJson className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <p>
                        Export JSON ({sortedSubreddits.length} filtered items)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-60 hover:opacity-100 hover:text-blue-500"
                        onClick={handleImportClick}
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Import Data
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={addAllToTable}
                className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-all border border-primary/20 shadow-sm"
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Track All
              </Button>
            </div>
          </div>

          {/* Results Grid */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background/30 p-3 scrollbar-thin scrollbar-thumb-border/20 scrollbar-track-transparent -mt-6 -mb-6">
            {paginatedResults.length > 0 ? (
              <div
                className={`grid gap-3 ${gridColumns === 1
                  ? "grid-cols-1"
                  : gridColumns === 2
                    ? "grid-cols-1 md:grid-cols-2"
                    : gridColumns === 3
                      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      : gridColumns === 4
                        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                  }`}
              >
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
                                className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-white ${type === "hot"
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

          {/* Pagination Footer */}
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

      {/* Comments View */}
      <RedditCommentsView
        isOpen={commentsPost !== null}
        onOpenChange={(open) => !open && setCommentsPost(null)}
        post={
          commentsPost
            ? {
              id: parseInt(commentsPost.id),
              title: commentsPost.title,
              url: commentsPost.url,
              subreddit: commentsPost.subreddit,
              timestamp: commentsPost.timestamp || 0,
              formatted_date: commentsPost.formatted_date || "",
              sort_type: commentsPost.sort_type,
              relevance_score: commentsPost.relevance_score,
              score: commentsPost.score,
              num_comments: commentsPost.num_comments,
              author: commentsPost.author || "unknown",
              is_self: commentsPost.is_self || false,
              selftext: commentsPost.selftext || "",
              engaged: 0,
              assignee: "",
              notes: "",
              name: commentsPost.name || commentsPost.id,
              permalink: commentsPost.permalink || commentsPost.url,
              status: "new",
              intent: commentsPost.intent || "Low",
              interest: commentsPost.interest || 0,
              date_added: commentsPost.date_added || 0,
            }
            : null
        }
        comments={comments}
        sortType={sortTypeForComments}
        onSortTypeChange={handleSortTypeForCommentsChange}
        onCommentAdded={(newComment) => {
          setComments((prev) => [newComment, ...prev]);
        }}
      />
    </div>
  );
}
