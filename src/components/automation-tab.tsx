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
    Activity,
    AlertCircle,
    CheckCircle2,
    Plus,
    Trash2,
    Bot,
} from "lucide-react";
import { useAppSettings } from "./app-settings";
import { useAutomationStore, useAddSingleSubReddit, PostDataWrapper } from "@/store/store";
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
                }
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

    const noKeywords = settings.brandKeywords.length + settings.competitorKeywords.length + settings.monitoredKeywords.length === 0;

    return (
        <div className="p-4 space-y-4">
            {/* Control Panel Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Bot className="h-6 w-6 text-primary" />
                                Automation Agent
                            </CardTitle>
                            <CardDescription>Configure, run, and monitor background keyword searches.</CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={isRunning ? "default" : "outline"} className={isRunning ? "bg-green-100 text-green-800 border-green-300" : ""}>
                                <div className={`h-2 w-2 rounded-full mr-2 ${isRunning ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                {isRunning ? "RUNNING" : "STOPPED"}
                            </Badge>
                            <Button
                                className="w-[110px]"
                                variant={isRunning ? "destructive" : "default"}
                                onClick={() => setIsRunning(!isRunning)}
                            >
                                {isRunning ? <><StopCircle className="mr-2 h-4 w-4" /> Stop</> : <><Play className="mr-2 h-4 w-4" /> Start</>}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Config */}
                        <div className="space-y-3 rounded-lg border p-3">
                            <div className="flex items-center justify-between text-sm">
                                <label className="font-medium text-muted-foreground">Check Interval</label>
                                <Select
                                    value={intervalMinutes.toString()}
                                    onValueChange={(v) => setIntervalMinutes(parseInt(v))}
                                    disabled={isRunning}
                                >
                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                        <SelectValue placeholder="Select interval" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5 minutes</SelectItem>
                                        <SelectItem value="15">15 minutes</SelectItem>
                                        <SelectItem value="30">30 minutes</SelectItem>
                                        <SelectItem value="60">1 hour</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-muted-foreground">Last Run</span>
                                <span className="font-semibold">
                                    {lastRun ? new Date(lastRun).toLocaleTimeString() : 'N/A'}
                                </span>
                            </div>
                        </div>

                        {/* Keywords */}
                        <div className="lg:col-span-2 rounded-lg border p-3">
                            <p className="text-sm font-medium mb-2">Active Keywords</p>
                            <ScrollArea className="h-16">
                                <div className="flex flex-wrap gap-1">
                                    {noKeywords ? (
                                        <span className="text-xs text-muted-foreground italic p-1">No keywords configured in Settings.</span>
                                    ) : (
                                        <>
                                            {settings.brandKeywords.map(k => <Badge key={k} variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">{k}</Badge>)}
                                            {settings.competitorKeywords.map(k => <Badge key={k} variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">{k}</Badge>)}
                                            {settings.monitoredKeywords.map(k => <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>)}
                                        </>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                
                    {/* Activity Log */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Activity Log
                            </h3>
                            <Button variant="ghost" size="sm" onClick={clearLogs} className="h-7 text-xs" disabled={logs.length === 0}>Clear</Button>
                        </div>
                        <ScrollArea className="h-[180px] w-full rounded-md border bg-gray-50/50 dark:bg-black/20 p-3" ref={scrollRef}>
                            <div className="space-y-1">
                                {logs.length === 0 ? (
                                    <div className="text-center text-sm text-muted-foreground py-10">No logs yet. Start automation to see activity.</div>
                                ) : (
                                    logs.map((log) => (
                                        <div key={log.id} className="text-xs flex gap-2 font-mono items-start">
                                            <span className="text-muted-foreground mt-px">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                            <div className="flex-shrink-0 mt-0.5">
                                                {log.type === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
                                                {log.type === 'success' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                            </div>
                                            <span className={`flex-1 ${
                                                log.type === 'error' ? 'text-red-500' :
                                                log.type === 'success' ? 'text-green-600' :
                                                log.type === 'warning' ? 'text-yellow-600' : ''
                                            }`}>
                                                {log.message}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Automated Findings ({foundPosts.length})</CardTitle>
                            <CardDescription>Relevant posts found by the background agent. Add them to your main tracking table.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={clearFoundPosts} disabled={foundPosts.length === 0}>
                            <Trash2 className="h-4 w-4 mr-2" /> Clear Results
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px]">
                        {foundPosts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground flex flex-col items-center justify-center h-[200px]">
                                <Bot className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                <p className="font-semibold">No findings yet</p>
                                <p className="text-sm">Start the automation agent to search for relevant threads.</p>
                            </div>
                        ) : (
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[120px]">Intent</TableHead>
                                            <TableHead>Title</TableHead>
                                            <TableHead className="w-[180px]">Subreddit</TableHead>
                                            <TableHead className="w-[120px]">Date</TableHead>
                                            <TableHead className="text-right w-[80px]">Actions</TableHead>
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
                                                        onClick={(e) => { e.preventDefault(); post.url && openUrl(post.url); }}
                                                        className="hover:underline block truncate"
                                                        title={post.title}
                                                    >
                                                        {post.title}
                                                    </a>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">r/{post.subreddit}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{post.formatted_date}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleAddToTracking(post)} title="Add to Tracking">
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
