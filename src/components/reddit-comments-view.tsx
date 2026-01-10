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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageCircle,
  Reply,
  Send,
  Loader2,
  ArrowUpDown,
  User,
  Link,
  UserPlus,
  MoreHorizontal,
} from "lucide-react";
import moment from "moment";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import type { Message } from "./smart-data-tables";
import { useAppSettings } from "@/store/settings-store";
import { KeywordHighlighter } from "./keyword-highlighter";
import { useOpenUrl } from "@/hooks/useOpenUrl";
import type { RedditPost } from "./reddit-table";

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

const DEPTH_COLORS = [
  "bg-zinc-200 dark:bg-zinc-800", // Default fallback
  "bg-blue-400 dark:bg-blue-500",
  "bg-green-400 dark:bg-green-500",
  "bg-yellow-400 dark:bg-yellow-500",
  "bg-orange-400 dark:bg-orange-500",
  "bg-red-400 dark:bg-red-500",
  "bg-purple-400 dark:bg-purple-500",
  "bg-pink-400 dark:bg-pink-500",
  "bg-teal-400 dark:bg-teal-500",
];

const getDepthColor = (d: number) => {
  if (d === 0) return DEPTH_COLORS[0];
  return DEPTH_COLORS[(d - 1) % (DEPTH_COLORS.length - 1) + 1];
};

const CommentItem = ({
  comment,
  depth = 0,
  onReplySuccess,
  isConfigured = false,
}: {
  comment: CommentTree;
  depth?: number;
  onReplySuccess: (comment?: Message) => void;
  isConfigured?: boolean;
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const { settings, updateSettings } = useAppSettings();
  const openUrl = useOpenUrl();

  const isMonitoredUser = useMemo(() => {
    if (!comment.author || !settings.monitoredUsernames) return false;
    return settings.monitoredUsernames.includes(comment.author.toLowerCase());
  }, [comment.author, settings.monitoredUsernames]);

  const handleMonitorUser = () => {
    if (!comment.author) return;
    const username = comment.author.toLowerCase();
    if ((settings.monitoredUsernames || []).includes(username)) {
      toast.info("Already Monitored", {
        description: `User "${comment.author}" is already on your monitor list.`,
      });
      return;
    }
    updateSettings({
      monitoredUsernames: [...(settings.monitoredUsernames || []), username],
    });
    toast.success("User Monitored", {
      description: `Now monitoring comments from "${comment.author}".`,
    });
  };

  const threadColorClass = getDepthColor(depth);
  const isRoot = depth === 0;

  return (
    <div className={`relative group/comment isolate ${isRoot ? "mb-6" : ""}`}>
      {/* Visual connection line for nested comments */}
      {!isRoot && (
        <div
          className={`absolute left-[-20px] top-0 bottom-0 w-[2px] transition-colors ${threadColorClass} opacity-30 group-hover/comment:opacity-100`}
          style={{ height: "100%" }}
        />
      )}

      {/* Comment Container */}
      <div
        className={`
          relative flex gap-3 p-3 transition-all duration-200 
          ${isRoot
            ? "bg-card border border-border/50 rounded-xl shadow-sm hover:shadow-md hover:border-border/80"
            : "rounded-lg bg-black/5 dark:bg-white/5 border border-border/10 hover:bg-black/10 dark:hover:bg-white/10" // Improved contrast
          }
          ${isMonitoredUser ? "ring-1 ring-blue-500/30 bg-blue-50/30 dark:bg-blue-900/10" : ""}
        `}
        style={{
          marginLeft: isRoot ? "0" : `${Math.min(depth * 18, 54)}px`,
        }}
      >
        {/* Avatar / Side */}
        <div className="flex-shrink-0 pt-1">
          <div
            className={`
              rounded-full flex items-center justify-center 
              text-[10px] font-bold uppercase select-none
              transition-all duration-300
              ${isMonitoredUser
                ? "h-8 w-8 bg-blue-500 text-white shadow-blue-500/20 shadow-lg"
                : isRoot
                  ? "h-8 w-8 bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-border/50"
                  : "h-6 w-6 bg-muted text-muted-foreground/60"
              }
            `}
          >
            {comment?.author?.charAt(0).toUpperCase() || "?"}
          </div>
        </div>

        {/* Content Side */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span
              className={`
                font-bold cursor-pointer hover:underline truncate
                ${isMonitoredUser ? "text-blue-600 dark:text-blue-400 opacity-100" : isRoot ? "text-foreground" : "text-foreground/80"}
              `}
              onClick={() =>
                openUrl(`https://www.reddit.com/user/${comment.author}/`)
              }
            >
              u/{comment?.author || "[deleted]"}
            </span>

            {comment.author &&
              comment.author.toLowerCase() ===
              (comment as any).post_author?.toLowerCase() && (
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                >
                  OP
                </Badge>
              )}

            <span className="text-muted-foreground/30">•</span>

            <span className="font-mono text-[10px] text-muted-foreground/70">
              {comment.score ?? 0} pts
            </span>

            <span className="text-muted-foreground/30">•</span>

            <span
              className="text-[10px] text-muted-foreground/50"
              title={moment(comment?.formatted_date).format("LLL")}
            >
              {moment(comment?.formatted_date, "YYYY-MM-DD").fromNow()}
            </span>

            {/* Menu Trigger */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-6 w-6 opacity-0 group-hover/comment:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[9999]">
                <DropdownMenuItem
                  onClick={() =>
                    openUrl(`https://www.reddit.com/user/${comment.author}/`)
                  }
                >
                  <Link className="mr-2 h-4 w-4" />
                  <span>View Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleMonitorUser}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>Monitor User</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Body */}
          <KeywordHighlighter
            text={comment?.body || ""}
            className={`text-sm leading-relaxed break-words whitespace-pre-wrap mb-1.5 ${isRoot ? "text-foreground/90 font-medium" : "text-foreground/80"
              }`}
            brandKeywords={settings.brandKeywords}
            competitorKeywords={settings.competitorKeywords}
            generalKeywords={settings.monitoredKeywords}
          />

          {/* Actions */}
          {isConfigured && (
            <div className="flex items-center gap-4 mt-2">
              <button
                className={`
                  group flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider
                  transition-colors px-1 py-0.5 rounded
                  ${isReplying ? "text-primary bg-primary/10" : "text-muted-foreground/50 hover:text-foreground hover:bg-muted/50"}
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsReplying(!isReplying);
                }}
              >
                <Reply className="h-3 w-3" />
                Reply
              </button>
            </div>
          )}

          {/* Reply Form */}
          {isReplying && (
            <div className="mt-3 mb-2 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
              <ReplySection
                parentId={`t1_${comment.id}`}
                onSuccess={(newComment) => {
                  setIsReplying(false);
                  onReplySuccess(newComment);
                }}
                onCancel={() => setIsReplying(false)}
                placeholder={`Replying to ${comment.author}...`}
                compact={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Children Container */}
      {comment.children.length > 0 && (
        <div className={`relative flex flex-col ${isRoot ? "mt-2 mb-4" : ""}`}>
          {/* Vertical Thread Spine for Root */}
          {isRoot && (
            <div
              className={`absolute left-[16px] top-[-10px] bottom-4 w-[2px] bg-border/30 rounded-full -z-10`}
            />
          )}

          {comment.children.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              depth={depth + 1}
              onReplySuccess={onReplySuccess}
              isConfigured={isConfigured}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function ReplySection({
  parentId,
  onSuccess,
  onCancel,
  placeholder = "Type your reply...",
  autoFocus = true,
  compact = false,
}: {
  parentId: string;
  onSuccess: (comment: Message) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsSubmitting(true);
    try {
      const newComment = (await invoke("submit_reddit_comment_command", { parentId, text })) as Message;
      toast.success("Signal transmitted", {
        description: "Your response has been propagated to the network.",
      });
      setText("");
      onSuccess(newComment);
    } catch (error) {
      console.error("Failed to post comment:", error);
      toast.error("Transmission failed", {
        description:
          typeof error === "string" ? error : "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`relative group transition-all duration-300 ${isFocused ? "opacity-100" : "opacity-80 hover:opacity-100"}`}>
      <div
        className={`
          flex flex-col 
          border border-border/40 
          bg-background/40 backdrop-blur-md 
          rounded-xl overflow-hidden
          transition-all duration-200
          ${isFocused ? "ring-1 ring-primary/20 bg-background/60 shadow-lg" : "shadow-sm"}
        `}
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => !text && setIsFocused(false)}
          placeholder={placeholder}
          className={`
            border-none shadow-none resize-none 
            bg-transparent focus-visible:ring-0 
            text-sm px-4 py-3
            placeholder:text-muted-foreground/40
            ${compact && !isFocused && !text ? "min-h-[44px] h-[44px] py-2.5" : "min-h-[80px]"}
            transition-all duration-200
          `}
          autoFocus={autoFocus}
          rows={compact && !isFocused && !text ? 1 : 3}
        />

        {/* Actions Bar - Collapsible */}
        <div
          className={`
            flex items-center justify-between px-2 pb-2
            transition-all duration-200 overflow-hidden
            ${(isFocused || text) ? "opacity-100 max-h-[40px] mt-1" : "opacity-0 max-h-0"}
          `}
        >
          <div className="text-[10px] text-muted-foreground/40 ml-2 font-mono uppercase tracking-widest">
            {text.length > 0 ? `${text.length} chars` : ""}
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setText("");
                  setIsFocused(false);
                  onCancel();
                }}
                disabled={isSubmitting}
              >
                Discard
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 px-4 text-[10px] font-bold uppercase tracking-wider bg-primary/90 hover:bg-primary shadow-sm"
              onClick={handleSubmit}
              disabled={isSubmitting || !text.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-3 w-3 mr-2" />
                  Transmit
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RedditCommentsViewProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  post: RedditPost | null;
  comments: Message[];
  sortType: string;
  onSortTypeChange: (sortType: string) => void;
  onCommentAdded?: (comment: Message) => void;
}

export function RedditCommentsView({
  isOpen,
  onOpenChange,
  post,
  comments,
  sortType,
  onSortTypeChange,
  onCommentAdded,
}: RedditCommentsViewProps) {
  const [isConfigured, setIsConfigured] = useState(false);
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);
  const openUrl = useOpenUrl();

  useEffect(() => {
    if (!isOpen) return;

    const checkConfig = async () => {
      try {
        const config = (await invoke("get_reddit_config_command")) as any;
        const hasId =
          config.reddit_api_id && config.reddit_api_id !== "CHANGE_ME";
        // Secret is optional for "installed app" type
        // const hasSecret = config.reddit_api_secret && config.reddit_api_secret !== "CHANGE_ME";
        const hasRefreshtoken =
          (config.reddit_refresh_token && config.reddit_refresh_token !== "") ||
          (config.reddit_access_token && config.reddit_access_token !== "");
        // We no longer strictly need username/password for the OAuth flow, just the token and client ID
        const configured = Boolean(hasId && hasRefreshtoken);
        console.log("Reddit Config Check:", { config, hasId, hasRefreshtoken, configured });
        setIsConfigured(configured);
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
          <div className="flex-shrink-0 p-2 md:p-3 border-b bg-muted/5">
            <DialogHeader className="mb-0">
              <DialogTitle className="flex items-center gap-1 pr-4 text-lg font-bold">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span
                  className="truncate cursor-pointer hover:underline"
                  onClick={() => post?.url && openUrl(post.url)}
                >
                  {post?.title}
                </span>
              </DialogTitle>
              {post && (
                <DialogDescription asChild>
                  <div className="mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <section className="flex items-center gap-1 flex-wrap">
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] py-0 h-5"
                      >
                        r/{post.subreddit}
                      </Badge>
                      {post.author && (
                        <div
                          className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer hover:underline"
                          onClick={() =>
                            openUrl(
                              `https://www.reddit.com/user/${post.author}/`,
                            )
                          }
                        >
                          <User className="h-3 w-3" />
                          u/{post.author}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ArrowUpDown className="h-3 w-3" />
                        <span>{post.score ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageCircle className="h-3 w-3" />
                        <span>{comments.length} comments</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {moment(post.timestamp * 1000).fromNow()}
                      </span>
                    </section>
                    <section className="flex items-center gap-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                        Sort:
                      </span>
                      <Select value={sortType} onValueChange={onSortTypeChange}>
                        <SelectTrigger className="w-[110px] h-7 text-[11px] bg-background">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          <SelectItem value="best">Best</SelectItem>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="controversial">
                            Controversial
                          </SelectItem>
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
                  onReplySuccess={(comment) => {
                    if (comment && onCommentAdded) {
                      onCommentAdded(comment);
                    } else {
                      onSortTypeChange(sortType);
                    }
                  }}
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
            <div className="flex-shrink-0 border-t bg-background p-2 md:px-4 shadow-sm">
              <div className="max-w-4xl mx-auto">
                <ReplySection
                  parentId={`t3_${post.id.toString(36)}`}
                  onSuccess={(comment) => {
                    if (comment && onCommentAdded) {
                      onCommentAdded(comment);
                    } else {
                      onSortTypeChange(sortType); // Fallback trigger refresh
                    }
                  }}
                  placeholder="Transmit new signal..."
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
