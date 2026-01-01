"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppSettings } from "./app-settings";
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
const CustomButton = ({
  onClick,
  children,
  className = "",
  disabled = false,
  title = "",
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

const KeywordBadge = ({ children, className = "" }) => (
  <span
    className={`inline-block text-[10px] py-0.5 px-1.5 rounded-full font-medium whitespace-nowrap ${className}`}
  >
    {children}
  </span>
);

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

  const noKeywords =
    settings.brandKeywords.length +
      settings.competitorKeywords.length +
      settings.monitoredKeywords.length ===
    0;
    
  const keywordCategories = [
    { title: 'Brand', keywords: settings.brandKeywords, className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
    { title: 'Competitor', keywords: settings.competitorKeywords, className: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
    { title: 'General', keywords: settings.monitoredKeywords, className: 'bg-gray-500/10 text-muted-foreground border border-gray-500/20' },
  ];

  const visibleKeywords = keywordsExpanded ? Infinity : 5;

  const formatElapsedTime = (timestamp: number | undefined): string => {
    if (timestamp === undefined || timestamp === null) return 'N/A';

    // Heuristic: if timestamp is less than ~2100-01-01 in seconds, assume it's in seconds
    // Otherwise, assume it's already in milliseconds
    const timeInMilliseconds = timestamp < 4_100_000_000 ? timestamp * 1000 : timestamp;

    const postDate = new Date(timeInMilliseconds);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds} second${diffSeconds === 1 ? '' : 's'} ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`; // Roughly a month

    const diffMonths = Math.floor(diffDays / 30); // Approximate months
    if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;

    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
  };

  return (
    <div className="p-2 space-y-2 bg-background text-foreground h-full flex flex-col">
      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 5px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: hsl(var(--accent-foreground)); }
      `}</style>

      {/* === Main Control Panel === */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-2 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Super Automation Agent</h2>
            <span className={`flex items-center gap-1.5 text-xs font-bold py-0.5 px-2 rounded-full ${isRunning ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-muted-foreground"}`}>
              <div className={`h-2 w-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              {isRunning ? "RUNNING" : "STOPPED"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <label className="font-medium text-muted-foreground">Interval</label>
              <select value={intervalMinutes.toString()} onChange={(e) => setIntervalMinutes(parseInt(e.target.value))} disabled={isRunning} className="bg-background border border-input rounded-md text-xs h-6 pl-1 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="5">5 min</option><option value="15">15 min</option><option value="30">30 min</option><option value="60">1 hour</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-muted-foreground">Last Run:</span>
              <span className="font-semibold text-foreground">{lastRun ? new Date(lastRun).toLocaleTimeString() : 'N/A'}</span>
            </div>
            <CustomButton onClick={() => setIsRunning(!isRunning)} className={`w-24 h-7 text-sm ${isRunning ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
              {isRunning ? <><StopCircle className="mr-1 h-4 w-4" /> Stop</> : <><Play className="mr-1 h-4 w-4" /> Start</>}
            </CustomButton>
          </div>
        </div>
        <div className="p-2 grid grid-cols-1 lg:grid-cols-3 gap-2">
          <div className="lg:col-span-1 rounded-lg border flex flex-col">
            <div className="flex justify-between items-center p-1.5 border-b">
                <h3 className="text-sm font-semibold">Active Keywords</h3>
                {!noKeywords && (
                    <CustomButton onClick={() => setKeywordsExpanded(!keywordsExpanded)} className="h-5 text-xs px-1.5 bg-secondary hover:bg-muted">
                        {keywordsExpanded ? 'Show Less' : 'Show All'}
                    </CustomButton>
                )}
            </div>
            <div className="p-1.5 flex-1 overflow-y-auto custom-scroll">
              {noKeywords ? (
                <span className="text-xs text-muted-foreground italic p-2">No keywords in settings.</span>
              ) : (
                <div className="space-y-2">
                    {keywordCategories.map(category => category.keywords.length > 0 && (
                        <div key={category.title}>
                            <h4 className="text-xs font-bold text-muted-foreground mb-1">{category.title}</h4>
                            <div className="flex flex-wrap gap-1">
                                {category.keywords.slice(0, visibleKeywords).map(k => (
                                    <KeywordBadge key={k} className={category.className}>{k}</KeywordBadge>
                                ))}
                                {category.keywords.length > visibleKeywords && (
                                    <span className="text-xs text-muted-foreground p-1">+{category.keywords.length - visibleKeywords} more</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-2 rounded-lg border flex flex-col h-[210px]">
            <div className="p-1.5 border-b flex justify-between items-center">
              <h3 className="text-sm font-semibold flex items-center gap-1"><Activity className="h-4 w-4" />Activity Log</h3>
              <CustomButton onClick={clearLogs} disabled={logs.length === 0} className="h-5 text-xs px-1.5 bg-secondary hover:bg-muted">Clear</CustomButton>
            </div>
            <div ref={scrollRef} className="p-1.5 flex-1 overflow-y-scroll custom-scroll text-[11px] font-mono space-y-1">
              {logs.length === 0 ? <div className="text-center text-xs text-muted-foreground pt-10">Awaiting automation start...</div> : logs.map((log) => (<div key={log.id} className="flex gap-1.5 items-start"><span className="text-muted-foreground/60 mt-px">{new Date(log.timestamp).toLocaleTimeString()}</span><span className={`flex-1 ${log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-green-500' : log.type === 'warning' ? 'text-yellow-500' : 'text-foreground/80'}`}>{log.message}</span></div>))}
            </div>
          </div>
        </div>
      </div>

      {/* === Results Table === */}
      <div className="bg-card rounded-lg border border-border shadow-sm flex-1 flex flex-col min-h-0">
        <div className="p-2 border-b border-border flex justify-between items-center">
          <div><h2 className="text-base font-semibold">Automated Findings ({foundPosts.length})</h2><p className="text-xs text-muted-foreground">Relevant posts found by the agent. Add them to your main tracking table.</p></div>
          <CustomButton onClick={clearFoundPosts} disabled={foundPosts.length === 0} className="h-7 text-xs px-2 bg-secondary hover:bg-muted text-secondary-foreground"><Trash2 className="h-3 w-3 mr-1" />Clear Results</CustomButton>
        </div>
        <div className="p-2 flex-1 min-h-0">
          {foundPosts.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground flex flex-col items-center justify-center h-full"><Bot className="h-8 w-8 mx-auto mb-1 opacity-20" /><p className="font-semibold text-sm">No findings yet</p><p className="text-xs">Start the agent to search for relevant threads.</p></div>
          ) : (
            <div className="overflow-y-scroll h-[calc(100vh-50vh)] custom-scroll border rounded-md">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-card/95 backdrop-blur-sm"><tr className="border-b">{["Intent", "Title", "Subreddit", "Date", ""].map(h => <th key={h} className={`p-1.5 text-xs font-medium text-muted-foreground ${h === "Date" ? "w-32" : ""}`}>{h}</th>)}</tr></thead>
                <tbody>
                  {foundPosts.map((post) => (
                    <tr key={post.id} className="border-b hover:bg-muted/50">
                      <td className="px-1 w-28"><div className="flex flex-col gap-0.5"><span className={`w-fit text-[9px] py-0 px-1 rounded-full font-bold ${getIntentColor(post.intent?.toLowerCase() || "low")}`}>{post.intent}</span>{post.category && post.category !== "general" && (<span className="w-fit text-[9px] py-0 px-1 rounded-full bg-secondary text-secondary-foreground">{post.category}</span>)}</div></td>
                                            <td className="p-1.5 font-medium max-w-xs">
                                              <a
                                                href="#"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  post.url && openUrl(post.url);
                                                }}
                                                className="hover:underline block truncate"
                                                title={post.selftext ? `${post.title}: ${post.selftext}` : post.title}
                                              >
                                                {post.title}
                                              </a>
                                            </td>
                      <td className="p-1.5 text-muted-foreground text-xs w-36">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <span
                                  className="inline-block cursor-pointer hover:underline" // Styled as badge-like
                                >
                                    r/{post.subreddit}
                                </span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => addSubredditToMonitoring(post.subreddit)}>
                                    <Radar className="h-4 w-4 mr-2" />
                                    Add to Monitoring
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="p-1.5 text-muted-foreground text-xs w-32 whitespace-nowrap">{formatElapsedTime(post.timestamp)}</td>
                      <td className="p-1.5 text-right w-12"><CustomButton onClick={() => handleAddToTracking(post)} title="Add to Tracking" className="h-6 w-6 p-0 justify-center hover:bg-primary hover:text-primary-foreground text-muted-foreground"><Plus className="h-4 w-4" /></CustomButton></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
