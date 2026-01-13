import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, X } from "lucide-react";
import { PostDataWrapper } from "@/store/store";
import { getIntentColor } from "@/lib/marketing-utils";
import { useOpenUrl } from "@/hooks/useOpenUrl";
import { toast } from "sonner";

interface AutomationSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPostIds: Set<number>;
  foundPosts: PostDataWrapper[];
  generatedReplies: Map<number, string>;
  setGeneratedReplies: (map: Map<number, string>) => void;
  manualBulkComment: string;
  setManualBulkComment: (val: string) => void;
  isPublishing: boolean;
  isBulkGenerating: boolean;
  bulkProgress: number;
  processingStatus: string;
  handleManualBulkPublish: () => void;
  handleBulkGenerateReplies: () => void;
  handleGenerateAndPublish: () => void;
  handlePublishReply: (post: PostDataWrapper, text: string) => Promise<boolean>;
  handleGenerateReply: (post: PostDataWrapper) => void;
  generatingForId: number | null;
  togglePostSelection: (postId: number) => void;
  setSelectedPostIds: (ids: Set<number>) => void;
  handleBulkAddToTracking: () => void;
}

export function AutomationSelectionDialog({
  open,
  onOpenChange,
  selectedPostIds,
  foundPosts,
  generatedReplies,
  setGeneratedReplies,
  manualBulkComment,
  setManualBulkComment,
  isPublishing,
  isBulkGenerating,
  bulkProgress,
  processingStatus,
  handleManualBulkPublish,
  handleBulkGenerateReplies,
  handleGenerateAndPublish,
  handlePublishReply,
  handleGenerateReply,
  generatingForId,
  togglePostSelection,
  setSelectedPostIds,
  handleBulkAddToTracking,
}: AutomationSelectionDialogProps) {
  const openUrl = useOpenUrl();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex">
          <div className="flex space-x-3">
            <DialogTitle>
              Selected subreddits ({selectedPostIds.size})
            </DialogTitle>
            <DialogTitle>
              {generatedReplies.size > 0 && (
                <span className="text-sm text-muted-foreground">
                  {generatedReplies.size} / {selectedPostIds.size} generated
                </span>
              )}
            </DialogTitle>
          </div>
          <DialogDescription>
            Review the items you have selected for tracking.
          </DialogDescription>
        </DialogHeader>

        {/* Bulk Actions */}
        <div className="space-y-3 pb-3 border-b">
          {/* Manual Bulk Comment */}
          <div className="p-3 bg-muted/20 rounded-md border border-border/40">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Manual Bulk Comment
            </label>
            <div className="flex flex-col gap-2">
              <Textarea
                value={manualBulkComment}
                onChange={(e) => setManualBulkComment(e.target.value)}
                placeholder="Type a message to post to ALL selected items..."
                className="text-xs min-h-[60px]"
              />
              <button
                onClick={handleManualBulkPublish}
                disabled={
                  isPublishing ||
                  selectedPostIds.size === 0 ||
                  !manualBulkComment.trim()
                }
                className="self-end px-3 py-1.5 bg-blue-600 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPublishing ? (
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Publishing...
                  </div>
                ) : (
                  "Publish to Selection"
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkGenerateReplies}
              disabled={
                isBulkGenerating || isPublishing || selectedPostIds.size === 0
              }
              className="w-full text-center justify-center flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {isBulkGenerating ? (
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
            </button>
            <button
              onClick={handleGenerateAndPublish}
              disabled={
                isBulkGenerating || isPublishing || selectedPostIds.size === 0
              }
              className="w-full flex text-center justify-center items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate & Publish All
                </>
              )}
            </button>
          </div>

          {/* Progress Bar */}
          {(isBulkGenerating || isPublishing) && (
            <div className="space-y-1">
              <Progress value={bulkProgress} className="h-2" />
              <p className="text-xs text-muted-foreground font-mono">
                {processingStatus}
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll border rounded-md">
          {selectedPostIds.size === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No items selected.
            </div>
          ) : (
            <div className="divide-y">
              {foundPosts
                .filter((p) => selectedPostIds.has(p.id))
                .map((post) => (
                  <div
                    key={post.id}
                    className="p-3 flex items-start justify-between gap-3 hover:bg-muted/50 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[9px] py-0 px-1 rounded-full font-bold ${getIntentColor(post.intent?.toLowerCase() || "low")}`}
                        >
                          {post.intent}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          r/{post.subreddit}
                        </span>
                      </div>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          post.url && openUrl(post.url);
                        }}
                        className="text-sm font-medium hover:underline block truncate"
                      >
                        {post.title}
                      </a>
                      {generatedReplies.has(post.id) && (
                        <div className="mt-2 p-2 bg-muted/30 rounded border border-border/40">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                              AI Generated Reply
                            </span>
                          </div>
                          <Textarea
                            value={generatedReplies.get(post.id) || ""}
                            onChange={(e) => {
                              const newReplies = new Map(generatedReplies);
                              newReplies.set(post.id, e.target.value);
                              setGeneratedReplies(newReplies);
                            }}
                            rows={3}
                            className="text-xs mt-1 bg-background"
                          />
                          <button
                            onClick={async () => {
                              const reply = generatedReplies.get(post.id);
                              if (!reply) return;
                              const success = await handlePublishReply(
                                post,
                                reply,
                              );
                              if (success) {
                                toast.success("Reply published");
                              } else {
                                toast.error("Failed to publish reply");
                              }
                            }}
                            className="mt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground rounded hover:bg-primary/90"
                          >
                            Publish Reply
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleGenerateReply(post)}
                        disabled={generatingForId === post.id}
                        className="text-primary hover:text-primary/80 p-1 disabled:opacity-50"
                        title="Generate AI reply"
                      >
                        {generatingForId === post.id ? (
                          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => togglePostSelection(post.id)}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Remove from selection"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setSelectedPostIds(new Set())}
            className="mr-auto text-xs text-destructive hover:underline"
          >
            Clear Selection
          </button>
          <button
            onClick={() => {
              onOpenChange(false);
              handleBulkAddToTracking();
            }}
            disabled={selectedPostIds.size === 0}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-md hover:bg-primary/90"
          >
            Track All ({selectedPostIds.size})
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
