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
import { Separator } from "@/components/ui/separator";
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
    Clock,
    Activity,
    AlertCircle,
    CheckCircle2,
    ExternalLink,
    Plus,
    Trash2,
    Bot,
} from "lucide-react";
import { useAppSettings } from "./app-settings";
import { useAutomationStore, useAddSingleSubReddit, PostDataWrapper } from "@/store/store";
import { invoke } from "@tauri-apps/api/core";
import { calculateIntent, categorizePost, getIntentColor } from "@/lib/marketing-utils";
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
        setLastRun,
        addLog,
        addFoundPosts,
        clearLogs,
        clearFoundPosts,
    } = useAutomationStore();

    const { addSingleSubreddit, subRedditsSaved } = useAddSingleSubReddit();
    // Automation logic is handled by AutomationRunner.tsx
    // This component now only displays control and logs.

    // Auto-scroll logs
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);


    const handleAddToTracking = async (post: PostDataWrapper) => {
        try {
            // Double check duplication against main table
            const isDuplicate = subRedditsSaved.some(p => p.id === post.id);
            if (isDuplicate) {
                toast.info("Already tracking this post");
                return;
            }

            const isInserted: boolean = await invoke("save_single_reddit_command", {
                post: {
                    ...post,
                    timestamp: post.timestamp || Date.now(),
                    formatted_date: post.formatted_date || new Date().toISOString().split("T")[0],
                    // Ensure defaults
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
                    intent: post.intent || "Low"
                }
            });

            if (isInserted) {
                addSingleSubreddit(post);
                // Attempt to fetch comments in background
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

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                {/* Controls Card */}
                <Card className="col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Automation Control
                        </CardTitle>
                        <CardDescription>Configure background monitoring</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Badge variant={isRunning ? "default" : "secondary"} className={isRunning ? "bg-green-600" : ""}>
                                {isRunning ? "RUNNING" : "STOPPED"}
                            </Badge>
                            {lastRun && (
                                <span className="text-xs text-muted-foreground">
                                    Last run: {new Date(lastRun).toLocaleTimeString()}
                                </span>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Check Interval (minutes)</label>
                            <Select
                                value={intervalMinutes.toString()}
                                onValueChange={(v) => setIntervalMinutes(parseInt(v))}
                                disabled={isRunning}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select interval" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">Every 5 minutes</SelectItem>
                                    <SelectItem value="15">Every 15 minutes</SelectItem>
                                    <SelectItem value="30">Every 30 minutes</SelectItem>
                                    <SelectItem value="60">Every hour</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                className="w-full"
                                variant={isRunning ? "destructive" : "default"}
                                onClick={() => setIsRunning(!isRunning)}
                            >
                                {isRunning ? (
                                    <>
                                        <StopCircle className="mr-2 h-4 w-4" /> Stop
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4" /> Start
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="pt-2">
                            <p className="text-xs text-muted-foreground mb-1">Active Keywords:</p>
                            <div className="flex flex-wrap gap-1">
                                {settings.brandKeywords.map(k => <Badge key={k} variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">{k}</Badge>)}
                                {settings.competitorKeywords.map(k => <Badge key={k} variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">{k}</Badge>)}
                                {settings.monitoredKeywords.map(k => <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>)}
                                {(settings.brandKeywords.length + settings.competitorKeywords.length + settings.monitoredKeywords.length === 0) &&
                                    <span className="text-xs text-muted-foreground italic">No keywords configured in Settings.</span>
                                }
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {/* Logs Card */}
                <Card className="col-span-2 flex flex-col max-h-[350px]">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Bot className="h-5 w-5 text-primary" />
                                Activity Log
                            </CardTitle>
                            <Button variant="ghost" size="sm" onClick={clearLogs} className="h-6 text-xs">Clear</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 overflow-hidden pt-0">
                        <ScrollArea className="h-[250px] w-full rounded-md border p-4" ref={scrollRef}>
                            <div className="space-y-1">
                                {logs.length === 0 && <span className="text-sm text-muted-foreground italic">No logs yet. start automation to see activity.</span>}
                                {logs.map((log) => (
                                    <div key={log.id} className="text-xs flex gap-2">
                                        <span className="text-muted-foreground min-w-[60px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        <span className={
                                            log.type === 'error' ? 'text-red-500 font-medium' :
                                                log.type === 'success' ? 'text-green-600 font-medium' :
                                                    log.type === 'warning' ? 'text-yellow-600' :
                                                        'text-foreground'
                                        }>
                                            {log.message}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Results Table */}
            <Card className="flex flex-col flex-1 min-h-0">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Automated Findings</CardTitle>
                            <CardDescription>Relevant posts found by the background agent</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={clearFoundPosts} disabled={foundPosts.length === 0}>
                            <Trash2 className="h-4 w-4 mr-2" /> Clear Results
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <ScrollArea className="h-[calc(100vh-500px)] min-h-[300px]">
                        {foundPosts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Bot className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                <p>No findings yet. Start the automation to search for relevant threads.</p>
                            </div>
                        ) : (
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Intent</TableHead>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Subreddit</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {foundPosts.map((post) => (
                                            <TableRow key={post.id}>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <Badge variant="secondary" className={`w-fit text-[10px] ${getIntentColor(post.intent ? post.intent.toLowerCase() : "low")}`}>
                                                            {post.intent}
                                                        </Badge>
                                                        {post.category && post.category !== 'general' && (
                                                            <Badge variant="outline" className="w-fit text-[10px]">
                                                                {post.category}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium max-w-[400px]">
                                                    <a
                                                        href="#"
                                                        onClick={(e) => { e.preventDefault(); openUrl(post.url); }}
                                                        className="hover:underline block truncate"
                                                        title={post.title}
                                                    >
                                                        {post.title}
                                                    </a>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">r/{post.subreddit}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{post.formatted_date}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleAddToTracking(post)} title="Add to Tracking">
                                                        <Plus className="h-4 w-4" />
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
