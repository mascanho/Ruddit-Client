"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  StopCircle,
  Activity,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Bot,
} from "lucide-react";
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

export function AutomationTab() {
  const { settings } = useAppSettings();
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
  // Automation logic is handled by AutomationRunner.tsx

  // Auto-scroll logs
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

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

  return (
    <div className="p-2 space-y-2">
      <Card className="px-1 py-0">
        <CardHeader className="px-3 py-0 my-0 border-b">
          <div className="flex items-center justify-between -mb-6 ">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg py-0">Automation Agent</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs border-r pr-3">
                <label className="font-medium text-muted-foreground">
                  Interval
                </label>
                <Select
                  value={intervalMinutes.toString()}
                  onValueChange={(v) => setIntervalMinutes(parseInt(v))}
                  disabled={isRunning}
                >
                  <SelectTrigger className="w-[120px] h-6 text-xs">
                    <SelectValue placeholder="Interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 text-xs border-r pr-3">
                <span className="font-medium text-muted-foreground">
                  Last Run
                </span>
                <span className="font-semibold">
                  {lastRun ? new Date(lastRun).toLocaleTimeString() : "N/A"}
                </span>
              </div>
              <Button
                className="w-[90px] h-7 text-sm"
                variant={isRunning ? "destructive" : "default"}
                onClick={() => setIsRunning(!isRunning)}
              >
                {isRunning ? (
                  <>
                    <StopCircle className="mr-1 h-4 w-4" /> Stop
                  </>
                ) : (
                  <>
                    <Play className="mr-1 h-4 w-4" /> Start
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 py-0 -mt-2 h-64 mb-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-1 space-y-2">
              <div>
                <h3 className="text-sm font-semibold mb-1">Status</h3>
                <Badge
                  variant={isRunning ? "default" : "outline"}
                  className={
                    isRunning
                      ? "bg-green-100 text-green-800 border-green-300 py-0.5 px-2 text-xs"
                      : "py-0.5 px-2 text-xs"
                  }
                >
                  <div
                    className={`h-2 w-2 rounded-full mr-1 ${isRunning ? "bg-green-500" : "bg-gray-400"}`}
                  ></div>
                  {isRunning ? "RUNNING" : "STOPPED"}
                </Badge>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-sm font-medium mb-1">Active Keywords</p>
                <ScrollArea className="h-28">
                  <div className="flex flex-wrap gap-0.5">
                    {noKeywords ? (
                      <span className="text-[10px] text-muted-foreground italic p-0.5">
                        No keywords configured in Settings.
                      </span>
                    ) : (
                      <>
                        {settings.brandKeywords.map((k) => (
                          <Badge
                            key={k}
                            variant="outline"
                            className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 py-0 px-1"
                          >
                            {k}
                          </Badge>
                        ))}
                        {settings.competitorKeywords.map((k) => (
                          <Badge
                            key={k}
                            variant="outline"
                            className="text-[9px] bg-orange-50 text-orange-700 border-orange-200 py-0 px-1"
                          >
                            {k}
                          </Badge>
                        ))}
                        {settings.monitoredKeywords.map((k) => (
                          <Badge
                            key={k}
                            variant="outline"
                            className="text-[9px] py-0 px-1"
                          >
                            {k}
                          </Badge>
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-semibold flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  Activity Log
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLogs}
                  className="h-6 text-xs"
                  disabled={logs.length === 0}
                >
                  Clear
                </Button>
              </div>
              <ScrollArea
                className="h-[220px] w-full rounded-md border bg-gray-50/50 dark:bg-black/20 p-2"
                ref={scrollRef}
              >
                <div className="space-y-0.5">
                  {logs.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground py-6">
                      No logs yet. Start automation to see activity.
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className="text-[10px] flex gap-1 font-mono items-start"
                      >
                        <span className="text-muted-foreground mt-px">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="flex-shrink-0 mt-0.5">
                          {log.type === "error" && (
                            <AlertCircle className="h-3 w-3 text-red-500" />
                          )}
                          {log.type === "success" && (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                        <span
                          className={`flex-1 ${
                            log.type === "error"
                              ? "text-red-500"
                              : log.type === "success"
                                ? "text-green-600"
                                : log.type === "warning"
                                  ? "text-yellow-600"
                                  : ""
                          }`}
                        >
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="px-3">
        <CardHeader className="px-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">
                Automated Findings ({foundPosts.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Relevant posts found by the background agent. Add them to your
                main tracking table.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFoundPosts}
              disabled={foundPosts.length === 0}
              className="h-7 text-sm"
            >
              <Trash2 className="h-3 w-3 mr-1" /> Clear Results
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <ScrollArea className="h-[300px]">
            {foundPosts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground flex flex-col items-center justify-center h-[180px]">
                <Bot className="h-8 w-8 mx-auto mb-1 opacity-20" />
                <p className="font-semibold text-sm">No findings yet</p>
                <p className="text-xs">
                  Start the automation agent to search for relevant threads.
                </p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-2 h-auto text-xs">
                        Intent
                      </TableHead>
                      <TableHead className="py-2 h-auto text-xs">
                        Title
                      </TableHead>
                      <TableHead className="py-2 h-auto text-xs">
                        Subreddit
                      </TableHead>
                      <TableHead className="py-2 h-auto text-xs">
                        Date
                      </TableHead>
                      <TableHead className="text-right py-2 h-auto text-xs">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {foundPosts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="py-1">
                          <div className="flex flex-col gap-0.5">
                            <Badge
                              variant="secondary"
                              className={`w-fit text-[9px] ${getIntentColor(post.intent ? post.intent.toLowerCase() : "low")} py-0 px-1`}
                            >
                              {post.intent}
                            </Badge>
                            {post.category && post.category !== "general" && (
                              <Badge
                                variant="outline"
                                className="w-fit text-[9px] py-0 px-1"
                              >
                                {post.category}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium max-w-[300px] text-xs py-1">
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              post.url && openUrl(post.url);
                            }}
                            className="hover:underline block truncate"
                            title={post.title}
                          >
                            {post.title}
                          </a>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs py-1">
                          r/{post.subreddit}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs py-1">
                          {post.formatted_date}
                        </TableCell>
                        <TableCell className="text-right py-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleAddToTracking(post)}
                            title="Add to Tracking"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
