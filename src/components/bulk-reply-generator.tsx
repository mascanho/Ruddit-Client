"use client";

import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

export interface PostData {
    id: number;
    title: string;
    selftext?: string | null;
    subreddit?: string;
    intent?: string;
}

interface BulkReplyGeneratorProps {
    posts: PostData[];
    onRepliesGenerated?: (replies: Map<number, string>) => void;
    trigger?: React.ReactNode;
    className?: string;
}

export function BulkReplyGenerator({
    posts,
    onRepliesGenerated,
    trigger,
    className = "",
}: BulkReplyGeneratorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [generatedReplies, setGeneratedReplies] = useState<Map<number, string>>(
        new Map()
    );
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentlyProcessing, setCurrentlyProcessing] = useState<string>("");

    const handleBulkGenerate = async () => {
        if (posts.length === 0) {
            toast.error("No posts to generate replies for");
            return;
        }

        setIsGenerating(true);
        setProgress(0);
        const newReplies = new Map<number, string>();
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            setCurrentlyProcessing(post.title);
            setProgress(((i + 1) / posts.length) * 100);

            try {
                const reply = await invoke<string>("generate_reply_command", {
                    postTitle: post.title,
                    postBody: post.selftext || "",
                });
                newReplies.set(post.id, reply);
                successCount++;
            } catch (e: any) {
                console.error(`Failed to generate reply for post ${post.id}:`, e);
                failCount++;
            }

            // Small delay to avoid rate limiting
            if (i < posts.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        }

        setGeneratedReplies(newReplies);
        setIsGenerating(false);
        setCurrentlyProcessing("");
        setProgress(100);

        if (successCount > 0) {
            toast.success(`Generated ${successCount} replies`);
            onRepliesGenerated?.(newReplies);
        }
        if (failCount > 0) {
            toast.error(`Failed to generate ${failCount} replies`);
        }
    };

    const updateReply = (postId: number, newReply: string) => {
        const updated = new Map(generatedReplies);
        updated.set(postId, newReply);
        setGeneratedReplies(updated);
        onRepliesGenerated?.(updated);
    };

    const defaultTrigger = (
        <Button
            onClick={() => setIsOpen(true)}
            className={className}
            disabled={posts.length === 0}
        >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Replies ({posts.length})
        </Button>
    );

    return (
        <>
            {trigger ? (
                <div onClick={() => setIsOpen(true)}>{trigger}</div>
            ) : (
                defaultTrigger
            )}

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col !z-[10000]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Bulk AI Reply Generation
                        </DialogTitle>
                        <DialogDescription>
                            Generate AI-powered replies for {posts.length} selected posts.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col gap-4">
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleBulkGenerate}
                                disabled={isGenerating || posts.length === 0}
                                className="flex items-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        Generate All Replies
                                    </>
                                )}
                            </Button>

                            {generatedReplies.size > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    {generatedReplies.size} / {posts.length} generated
                                </span>
                            )}
                        </div>

                        {/* Progress Bar */}
                        {isGenerating && (
                            <div className="space-y-2">
                                <Progress value={progress} className="h-2" />
                                <p className="text-xs text-muted-foreground truncate">
                                    Processing: {currentlyProcessing}
                                </p>
                            </div>
                        )}

                        {/* Generated Replies List */}
                        <div className="flex-1 overflow-y-auto custom-scroll border rounded-md">
                            {posts.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    No posts selected.
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {posts.map((post) => {
                                        const hasReply = generatedReplies.has(post.id);
                                        return (
                                            <div
                                                key={post.id}
                                                className="p-4 space-y-3 hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {post.subreddit && (
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    r/{post.subreddit}
                                                                </span>
                                                            )}
                                                            {post.intent && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                                                    {post.intent}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="text-sm font-medium line-clamp-2">
                                                            {post.title}
                                                        </h4>
                                                    </div>
                                                    {hasReply && (
                                                        <div className="flex items-center gap-1 text-green-500">
                                                            <Sparkles className="h-4 w-4" />
                                                            <span className="text-xs font-medium">
                                                                Generated
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {hasReply && (
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                            AI Generated Reply
                                                        </label>
                                                        <Textarea
                                                            value={generatedReplies.get(post.id) || ""}
                                                            onChange={(e) =>
                                                                updateReply(post.id, e.target.value)
                                                            }
                                                            rows={4}
                                                            className="text-sm bg-background"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setGeneratedReplies(new Map());
                                setProgress(0);
                            }}
                            disabled={generatedReplies.size === 0 || isGenerating}
                        >
                            Clear All Replies
                        </Button>
                        <Button
                            onClick={() => {
                                toast.info("Publishing feature coming soon");
                                // TODO: Implement bulk publish to Reddit
                            }}
                            disabled={generatedReplies.size === 0 || isGenerating}
                        >
                            Publish All ({generatedReplies.size})
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
