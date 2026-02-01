import React from "react";
import {
  Search,
  Eye,
  Plus,
  Trash2,
  Bot,
  ArrowUp,
  ArrowDown,
  User,
  UserPlus,
  Radar,
  MessageSquare,
  ExternalLink,
  Filter,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PostDataWrapper } from "@/store/store";
import { getIntentColor } from "@/lib/marketing-utils";
import { useOpenUrl } from "@/hooks/useOpenUrl";
import {
  CustomButton,
  KeywordBadge,
  HighlightedText,
  KeywordCategory,
  formatElapsedTime,
} from "./automation-utils";

interface AutomationResultsTableProps {
  filteredAndSortedPosts: PostDataWrapper[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedPostIds: Set<number>;
  setIsSelectedModalOpen: (open: boolean) => void;
  handleBulkAddToTracking: () => void;
  clearFoundPosts: () => void;
  foundPostsLength: number;
  toggleAllPosts: () => void;
  togglePostSelection: (postId: number) => void;
  handleDateSort: () => void;
  sortConfig: { key: string; direction: "asc" | "desc" };
  trackedPostIds: Set<number>;
  keywordCategoriesForHighlighting: KeywordCategory[];
  addSubredditToMonitoring: (subreddit: string) => void;
  handleGetComments: (post: PostDataWrapper, sortType: string) => void;
  handleAddToTracking: (post: PostDataWrapper) => void;
  monitoredSubreddits: string[];
  blacklistSubreddits: string[];
  monitoredUsernames: string[];
  addUsernameToMonitoring: (username: string) => void;
  addSubredditToBlacklist: (subreddit: string) => void;
  addUsernameToBlacklist: (username: string) => void;
  blacklistUsernames: string[];
  intentFilter: string[];
  setIntentFilter: (filter: string[]) => void;
  authorFilter: string;
  setAuthorFilter: (filter: string) => void;
}

const MemoizedResultRow = React.memo(({
  post,
  index,
  isSelected,
  isTracked,
  togglePostSelection,
  openUrl,
  handleGetComments,
  handleAddToTracking,
  monitoredUsernames,
  monitoredSubreddits,
  blacklistSubreddits,
  blacklistUsernames,
  addUsernameToMonitoring,
  addSubredditToMonitoring,
  addSubredditToBlacklist,
  addUsernameToBlacklist,
  keywordCategoriesForHighlighting
}: {
  post: PostDataWrapper;
  index: number;
  isSelected: boolean;
  isTracked: boolean;
  togglePostSelection: (id: number) => void;
  openUrl: (url: string) => void;
  handleGetComments: (post: PostDataWrapper, sort: string) => void;
  handleAddToTracking: (post: PostDataWrapper) => void;
  monitoredUsernames: string[];
  monitoredSubreddits: string[];
  blacklistSubreddits: string[];
  addUsernameToMonitoring: (user: string) => void;
  addSubredditToMonitoring: (sub: string) => void;
  addSubredditToBlacklist: (sub: string) => void;
  addUsernameToBlacklist: (user: string) => void;
  blacklistUsernames: string[];
  keywordCategoriesForHighlighting: KeywordCategory[];
}) => {
  return (
    <tr className={`border-b transition-colors group ${index % 2 === 0 ? "bg-black/[0.02] dark:bg-white/[0.04]" : "bg-background"} hover:bg-muted/80`}>
      <td className="w-8 pl-3 pr-1">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => togglePostSelection(post.id)}
          aria-label={`Select ${post.title}`}
          className="translate-y-[2px]"
        />
      </td>
      <td className="px-1 w-20">
        <div className="flex flex-col gap-0.5">
          <span
            className={`w-fit text-[9px] py-0 px-1 rounded-full font-bold ${getIntentColor(post.intent?.toLowerCase() || "low")}`}
          >
            {post.intent}
          </span>
          {post.category && post.category !== "general" && (
            <span className="w-fit text-[9px] py-0 px-1 rounded-full bg-secondary text-secondary-foreground">
              {post.category}
            </span>
          )}
        </div>
      </td>
      <td className="p-1.5 font-medium overflow-hidden">
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                post.url && openUrl(post.url);
              }}
              className="hover:underline inline-block truncate max-w-full"
            >
              {post.title}
              {isTracked && (
                <KeywordBadge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-2">
                  Tracking
                </KeywordBadge>
              )}
            </a>
          </TooltipTrigger>
          <TooltipContent
            className="max-w-md p-3 bg-stone-50 border shadow"
            side="bottom"
            align="start"
          >
            <div className="text-sm font-semibold text-black ">
              <HighlightedText
                text={post.title}
                categories={keywordCategoriesForHighlighting}
              />
            </div>
            {post.selftext && (
              <div className="mt-2 border-t border-border pt-2">
                <p className="text-sm text-foreground/80 whitespace-pre-wrap max-h-48 overflow-y-auto custom-scroll">
                  <HighlightedText
                    text={post.selftext}
                    categories={keywordCategoriesForHighlighting}
                  />
                </p>
              </div>
            )}
            <div className="mt-2 border-t border-border pt-2 flex justify-between items-center text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>u/{post.author || "unknown"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Radar className="h-3 w-3" />
                <span>r/{post.subreddit}</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </td>
      <td className="p-1.5 text-muted-foreground text-xs w-36">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span
              className={`inline-block border px-2 rounded-sm cursor-pointer transition-colors max-w-full truncate ${blacklistUsernames.includes(post.author?.toLowerCase() || "")
                ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                : monitoredUsernames.includes(post.author?.toLowerCase() || "")
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                  : "bg-background/50 border-muted-foreground/10 hover:bg-gray-100 hover:text-black"
                }`}
              title={`u/${post.author || "unknown"}`}
            >
              u/{post.author || "unknown"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              className="text-xs"
              onClick={() =>
                openUrl(`https://www.reddit.com/user/${post.author}/`)
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              <span>View Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs"
              onClick={() =>
                post.author && addUsernameToMonitoring(post.author)
              }
            >
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Monitor User</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs text-destructive focus:text-destructive"
              onClick={() =>
                post.author && addUsernameToBlacklist(post.author)
              }
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Blacklist User</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="p-1.5 text-muted-foreground text-xs w-36">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span
              className={`inline-block border px-2 rounded-sm cursor-pointer transition-colors max-w-full truncate ${monitoredSubreddits.includes(post.subreddit.toLowerCase().replace(/^r\//, ""))
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20"
                : blacklistSubreddits.includes(post.subreddit.toLowerCase().replace(/^r\//, ""))
                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                  : "bg-background/50 border-muted-foreground/10 hover:bg-gray-100 hover:text-black"
                }`}
            >
              r/{post.subreddit}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              className="text-xs"
              onClick={() =>
                addSubredditToMonitoring(post.subreddit)
              }
            >
              <Radar className="h-4 w-4 mr-2" />
              Monitor r/{post.subreddit}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs text-destructive focus:text-destructive"
              onClick={() =>
                addSubredditToBlacklist(post.subreddit)
              }
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Blacklist r/{post.subreddit}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="p-1.5 text-muted-foreground text-xs w-28 whitespace-nowrap">
        {formatElapsedTime(post.timestamp)}
      </td>
      <td className="p-1.5 text-right w-12">
        <div className="flex items-center justify-end gap-1">
          <CustomButton
            onClick={() =>
              handleGetComments(post, post.sort_type)
            }
            title="View Comments"
            className="h-6 w-6 p-0 justify-center hover:bg-primary/10 hover:text-primary text-muted-foreground/60 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
          </CustomButton>
          <CustomButton
            onClick={() => handleAddToTracking(post)}
            title="Add to Tracking"
            className="h-6 w-6 p-0 justify-center hover:bg-primary/10 hover:text-primary text-muted-foreground/60 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </CustomButton>
        </div>
      </td>
    </tr>
  );
});

MemoizedResultRow.displayName = "MemoizedResultRow";

export function AutomationResultsTable({
  filteredAndSortedPosts,
  searchQuery,
  setSearchQuery,
  selectedPostIds,
  setIsSelectedModalOpen,
  handleBulkAddToTracking,
  clearFoundPosts,
  foundPostsLength,
  toggleAllPosts,
  togglePostSelection,
  handleDateSort,
  sortConfig,
  trackedPostIds,
  keywordCategoriesForHighlighting,
  addSubredditToMonitoring,
  handleGetComments,
  handleAddToTracking,
  monitoredSubreddits,
  blacklistSubreddits,
  monitoredUsernames,
  addUsernameToMonitoring,
  addSubredditToBlacklist,
  blacklistUsernames,
  addUsernameToBlacklist,
  intentFilter,
  setIntentFilter,
  authorFilter,
  setAuthorFilter,
}: AutomationResultsTableProps) {
  const openUrl = useOpenUrl();
  return (
    <div className="bg-card rounded-lg border border-border/60 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex justify-between items-center bg-muted/10">
        <div className="flex items-center gap-4">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-foreground/80">
            Processed Results: {filteredAndSortedPosts.length}
          </h2>
          <div className="relative w-48 group">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Filter signals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background/50 border border-border/40 rounded px-7 h-7 text-[10px] w-full focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedPostIds.size > 0 && (
            <>
              <button
                onClick={() => setIsSelectedModalOpen(true)}
                className="px-3 h-7 text-[10px] font-bold uppercase tracking-widest border border-primary/20 text-primary hover:bg-primary/10 transition-all rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-right-4"
              >
                <Eye className="h-3 w-3" />
                Comments ({selectedPostIds.size})
              </button>
              <button
                onClick={handleBulkAddToTracking}
                className="px-3 h-7 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-right-4"
              >
                <Plus className="h-3 w-3" />
                Track Selected ({selectedPostIds.size})
              </button>
            </>
          )}
          <button
            onClick={clearFoundPosts}
            disabled={foundPostsLength === 0}
            className="px-3 h-7 text-[10px] font-bold uppercase tracking-widest border border-destructive/20 text-destructive/60 hover:bg-destructive hover:text-white transition-all rounded-md flex items-center gap-2"
          >
            <Trash2 className="h-3 w-3" />
            Reset Feed
          </button>
        </div>
      </div>
      <div className="p-0 flex-1 min-h-0 relative overflow-hidden rounded-none flex flex-col">
        {foundPostsLength === 0 ? (
          <div className="text-center py-4 text-muted-foreground flex flex-col items-center justify-center h-full">
            <Bot className="h-8 w-8 mx-auto mb-1 opacity-20" />
            <p className="font-semibold text-sm">No findings yet</p>
            <p className="text-xs">
              Start the agent to search for relevant threads.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 flex flex-col custom-scroll border rounded-none">
            <table className="w-full text-xs text-left table-fixed border-separate border-spacing-0 isolate transform-gpu">
              <thead className="sticky top-0 bg-background z-40 border-b border-border/50">
                <tr className="border-b font-bold">
                  <th className="w-8 pl-3 pr-1">
                    <Checkbox
                      checked={
                        filteredAndSortedPosts.length > 0 &&
                        filteredAndSortedPosts.every((p) =>
                          selectedPostIds.has(p.id),
                        )
                      }
                      onCheckedChange={toggleAllPosts}
                      aria-label="Select all"
                      className="translate-y-[1px]"
                    />
                  </th>
                  <th className="p-1.5 font-bold text-xs text-muted-foreground sticky top-0 bg-background z-40 border-b border-border/50 w-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground transition-colors focus:outline-none">
                        Intent
                        <Filter className={`h-3 w-3 ${intentFilter.length < 3 ? "text-primary fill-primary/20" : "opacity-50"}`} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {["High", "Medium", "Low"].map((level) => (
                          <DropdownMenuItem
                            key={level}
                            onClick={(e) => {
                              e.preventDefault();
                              if (intentFilter.includes(level)) {
                                setIntentFilter(intentFilter.filter((l) => l !== level));
                              } else {
                                setIntentFilter([...intentFilter, level]);
                              }
                            }}
                            className="text-xs flex items-center gap-2"
                          >
                            <Checkbox checked={intentFilter.includes(level)} className="w-3.5 h-3.5" />
                            {level}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </th>
                  <th className="p-1.5 font-bold text-xs text-muted-foreground sticky top-0 bg-background z-40 border-b border-border/50 w-auto">
                    Title
                  </th>
                  <th className="p-1.5 font-bold text-xs text-muted-foreground sticky top-0 bg-background z-40 border-b border-border/50 w-36">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground transition-colors focus:outline-none w-full">
                        Author
                        <Filter className={`h-3 w-3 ${authorFilter ? "text-primary fill-primary/20" : "opacity-50"}`} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="p-2 w-48">
                        <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-background">
                          <Search className="h-3 w-3 opacity-50" />
                          <input
                            autoFocus
                            className="flex-1 bg-transparent border-none text-xs focus:outline-none h-6"
                            placeholder="Filter authors..."
                            value={authorFilter}
                            onChange={(e) => setAuthorFilter(e.target.value)}
                          />
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </th>
                  <th className="p-1.5 font-bold text-xs text-muted-foreground sticky top-0 bg-background z-40 border-b border-border/50 w-32">
                    Subreddit
                  </th>
                  <th
                    className="p-1.5 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground w-28 sticky top-0 bg-background z-40 border-b border-border/50"
                    onClick={handleDateSort}
                  >
                    <div className="flex items-center gap-1 font-bold">
                      Date
                      {sortConfig.direction === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th className="w-12 sticky top-0 bg-background z-40 border-b border-border/50"></th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedPosts.map((post, index) => (
                  <MemoizedResultRow
                    key={post.id}
                    post={post}
                    index={index}
                    isSelected={selectedPostIds.has(post.id)}
                    isTracked={trackedPostIds.has(post.id)}
                    togglePostSelection={togglePostSelection}
                    openUrl={openUrl}
                    handleGetComments={handleGetComments}
                    handleAddToTracking={handleAddToTracking}
                    monitoredUsernames={monitoredUsernames}
                    monitoredSubreddits={monitoredSubreddits}
                    blacklistSubreddits={blacklistSubreddits}
                    blacklistUsernames={blacklistUsernames}
                    addUsernameToMonitoring={addUsernameToMonitoring}
                    addSubredditToMonitoring={addSubredditToMonitoring}
                    addSubredditToBlacklist={addSubredditToBlacklist}
                    addUsernameToBlacklist={addUsernameToBlacklist}
                    keywordCategoriesForHighlighting={keywordCategoriesForHighlighting}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
