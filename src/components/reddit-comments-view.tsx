"use client";

import { useMemo } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MessageCircle } from "lucide-react";
import moment from "moment";
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
}: {
    comment: CommentTree;
    depth?: number;
}) => (
    <div style={{ marginLeft: depth > 0 ? `${Math.min(depth * 16, 64)}px` : "0" }}>
        <Card className={`p-4 mb-4 ${depth > 0 ? "border-l-4 border-l-primary/30" : ""}`}>
            <div className="flex items-start gap-3">
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
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{comment?.body}</p>
                </div>
            </div>
        </Card>
        {comment.children.length > 0 &&
            comment.children.map((child) => (
                <CommentItem key={child.id} comment={child} depth={depth + 1} />
            ))}
    </div>
);

interface RedditCommentsViewProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    post: { title: string; url: string; subreddit: string } | null;
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
    const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
                <div className="flex flex-col h-full p-4 md:p-6">
                    <DialogHeader className="flex-shrink-0 mb-4">
                        <DialogTitle className="flex items-center gap-2 pr-8">
                            <MessageCircle className="h-5 w-5 text-primary" />
                            <span className="truncate">{post?.title}</span>
                        </DialogTitle>
                        {post && (
                            <DialogDescription asChild>
                                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <section className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-mono text-xs">
                                            r/{post.subreddit}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">•</span>
                                        <span className="text-xs text-muted-foreground">
                                            {comments.length} comments
                                        </span>
                                    </section>
                                    <section className="flex items-center gap-2">
                                        <span className="text-xs font-medium whitespace-nowrap">Sort by:</span>
                                        <Select value={sortType} onValueChange={onSortTypeChange}>
                                            <SelectTrigger className="w-[120px] h-8 text-xs">
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

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-4 pb-6">
                            {commentTree.map((rootComment) => (
                                <CommentItem key={rootComment.id} comment={rootComment} />
                            ))}
                            {comments.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
                                    No comments fetched yet
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>

        </Dialog>
    );
}
