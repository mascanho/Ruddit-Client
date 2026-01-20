"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Fuse from "fuse.js";
import { RedditCommentsView } from "./reddit-comments-view";
import type { Message } from "./smart-data-tables";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppSettings } from "@/store/settings-store";
import {
  useAutomationStore,
  useAddSingleSubReddit,
  PostDataWrapper,
} from "@/store/store";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { KeywordCategory } from "./automation/automation-utils";
import { AutomationControlPanel } from "./automation/automation-control-panel";
import { AutomationSensorsPanel } from "./automation/automation-sensors-panel";
import {
  AutomationLogsPanel,
  LogEntry,
} from "./automation/automation-logs-panel";
import { AutomationResultsTable } from "./automation/automation-results-table";
import { AutomationSelectionDialog } from "./automation/automation-selection-dialog";

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
  const [selectedPostIds, setSelectedPostIds] = useState<Set<number>>(
    new Set(),
  );
  const [isSelectedModalOpen, setIsSelectedModalOpen] = useState(false);
  const [generatedReplies, setGeneratedReplies] = useState<Map<number, string>>(
    new Map(),
  );
  const [generatingForId, setGeneratingForId] = useState<number | null>(null);
  const [
    isBulkGenerating,
    setIsBulkGenerating,
  ] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [manualBulkComment, setManualBulkComment] = useState("");
  const [bulkProgress, setBulkProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");

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

    // Check for blacklisted subreddits
    const blacklistSubreddits = settings.blacklistSubreddits || [];
    if (
      blacklistSubreddits.some(
        (sub) => post.subreddit?.toLowerCase() === sub.toLowerCase(),
      )
    ) {
      return true;
    }

    // Check for exact keyword matches in the full text
    const exactMatch = blacklistKeywords.some((keyword) =>
      textToCheck.includes(keyword.toLowerCase()),
    );

    // Check for individual word matches
    const wordMatch = blacklistKeywords.some((keyword) =>
      wordsToCheck.some((word) => word === keyword.toLowerCase()),
    );

    return exactMatch || wordMatch;
  };

  const filteredAndSortedPosts = useMemo(() => {
    let postsToProcess = [...foundPosts];

    // Filter out blacklisted posts
    postsToProcess = postsToProcess.filter((post) => !isPostBlacklisted(post));

    if (searchQuery.trim() !== "") {
      // Check if search query matches any monitored keywords exactly
      const allMonitoringKeywords = [
        ...(settings.monitoredKeywords || []),
        ...(settings.brandKeywords || []),
        ...(settings.competitorKeywords || []),
        ...(settings.monitoredSubreddits || []),
        ...(settings.monitoredUsernames || []),
      ];

      const isExactKeywordMatch = allMonitoringKeywords.some(
        (keyword) => searchQuery.toLowerCase() === keyword.toLowerCase(),
      );

      if (isExactKeywordMatch) {
        // For exact keyword matches, filter posts that contain this exact keyword/phrase
        postsToProcess = postsToProcess.filter((post) => {
          const searchText = [
            post.title || "",
            post.selftext || "",
            post.subreddit || "",
            post.author || "",
          ]
            .join(" ")
            .toLowerCase();

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
      postsToProcess = postsToProcess.filter(
        (post) => !isPostBlacklisted(post),
      );
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

  const addSubredditToBlacklist = (subreddit: string) => {
    const cleaned = subreddit.trim().toLowerCase().replace(/^r\//, "");
    if ((settings.blacklistSubreddits || []).includes(cleaned)) {
      toast.info(`r/${cleaned} is already blacklisted`);
      return;
    }

    updateSettings({
      blacklistSubreddits: [...(settings.blacklistSubreddits || []), cleaned],
    });

    toast.success(`r/${cleaned} added to blacklist`);
  };


  const addUsernameToMonitoring = (username: string) => {
    const cleaned = username.trim().toLowerCase();
    if ((settings.monitoredUsernames || []).includes(cleaned)) {
      toast.info(`Already monitoring u/${cleaned}`);
      return;
    }

    updateSettings({
      monitoredUsernames: [...(settings.monitoredUsernames || []), cleaned],
    });

    toast.success(`Now monitoring u/${cleaned}`);
  };

  const savePostToDb = async (post: PostDataWrapper) => {
    try {
      const isDuplicate = subRedditsSaved.some((p) => p.id === post.id);
      if (isDuplicate) return "duplicate"; // Distinct from error

      const isInserted: boolean = await invoke("save_single_reddit_command", {
        post: {
          ...post,
          timestamp: post.timestamp || Date.now(),
          formatted_date:
            post.formatted_date || new Date().toISOString().split("T")[0],
          engaged: 0,
          assignee: "",
          notes: "",
          name: post.name || `na-${post.id}`,
          selftext: post.selftext || "",
          author: post.author || "unknown",
          score: post.score || 0,
          thumbnail: post.thumbnail || "",
          is_self: post.is_self || false,
          num_comments: post.num_comments || 0,
          intent: post.intent || "Low",
          date_added: post.date_added || 0,
          interest: post.interest || 0,
        },
      });

      if (isInserted) {
        addSingleSubreddit(post);
        // Start fetching comments in background
        if (post.url && post.title && post.sort_type && post.subreddit) {
          invoke("get_post_comments_command", {
            url: post.url,
            title: post.title,
            sortType: post.sort_type,
            subreddit: post.subreddit,
            fullname: post.name,
          }).catch(console.error);
        }
        return "success";
      } else {
        return "failed";
      }
    } catch (e) {
      console.error(e);
      return "error";
    }
  };

  const handleAddToTracking = async (post: PostDataWrapper) => {
    const result = await savePostToDb(post);
    if (result === "duplicate") {
      toast.info("Already tracking this post");
    } else if (result === "success") {
      toast.success("Added to tracking");
    } else {
      toast.error("Failed to save to database");
    }
  };

  const togglePostSelection = (postId: number) => {
    const newSelected = new Set(selectedPostIds);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPostIds(newSelected);
  };

  const toggleAllPosts = () => {
    // If all currently visible are selected, deselect all. Otherwise select all visible.
    const allVisibleIds = filteredAndSortedPosts.map((p) => p.id);
    const allSelected = allVisibleIds.every((id) => selectedPostIds.has(id));

    if (allSelected) {
      // Deselect all visible
      const newSelected = new Set(selectedPostIds);
      allVisibleIds.forEach((id) => newSelected.delete(id));
      setSelectedPostIds(newSelected);
    } else {
      // Select all visible
      const newSelected = new Set(selectedPostIds);
      allVisibleIds.forEach((id) => newSelected.add(id));
      setSelectedPostIds(newSelected);
    }
  };

  const handleBulkAddToTracking = async () => {
    const postsToProcess = filteredAndSortedPosts.filter((p) =>
      selectedPostIds.has(p.id),
    );
    if (postsToProcess.length === 0) return;

    let addedCount = 0;
    let duplicateCount = 0;

    for (const post of postsToProcess) {
      const result = await savePostToDb(post);
      if (result === "success") addedCount++;
      if (result === "duplicate") duplicateCount++;
    }

    if (addedCount > 0) {
      toast.success(`Added ${addedCount} posts to tracking`);
    } else if (duplicateCount > 0) {
      toast.info("Selected posts are already being tracked");
    }

    setSelectedPostIds(new Set());
  };

  const handleGenerateReply = async (post: PostDataWrapper) => {
    setGeneratingForId(post.id);
    try {
      const reply = await invoke<string>("generate_reply_command", {
        postTitle: post.title,
        postBody: post.selftext || "",
      });
      setGeneratedReplies((prev) => new Map(prev).set(post.id, reply));
      toast.success("Reply generated");
    } catch (e: any) {
      toast.error(`Failed to generate reply: ${e}`);
    } finally {
      setGeneratingForId(null);
    }
  };

  const generateReplyWithTimeout = async (post: PostDataWrapper) => {
    const TIMEOUT_MS = 60000; // 60 seconds timeout
    return Promise.race([
      invoke<string>("generate_reply_command", {
        postTitle: post.title,
        postBody: post.selftext || "",
      }),
      new Promise<string>((_, reject) =>
        setTimeout(
          () => reject(new Error("AI Generation Timed Out")),
          TIMEOUT_MS,
        ),
      ),
    ]);
  };

  const handleBulkGenerateReplies = async () => {
    const postsToGenerate = foundPosts.filter((p) => selectedPostIds.has(p.id));
    if (postsToGenerate.length === 0) return;

    setIsBulkGenerating(true);
    setBulkProgress(0);
    let successCount = 0;
    let failCount = 0;

    console.log(`Starting bulk generation for ${postsToGenerate.length} posts`);
    setProcessingStatus(`Starting... (0/${postsToGenerate.length})`);

    for (let i = 0; i < postsToGenerate.length; i++) {
      const post = postsToGenerate[i];
      console.log(`Processing ${i + 1}/${postsToGenerate.length}: ${post.id}`);
      setProcessingStatus(
        `Generating for "${post.title.slice(0, 15)}..." (${i + 1}/${postsToGenerate.length})`,
      );
      setBulkProgress(((i + 1) / postsToGenerate.length) * 100);

      try {
        if (generatedReplies.has(post.id)) {
          console.log(`Skipping ${post.id} - already generated`);
          successCount++;
          continue;
        }

        const reply = await generateReplyWithTimeout(post);
        console.log(`Generated reply for ${post.id}`);
        setGeneratedReplies((prev) => new Map(prev).set(post.id, reply));
        successCount++;
      } catch (e: any) {
        console.error(`Failed to generate reply for post ${post.id}:`, e);
        toast.error(
          `Error generating for "${post.title.slice(0, 15)}...": ${e.message || e}`,
        );
        failCount++;
      }

      // Delay to avoid rate limiting
      if (i < postsToGenerate.length - 1) {
        console.log("Waiting for delay...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log("Bulk generation complete");
    setIsBulkGenerating(false);
    setProcessingStatus("Complete");
    setBulkProgress(100);

    if (successCount > 0) {
      toast.success(`Generated ${successCount} replies`);
    }
    if (failCount > 0) {
      toast.error(`Failed to generate ${failCount} replies`);
    }
  };

  const handlePublishReply = async (
    post: PostDataWrapper,
    replyText: string,
  ) => {
    if (!replyText.trim()) return false;
    try {
      // Ensure we have a valid fullname. post.name is best, otherwise construct t3_id(base36)
      // Note: post.id is number, so toString(36) gives the base36 ID.
      const parentId =
        post.name && post.name.startsWith("t3_")
          ? post.name
          : `t3_${post.id.toString(36)}`;

      await invoke("submit_reddit_comment_command", {
        parentId,
        text: replyText,
      });
      return true;
    } catch (e) {
      console.error(`Failed to publish to ${post.id}:`, e);
      return false;
    }
  };

  const handleGenerateAndPublish = async () => {
    const postsToProcess = foundPosts.filter((p) => selectedPostIds.has(p.id));
    if (postsToProcess.length === 0) return;

    setIsPublishing(true);
    setBulkProgress(0);
    let successCount = 0;
    let failCount = 0;

    console.log(
      `Starting bulk generate & publish for ${postsToProcess.length} posts`,
    );
    setProcessingStatus(`Starting... (0/${postsToProcess.length})`);

    for (let i = 0; i < postsToProcess.length; i++) {
      const post = postsToProcess[i];
      console.log(`Processing ${i + 1}/${postsToProcess.length}: ${post.id}`);
      setProcessingStatus(
        `Processing "${post.title.slice(0, 15)}..." (${i + 1}/${postsToProcess.length})`,
      );
      setBulkProgress(((i + 1) / postsToProcess.length) * 100);

      try {
        let reply = generatedReplies.get(post.id);
        if (!reply) {
          try {
            console.log(`Generating reply for ${post.id}`);
            const newReply = await generateReplyWithTimeout(post);
            reply = newReply;
            setGeneratedReplies((prev) => new Map(prev).set(post.id, newReply));
          } catch (genError: any) {
            console.error(`Generation failed for ${post.id}:`, genError);
            toast.error(
              `Generation failed for "${post.title.slice(0, 15)}...": ${genError.message}`,
            );
            failCount++;
            continue; // Skip publishing if generation failed
          }
        }

        if (reply) {
          console.log(`Publishing reply for ${post.id}`);
          const published = await handlePublishReply(post, reply);
          if (published) successCount++;
          else failCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        console.error(`Error processing post ${post.id}:`, e);
        failCount++;
      }

      if (i < postsToProcess.length - 1) {
        console.log("Waiting for delay...");
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Rate limit buffer
      }
    }

    console.log("Bulk generate & publish complete");
    setIsPublishing(false);
    setProcessingStatus("Complete");
    setBulkProgress(100);

    if (successCount > 0) {
      toast.success(`Published ${successCount} replies`);
    }
    if (failCount > 0) {
      toast.error(`Failed to publish ${failCount} replies`);
    }
  };

  const handleManualBulkPublish = async () => {
    if (!manualBulkComment.trim()) {
      toast.error("Please enter a comment to publish");
      return;
    }

    const postsToProcess = foundPosts.filter((p) => selectedPostIds.has(p.id));
    if (postsToProcess.length === 0) return;

    setIsPublishing(true);
    setBulkProgress(0);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < postsToProcess.length; i++) {
      const post = postsToProcess[i];
      setBulkProgress(((i + 1) / postsToProcess.length) * 100);

      const published = await handlePublishReply(post, manualBulkComment);
      if (published) successCount++;
      else failCount++;

      if (i < postsToProcess.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setIsPublishing(false);
    setBulkProgress(100);
    setManualBulkComment(""); // Clear after sending

    if (successCount > 0) {
      toast.success(`Published ${successCount} manual comments`);
    }
    if (failCount > 0) {
      toast.error(`Failed to publish ${failCount} comments`);
    }
  };

  const handleGetComments = async (
    post: PostDataWrapper,
    sort_type: string,
  ) => {
    // Prioritize permalink as it always points to the Reddit thread
    // post.url might point to an external link (image, news) in link posts
    const targetUrl = post.permalink || post.url;

    if (!post.subreddit || post.subreddit === "N/A" || !targetUrl) {
      toast.error("Decryption Failed: Non-Reddit Node", {
        description: "This automation result lacks a valid Reddit path. Signal synchronization is impossible."
      });
      return;
    }

    try {
      const fetchedComments = (await invoke("get_post_comments_command", {
        url: targetUrl,
        title: post.title,
        sortType: sort_type,
        subreddit: post.subreddit,
        fullname: post.name,
      })) as Message[];

      setComments(fetchedComments || []);
      setCommentsPost(post);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast.error(`Transmission Error: ${error}`, {
        description: "Failed to fetch Reddit comments. Please verify your connection."
      });
    }
  };

  const handleSortTypeForCommentsChange = async (newSortType: string) => {
    setSortTypeForComments(newSortType);
    if (commentsPost) {
      await handleGetComments(commentsPost, newSortType);
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
      keywords: [
        ...(settings.blacklistKeywords || []),
        ...(settings.blacklistSubreddits || []).map((s) => `r/${s}`),
      ],
      className: "bg-red-500/10 text-red-400 border border-red-500/20",
    },
  ];

  const visibleKeywords = keywordsExpanded ? Infinity : 5;

  return (
    <TooltipProvider>
      <div className="p-1 space-y-1.5 bg-background text-foreground flex-1 min-h-0 flex flex-col">
        {/* === Main Control Panel === */}
        <div className="bg-card rounded-lg border border-border/60 shadow-sm overflow-hidden">
          <AutomationControlPanel
            isRunning={isRunning}
            setIsRunning={setIsRunning}
            intervalMinutes={intervalMinutes}
            setIntervalMinutes={setIntervalMinutes}
            lastRun={lastRun}
          />
          <div className="p-2 grid grid-cols-1 lg:grid-cols-3 gap-2">
            <AutomationSensorsPanel
              noKeywords={noKeywords}
              keywordCategories={keywordCategories}
              visibleKeywords={visibleKeywords}
              keywordsExpanded={keywordsExpanded}
              setKeywordsExpanded={setKeywordsExpanded}
              handleKeywordClick={handleKeywordClick}
            />
            <AutomationLogsPanel
              logs={logs as LogEntry[]}
              clearLogs={clearLogs}
              scrollRef={scrollRef}
            />
          </div>
        </div>

        {/* === Results Table === */}
        <AutomationResultsTable
          filteredAndSortedPosts={filteredAndSortedPosts}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedPostIds={selectedPostIds}
          setIsSelectedModalOpen={setIsSelectedModalOpen}
          handleBulkAddToTracking={handleBulkAddToTracking}
          clearFoundPosts={clearFoundPosts}
          foundPostsLength={foundPosts.length}
          toggleAllPosts={toggleAllPosts}
          togglePostSelection={togglePostSelection}
          handleDateSort={handleDateSort}
          sortConfig={sortConfig}
          trackedPostIds={trackedPostIds}
          keywordCategoriesForHighlighting={keywordCategoriesForHighlighting}
          addSubredditToMonitoring={addSubredditToMonitoring}
          addSubredditToBlacklist={addSubredditToBlacklist}
          handleGetComments={handleGetComments}
          handleAddToTracking={handleAddToTracking}
          monitoredSubreddits={settings.monitoredSubreddits}
          blacklistSubreddits={settings.blacklistSubreddits || []}
          monitoredUsernames={settings.monitoredUsernames || []}
          addUsernameToMonitoring={addUsernameToMonitoring}
        />
      </div>
      <RedditCommentsView
        isOpen={commentsPost !== null}
        onOpenChange={(open) => !open && setCommentsPost(null)}
        post={commentsPost}
        comments={comments}
        sortType={sortTypeForComments}
        onSortTypeChange={handleSortTypeForCommentsChange}
        onCommentAdded={(newComment) => {
          setComments((prev) => [newComment, ...prev]);
        }}
      />

      <AutomationSelectionDialog
        open={isSelectedModalOpen}
        onOpenChange={setIsSelectedModalOpen}
        selectedPostIds={selectedPostIds}
        foundPosts={foundPosts}
        generatedReplies={generatedReplies}
        setGeneratedReplies={setGeneratedReplies}
        manualBulkComment={manualBulkComment}
        setManualBulkComment={setManualBulkComment}
        isPublishing={isPublishing}
        isBulkGenerating={isBulkGenerating}
        bulkProgress={bulkProgress}
        processingStatus={processingStatus}
        handleManualBulkPublish={handleManualBulkPublish}
        handleBulkGenerateReplies={handleBulkGenerateReplies}
        handleGenerateAndPublish={handleGenerateAndPublish}
        handlePublishReply={handlePublishReply}
        handleGenerateReply={handleGenerateReply}
        generatingForId={generatingForId}
        togglePostSelection={togglePostSelection}
        setSelectedPostIds={setSelectedPostIds}
        handleBulkAddToTracking={handleBulkAddToTracking}
      />
    </TooltipProvider>
  );
}
