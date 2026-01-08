"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Fuse from "fuse.js";
import {
  Play,
  StopCircle,
  Activity,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Bot,
  Radar,
  User,
  ArrowUp,
  ArrowDown,
  Search,
  MessageCircle, // Added MessageCircle icon
} from "lucide-react";
import { RedditCommentsView } from "./reddit-comments-view";
import type { Message } from "./smart-data-tables";
import moment from "moment";
import { Badge } from "@/components/ui/badge";
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
import {
  useAutomationStore,
  useAddSingleSubReddit,
  PostDataWrapper,
} from "@/store/store";
import { invoke } from "@tauri-apps/api/core";
import { getIntentColor } from "@/lib/marketing-utils";
import { toast } from "sonner";
import { openUrl } from "@tauri-apps/plugin-opener";

// Custom-styled native HTML components
interface CustomButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
}

const CustomButton = ({
  onClick,
  children,
  className = "",
  disabled = false,
  title = "",
}: CustomButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

interface KeywordBadgeProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (keyword: string) => void; // Added onClick prop
  keyword?: string; // Added keyword prop to pass to onClick
}

const KeywordBadge = ({
  children,
  className = "",
  onClick,
  keyword,
}: KeywordBadgeProps) => (
  <span
    onClick={() => onClick && keyword && onClick(keyword)}
    className={`inline-block text-[10px] py-0.5 px-1.5 rounded-full font-medium whitespace-nowrap ${className} ${onClick ? "cursor-pointer" : ""}`}
  >
    {children}
  </span>
);

type KeywordCategory = {
  keywords: string[];
  className: string;
};

// Keyword highlighter component
const HighlightedText = ({
  text,
  categories,
}: {
  text: string;
  categories: KeywordCategory[];
}) => {
  if (!text) return null;

  const allKeywords = categories
    .flatMap((c) => c.keywords)
    .filter((kw) => kw && kw.trim() !== "")
    // Sort by length (longer phrases first) to avoid partial matches
    .sort((a, b) => b.length - a.length);

  if (allKeywords.length === 0) return <>{text}</>;

  const keywordStyleMap = new Map<string, string>();
  categories.forEach((category) => {
    (category.keywords || []).forEach((kw) => {
      if (kw && kw.trim() !== "") {
        keywordStyleMap.set(kw.toLowerCase(), category.className);
      }
    });
  });

  // Create regex that matches whole phrases, sorted by length to prioritize longer matches
  const escapeRegexString = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  const escapedKeywords = allKeywords.map((kw) => escapeRegexString(kw));
  const regex = new RegExp(`(${escapedKeywords.join("|")})`, "gi");
  
  let highlightedText = text;
  const matches = [];
  let match;

  // Find all matches with their positions
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      keyword: match[0].toLowerCase(),
      start: match.index,
      end: match.index + match[0].length
    });
    regex.lastIndex = match.index + 1; // Prevent infinite loops with overlapping matches
  }

  // Sort matches by start position and then by length (longer first)
  matches.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.end - b.end; // Longer matches first
  });

  // Build highlighted text
  const parts = [];
  let lastIndex = 0;

  for (const match of matches) {
    // Add text before match
    if (match.start > lastIndex) {
      parts.push(text.slice(lastIndex, match.start));
    }
    
    // Add highlighted match
    const matchedText = text.slice(match.start, match.end);
    const className = keywordStyleMap.get(match.keyword);
    if (className) {
      parts.push(
        <mark
          key={match.start}
          className={`${className} text-current px-0.5 rounded-sm`}
        >
          {matchedText}
        </mark>
      );
    } else {
      parts.push(matchedText);
    }
    
    lastIndex = match.end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
};

export function AutomationTab() {
  const { settings, updateSettings } = useAppSettings();
  const {
    isRunning,
    intervalMinutes,
    lastRun,
    logs,
    foundPosts,
    setIsRunning,
    setIntervalMinutes,
    clearLogs,
    clearFoundPosts,
  } = useAutomationStore();

  const { addSingleSubreddit, subRedditsSaved } = useAddSingleSubReddit();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [keywordsExpanded, setKeywordsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: "timestamp";
    direction: "asc" | "desc";
  }>({
    key: "timestamp",
    direction: "desc",
  });

  const [commentsPost, setCommentsPost] = useState<PostDataWrapper | null>(
    null,
  );
  const [comments, setComments] = useState<Message[]>([]);
  const [sortTypeForComments, setSortTypeForComments] = useState("best");

  const trackedPostIds = useMemo(
    () => new Set(subRedditsSaved.map((p) => p.id)),
    [subRedditsSaved],
  );

  const keywordCategoriesForHighlighting: KeywordCategory[] = [
    { keywords: settings.brandKeywords || [], className: "bg-blue-500/30" },
    {
      keywords: settings.competitorKeywords || [],
      className: "bg-orange-500/30",
    },
    {
      keywords: settings.monitoredUsernames || [],
      className: "bg-green-500/30",
    },
    {
      keywords: settings.monitoredSubreddits || [],
      className: "bg-purple-500/30",
    },
    { keywords: settings.monitoredKeywords || [], className: "bg-gray-500/30" },
  ];

  // Function to escape special regex characters and handle multi-word keywords properly
  const escapeRegexString = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Function to check if post should be filtered out by blacklist
  const isPostBlacklisted = (post: any) => {
    const blacklistKeywords = settings.blacklistKeywords || [];
    if (blacklistKeywords.length === 0) return false;

    const textToCheck = [
      post.title || "",
      post.selftext || "",
      post.subreddit || "",
      post.author || "",
    ]
      .join(" ")
      .toLowerCase();

    const wordsToCheck = textToCheck.split(/\s+/); // Split into individual words
    
    // Check for exact keyword matches in the full text
    const exactMatch = blacklistKeywords.some((keyword) =>
      textToCheck.includes(keyword.toLowerCase()),
    );
    
    // Check for individual word matches
    const wordMatch = blacklistKeywords.some((keyword) =>
      wordsToCheck.some(word => word === keyword.toLowerCase()),
    );

    return exactMatch || wordMatch;
  };

  const filteredAndSortedPosts = useMemo(() => {
    let postsToProcess = [...foundPosts];

    // Filter out blacklisted posts
    postsToProcess = postsToProcess.filter(post => !isPostBlacklisted(post));

    if (searchQuery.trim() !== "") {
      // Check if search query matches any monitored keywords exactly
      const allMonitoringKeywords = [
        ...(settings.monitoredKeywords || []),
        ...(settings.brandKeywords || []),
        ...(settings.competitorKeywords || []),
        ...(settings.monitoredSubreddits || []),
        ...(settings.monitoredUsernames || [])
      ];
      
      const isExactKeywordMatch = allMonitoringKeywords.some(
        keyword => searchQuery.toLowerCase() === keyword.toLowerCase()
      );
      
      if (isExactKeywordMatch) {
        // For exact keyword matches, filter posts that contain this exact keyword/phrase
        postsToProcess = postsToProcess.filter(post => {
          const searchText = [
            post.title || "",
            post.selftext || "",
            post.subreddit || "",
            post.author || ""
          ].join(" ").toLowerCase();
          
          return searchText.includes(searchQuery.toLowerCase());
        });
      } else {
        // For general search, use Fuse.js
        const fuse = new Fuse(postsToProcess, {
          keys: ["title", "subreddit", "author", "selftext", "intent"],
          threshold: 0.4,
          includeScore: true,
        });
        postsToProcess = fuse.search(searchQuery).map((result) => result.item);
      }
      
      // Apply blacklist filter again to search results
      postsToProcess = postsToProcess.filter(post => !isPostBlacklisted(post));
    }

    postsToProcess.sort((a, b) => {
      const aVal = a.timestamp || 0;
      const bVal = b.timestamp || 0;
      if (aVal < bVal) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return postsToProcess;
  }, [foundPosts, sortConfig, searchQuery, settings.blacklistKeywords]);

  const handleDateSort = () => {
    setSortConfig((currentConfig) => ({
      key: "timestamp",
      direction: currentConfig.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleKeywordClick = (keyword: string) => {
    setSearchQuery(keyword);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addSubredditToMonitoring = (subreddit: string) => {
    const cleaned = subreddit.trim().toLowerCase().replace(/^r\//, "");
    if (settings.monitoredSubreddits.includes(cleaned)) {
      toast.info(`Already monitoring r/${cleaned}`);
      return;
    }

    updateSettings({
      monitoredSubreddits: [...settings.monitoredSubreddits, cleaned],
    });

    toast.success(`Now monitoring r/${cleaned}`);
  };

  const handleAddToTracking = async (post: PostDataWrapper) => {
    try {
      const isDuplicate = subRedditsSaved.some((p) => p.id === post.id);
      if (isDuplicate) {
        toast.info("Already tracking this post");
        return;
      }
      const isInserted: boolean = await invoke("save_single_reddit_command", {
        post: {
          ...post,
          timestamp: post.timestamp || Date.now(),
          formatted_date:
            post.formatted_date || new Date().toISOString().split("T")[0],
          engaged: 0,
          assignee: "",
          notes: "",
          name: post.name || `t3_${post.id}`,
          selftext: post.selftext || "",
          author: post.author || "unknown",
          score: post.score || 0,
          thumbnail: post.thumbnail || "",
          is_self: post.is_self || false,
          num_comments: post.num_comments || 0,
          intent: post.intent || "Low",
          date_added: post.date_added || 0,
        },
      });
      if (isInserted) {
        addSingleSubreddit(post);
        if (post.url && post.title && post.sort_type && post.subreddit) {
          invoke("get_post_comments_command", {
            url: post.url,
            title: post.title,
            sortType: post.sort_type,
            subreddit: post.subreddit,
          }).catch(console.error);
        }
        toast.success("Added to tracking");
      } else {
        toast.error("Failed to save to database");
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message || e}`);
    }
  };

  const handleGetComments = async (
    post: PostDataWrapper,
    sort_type: string,
  ) => {
    const fetchedComments = (await invoke("get_post_comments_command", {
      url: post.url,
      title: post.title,
      sortType: sort_type,
      subreddit: post.subreddit,
    })) as Message[];

    setComments(fetchedComments);
    setCommentsPost(post);
  };

  const handleSortTypeForCommentsChange = async (newSortType: string) => {
    setSortTypeForComments(newSortType);
    if (commentsPost) {
      const newComments = (await invoke("get_post_comments_command", {
        url: commentsPost.url,
        title: commentsPost.title,
        sortType: newSortType,
        subreddit: commentsPost.subreddit,
      })) as Message[];
      setComments(newComments);
    }
  };

  const noKeywords =
    (settings.brandKeywords?.length || 0) +
    (settings.competitorKeywords?.length || 0) +
    (settings.monitoredKeywords?.length || 0) +
    (settings.monitoredSubreddits?.length || 0) +
    (settings.blacklistKeywords?.length || 0) ===
    0;

  const keywordCategories = [
    {
      title: "Brand",
      keywords: settings.brandKeywords,
      className: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    },
    {
      title: "Competitor",
      keywords: settings.competitorKeywords,
      className: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    },
    {
      title: "General",
      keywords: settings.monitoredKeywords,
      className:
        "bg-gray-500/10 text-muted-foreground border border-gray-500/20",
    },
    {
      title: "Monitored Subreddits",
      keywords: settings.monitoredSubreddits.map((s) => `r/${s}`),
      className: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    },
    {
      title: "Blacklist",
      keywords: settings.blacklistKeywords,
      className: "bg-red-500/10 text-red-400 border border-red-500/20",
    },
  ];

  const visibleKeywords = keywordsExpanded ? Infinity : 5;

  const formatElapsedTime = (timestamp: number | undefined): string => {
    if (timestamp === undefined || timestamp === null) return "N/A";

    const timeInMilliseconds =
      timestamp < 4_100_000_000 ? timestamp * 1000 : timestamp;

    const postDate = new Date(timeInMilliseconds);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffSeconds < 60)
      return `${diffSeconds} second${diffSeconds === 1 ? "" : "s"} ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60)
      return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24)
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12)
      return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;

    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
  };

  return (
    <TooltipProvider>
      <div className="p-1 space-y-1.5 bg-background text-foreground flex-1 min-h-0 flex flex-col">
        {/* === Main Control Panel === */}
        <div className="bg-card rounded-lg border border-border/60 shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-md bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-widest text-foreground/80">
                Digital Agent
              </h2>
              <Badge
                variant="outline"
                className={`flex items-center gap-1.5 text-[9px] font-black py-0 px-2 rounded-full border-none ${isRunning ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-muted-foreground"}`}
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-gray-500"}`}
                ></div>
                {isRunning ? "ACTIVE" : "STANDBY"}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                  Interval:
                </span>
                <select
                  value={intervalMinutes.toString()}
                  onChange={(e) => setIntervalMinutes(parseInt(e.target.value))}
                  disabled={isRunning}
                  className="bg-transparent border-none text-[10px] font-bold text-primary focus:ring-0 cursor-pointer p-0 h-auto"
                >
                  <option value="5">5m</option>
                  <option value="15">15m</option>
                  <option value="30">30m</option>
                  <option value="60">1h</option>
                </select>
              </div>
              <div className="flex items-center gap-2 border-l border-border/50 pl-4">
                <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                  Last Run:
                </span>
                <span className="text-[10px] font-bold font-mono text-foreground/80">
                  {lastRun ? moment(lastRun).format("HH:mm:ss") : "--:--:--"}
                </span>
              </div>
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`flex items-center gap-2 px-4 h-7 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${isRunning ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white" : "bg-primary text-white hover:bg-primary/90 shadow-sm"}`}
              >
                {isRunning ? (
                  <>
                    <StopCircle className="h-3.5 w-3.5" /> STop Agent
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" /> Initialize
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="p-2 grid grid-cols-1 lg:grid-cols-3 gap-2">
            <div className="lg:col-span-1 rounded-lg border border-border/40 bg-background/30 flex flex-col h-[180px]">
              <div className="flex justify-between items-center px-2 py-1.5 border-b border-border/40 bg-muted/10">
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1.5">
                  <Radar className="h-3 w-3" />
                  Sensors
                </h3>
                {!noKeywords && (
                  <button
                    onClick={() => setKeywordsExpanded(!keywordsExpanded)}
                    className="text-[9px] font-black uppercase tracking-tighter opacity-40 hover:opacity-100 transition-opacity"
                  >
                    {keywordsExpanded ? "COMPRESS" : "EXPAND"}
                  </button>
                )}
              </div>
              <div className="p-2 flex-1 overflow-y-auto custom-scroll">
                {noKeywords ? (
                  <span className="text-[10px] text-muted-foreground italic opacity-50">
                    No active sensor patterns.
                  </span>
                ) : (
                  <div className="space-y-3">
                    {keywordCategories.map(
                      (category) =>
                        category.keywords.length > 0 && (
                          <div key={category.title}>
                            <h4 className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/40 mb-1 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-current opacity-30"></span>
                              {category.title}
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {category.keywords
                                .slice(0, visibleKeywords)
                                .map((k) => (
                                  <KeywordBadge
                                    key={k}
                                    className={`${category.className} text-[9px] font-bold px-1.5 py-0 rounded transition-all hover:scale-105`}
                                    onClick={handleKeywordClick}
                                    keyword={k}
                                  >
                                    {k}
                                  </KeywordBadge>
                                ))}
                              {category.keywords.length > visibleKeywords && (
                                <span className="text-[9px] font-bold text-muted-foreground/40 p-0.5">
                                  +{category.keywords.length - visibleKeywords}
                                </span>
                              )}
                            </div>
                          </div>
                        ),
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-2 rounded-lg border border-border/40 bg-background/30 flex flex-col h-[180px]">
              <div className="px-2 py-1.5 border-b border-border/40 bg-muted/10 flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1.5">
                  <Activity className="h-3 w-3" />
                  Data Feed
                </h3>
                <button
                  onClick={clearLogs}
                  disabled={logs.length === 0}
                  className="text-[9px] font-black uppercase tracking-tighter opacity-40 hover:opacity-100 disabled:opacity-10"
                >
                  FLUSH
                </button>
              </div>
              <div
                ref={scrollRef}
                className="p-2 flex-1 overflow-y-auto custom-scroll text-[10px] font-mono space-y-1 bg-black/5"
              >
                {logs.length === 0 ? (
                  <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] opacity-10 pt-16">
                    AWAITING TELEMETRY
                  </div>
                ) : (
                  [...logs].reverse().map((log) => (
                    <div
                      key={log.id}
                      className="flex gap-2 items-start opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <span className="text-muted-foreground/40 shrink-0">
                        [{moment(log.timestamp).format("HH:mm:ss")}]
                      </span>
                      <span
                        className={`flex-1 leading-relaxed ${log.type === "error" ? "text-red-500 font-bold" : log.type === "success" ? "text-green-500" : log.type === "warning" ? "text-yellow-500" : "text-foreground/70"}`}
                      >
                        <span className="opacity-40 mr-1">{">"}</span>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* === Results Table === */}
        <div className="bg-card rounded-lg border border-border/60 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex justify-between items-center bg-muted/10">
            <div className="flex items-center gap-4">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-foreground/80">
                Processed Results: {filteredAndSortedPosts.length}
              </h2>
              <div className="relative w-48 group">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Filter signals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background/50 border border-border/40 rounded px-7 h-7 text-[10px] w-full focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all font-medium"
                />
              </div>
            </div>
            <button
              onClick={clearFoundPosts}
              disabled={foundPosts.length === 0}
              className="px-3 h-7 text-[10px] font-bold uppercase tracking-widest border border-destructive/20 text-destructive/60 hover:bg-destructive hover:text-white transition-all rounded-md flex items-center gap-2"
            >
              <Trash2 className="h-3 w-3" />
              Reset Feed
            </button>
          </div>
          <div className="p-0 flex-1 min-h-0 relative overflow-hidden rounded-none flex flex-col">
            {foundPosts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground flex flex-col items-center justify-center h-full">
                <Bot className="h-8 w-8 mx-auto mb-1 opacity-20" />
                <p className="font-semibold text-sm">No findings yet</p>
                <p className="text-xs">
                  Start the agent to search for relevant threads.
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 flex flex-col custom-scroll border rounded-none">
                <table className="w-full text-xs text-left table-fixed rounded-none">
                  <thead className="sticky top-0 bg-card/95 backdrop-blur-sm">
                    <tr className="border-b font-bold">
                      {["Intent", "Title", "Subreddit"].map((h) => (
                        <th
                          key={h}
                          className={`p-1.5 font-bold text-xs  text-muted-foreground ${h === "Subreddit" ? "w-36" : h === "Intent" ? "w-20" : h === "Title" ? "w-[60%]" : ""}`}
                        >
                          {h}
                        </th>
                      ))}
                      <th
                        className="p-1.5 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground w-32"
                        onClick={handleDateSort}
                      >
                        <div className="flex items-center gap-1 font-bold">
                          Date
                          {sortConfig.direction === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedPosts.map((post) => (
                      <tr key={post.id} className="border-b hover:bg-muted/50">
                        <td className="px-1 w-20">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`w-fit text-[9px] py-0 px-1 rounded-full font-bold ${getIntentColor(post.intent?.toLowerCase() || "low")}`}
                            >
                              {post.intent}
                            </span>
                            {post.category && post.category !== "general" && (
                              <span className="w-fit text-[9px] py-0 px-1 rounded-full bg-secondary text-secondary-foreground">
                                {post.category}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-1.5 font-medium w-full overflow-hidden">
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  post.url && openUrl(post.url);
                                }}
                                className="hover:underline inline-block truncate"
                              >
                                {post.title}
                                {trackedPostIds.has(post.id) && (
                                  <KeywordBadge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-2">
                                    Tracking
                                  </KeywordBadge>
                                )}
                              </a>
                            </TooltipTrigger>
                            <TooltipContent
                              className="max-w-md p-3 bg-stone-50 border shadow"
                              side="bottom"
                              align="start"
                            >
                              <div className="text-sm font-semibold text-black ">
                                <HighlightedText
                                  text={post.title}
                                  categories={keywordCategoriesForHighlighting}
                                />
                              </div>
                              {post.selftext && (
                                <div className="mt-2 border-t border-border pt-2">
                                  <p className="text-sm text-foreground/80 whitespace-pre-wrap max-h-48 overflow-y-auto custom-scroll">
                                    <HighlightedText
                                      text={post.selftext}
                                      categories={
                                        keywordCategoriesForHighlighting
                                      }
                                    />
                                  </p>
                                </div>
                              )}
                              <div className="mt-2 border-t border-border pt-2 flex justify-between items-center text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>u/{post.author || "unknown"}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Radar className="h-3 w-3" />
                                  <span>r/{post.subreddit}</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="p-1.5 text-muted-foreground text-xs w-36">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <span className="inline-block border px-2 rounded-sm  cursor-pointer hover:bg-gray-100 hover:text-black">
                                r/{post.subreddit}
                              </span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                className="text-xs"
                                onClick={() =>
                                  addSubredditToMonitoring(post.subreddit)
                                }
                              >
                                <Radar className="h-4 w-4" />
                                Monitor r/{post.subreddit}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="p-1.5 text-muted-foreground text-xs w-32 whitespace-nowrap">
                          {formatElapsedTime(post.timestamp)}
                        </td>
                        <td className="p-1.5 text-right w-12">
                          <div className="flex items-center justify-end gap-1">
                            <CustomButton
                              onClick={() =>
                                handleGetComments(post, post.sort_type)
                              }
                              title="View Comments"
                              className="h-6 w-6 p-0 justify-center hover:bg-blue-500 hover:text-white text-muted-foreground"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </CustomButton>
                            <CustomButton
                              onClick={() => handleAddToTracking(post)}
                              title="Add to Tracking"
                              className="h-6 w-6 p-0 justify-center hover:bg-primary hover:text-primary-foreground text-muted-foreground"
                            >
                              <Plus className="h-4 w-4" />
                            </CustomButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <RedditCommentsView
        isOpen={commentsPost !== null}
        onOpenChange={(open) => !open && setCommentsPost(null)}
        post={commentsPost}
        comments={comments}
        sortType={sortTypeForComments}
        onSortTypeChange={handleSortTypeForCommentsChange}
      />
    </TooltipProvider>
  );
}
