"use client";

import { useState, useMemo, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Reply, Send, Loader2 } from "lucide-react";
import moment from "moment";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "./smart-data-tables";

interface CommentTree extends Message {
    children: CommentTree[];
}

function buildCommentTree(flatComments: Message[]): CommentTree[] {
    const map = new Map<string, CommentTree>();
    const roots: CommentTree[] = [];

    // Initialize map and create CommentTree objects
    flatComments.forEach((c) => {
        map.set(c.id, { ...c, children: [] });
    });

    // Build tree
    flatComments.forEach((c) => {
        const node = map.get(c.id)!;
        const parentId = c.parent_id?.split("_")[1];
        if (parentId && map.has(parentId)) {
            map.get(parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

const CommentItem = ({
    comment,
    depth = 0,
    onReplySuccess,
    isConfigured = false,
}: {
    comment: CommentTree;
    depth?: number;
    onReplySuccess: () => void;
    isConfigured?: boolean;
}) => {
    const [isReplying, setIsReplying] = useState(false);

    return (
        <div style={{ marginLeft: depth > 0 ? `${Math.min(depth * 12, 48)}px` : "0" }}>
            <Card className={`p-3 mb-3 ${depth > 0 ? "border-l-2 border-l-primary/30" : ""}`}>
                <div className="flex items-start gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-primary">
                            {comment?.author?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm truncate max-w-[150px]">{comment?.author}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                                {comment?.formatted_date?.slice(0, 10)}
                            </span>
                            <span className="text-xs text-primary">
                                {moment(comment?.formatted_date, "YYYY-MM-DD").fromNow()}
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap mb-2">{comment?.body}</p>

                        {isConfigured && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs text-muted-foreground hover:text-primary"
                                onClick={() => setIsReplying(!isReplying)}
                            >
                                <Reply className="h-3.5 w-3.5 mr-1.5" />
                                Reply
                            </Button>
                        )}

                        {isReplying && (
                            <div className="mt-3">
                                <ReplySection
                                    parentId={comment.id.startsWith('t1_') ? comment.id : `t1_${comment.id}`}
                                    onSuccess={() => {
                                        setIsReplying(false);
                                        onReplySuccess();
                                    }}
                                    onCancel={() => setIsReplying(false)}
                                    placeholder={`Replying to ${comment.author}...`}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </Card>
            {comment.children.length > 0 &&
                comment.children.map((child) => (
                    <CommentItem
                        key={child.id}
                        comment={child}
                        depth={depth + 1}
                        onReplySuccess={onReplySuccess}
                        isConfigured={isConfigured}
                    />
                ))}
        </div>
    );
};

function ReplySection({
    parentId,
    onSuccess,
    onCancel,
    placeholder = "Type your reply...",
    autoFocus = true,
    compact = false
}: {
    parentId: string;
    onSuccess: () => void;
    onCancel?: () => void;
    placeholder?: string;
    autoFocus?: boolean;
    compact?: boolean;
}) {
    const [text, setText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!text.trim()) return;
        setIsSubmitting(true);
        try {
            await invoke("submit_reddit_comment_command", { parentId, text });
            toast({
                title: "Comment posted",
                description: "Your reply has been submitted to Reddit.",
            });
            setText("");
            onSuccess();
        } catch (error) {
            console.error("Failed to post comment:", error);
            toast({
                title: "Failed to post",
                description: typeof error === 'string' ? error : "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-2">
            <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                className={`${compact ? 'min-h-[60px]' : 'min-h-[100px]'} text-sm resize-none focus-visible:ring-1 bg-muted/20`}
                autoFocus={autoFocus}
            />
            <div className="flex justify-end gap-2">
                {onCancel && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                )}
                <Button size="sm" className="h-8 text-xs px-3" onClick={handleSubmit} disabled={isSubmitting || !text.trim()}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Posting...
                        </>
                    ) : (
                        <>
                            <Send className="h-3 w-3 mr-2" />
                            Post
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

interface RedditCommentsViewProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    post: { id: string; title: string; url: string; subreddit: string } | null;
    comments: Message[];
    sortType: string;
    onSortTypeChange: (sortType: string) => void;
}

export function RedditCommentsView({
    isOpen,
    onOpenChange,
    post,
    comments,
    sortType,
    onSortTypeChange,
}: RedditCommentsViewProps) {
    const [isConfigured, setIsConfigured] = useState(false);
    const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

    useEffect(() => {
        if (!isOpen) return;

        const checkConfig = async () => {
            try {
                const config = await invoke("get_reddit_config_command") as any;
                const hasId = config.reddit_api_id && config.reddit_api_id !== "CHANGE_ME";
                const hasSecret = config.reddit_api_secret && config.reddit_api_secret !== "CHANGE_ME";
                const hasUser = config.reddit_username && config.reddit_username !== "";
                const hasPass = config.reddit_password && config.reddit_password !== "";
                setIsConfigured(Boolean(hasId && hasSecret && hasUser && hasPass));
            } catch (e) {
                console.error("Failed to check reddit config:", e);
                setIsConfigured(false);
            }
        };

        checkConfig();
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden outline-none">
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Header: Fixed */}
                    <div className="flex-shrink-0 p-4 md:p-6 border-b bg-muted/5">
                        <DialogHeader className="mb-0">
                            <DialogTitle className="flex items-center gap-2 pr-8 text-lg font-bold">
                                <MessageCircle className="h-5 w-5 text-primary" />
                                <span className="truncate">{post?.title}</span>
                            </DialogTitle>
                            {post && (
                                <DialogDescription asChild>
                                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <section className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-mono text-[10px] py-0">
                                                r/{post.subreddit}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">•</span>
                                            <span className="text-xs text-muted-foreground">
                                                {comments.length} comments
                                            </span>
                                        </section>
                                        <section className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Sort:</span>
                                            <Select value={sortType} onValueChange={onSortTypeChange}>
                                                <SelectTrigger className="w-[110px] h-7 text-[11px] bg-background">
                                                    <SelectValue placeholder="Sort by" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="best">Best</SelectItem>
                                                    <SelectItem value="top">Top</SelectItem>
                                                    <SelectItem value="new">New</SelectItem>
                                                    <SelectItem value="controversial">Controversial</SelectItem>
                                                    <SelectItem value="old">Old</SelectItem>
                                                    <SelectItem value="q&a">Q&A</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </section>
                                    </div>
                                </DialogDescription>
                            )}
                        </DialogHeader>
                    </div>

                    {/* Comments: Scrollable */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-muted/5">
                        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-3">
                            {commentTree.map((rootComment) => (
                                <CommentItem
                                    key={rootComment.id}
                                    comment={rootComment}
                                    onReplySuccess={() => onSortTypeChange(sortType)}
                                    isConfigured={isConfigured}
                                />
                            ))}
                            {comments.length === 0 && (
                                <div className="text-center py-16 text-muted-foreground bg-muted/20 border-2 border-dashed rounded-xl">
                                    No comments found for this post.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer: Sticky */}
                    {post && isConfigured && (
                        <div className="flex-shrink-0 border-t bg-background p-4 md:px-6 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
                            <div className="max-w-4xl mx-auto">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                        <Send className="h-3 w-3" />
                                        Your Thoughts
                                    </h4>
                                </div>
                                <ReplySection
                                    parentId={post.id.startsWith('t3_') ? post.id : `t3_${post.id}`}
                                    onSuccess={() => {
                                        onSortTypeChange(sortType); // Trigger refresh
                                    }}
                                    placeholder="Add a comment..."
                                    autoFocus={false}
                                    compact={true}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
