// @ts-nocheck
"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Settings2,
  TrendingUp,
  AlertCircle,
  Play,
  StopCircle,
  Settings2Icon,
  Cog,
  Database,
} from "lucide-react";
import { RedditTable } from "./reddit-table";
import { MessagesTable } from "./messages-table";
import { AppSettingsDialog } from "./app-settings";
import { useAppSettings } from "@/store/settings-store";
import { RedditSearch } from "./reddit-search";
import { AIDataChat } from "./ai-data-chat";
import { LeadsGenerator } from "./leads-generator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAddSingleSubReddit, useRedditPostsTab } from "@/store/store";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { AutomationTab } from "./automation-tab";
import { AutomationRunner } from "./automation-runner";

export type Message = {
  id: string;
  username: string;
  message: string;
  date: string;
  source?: string;
  // Fields used in RedditTable
  author?: string;
  body?: string;
  formatted_date?: string;
  parent_id?: string;
  post_title?: string;
  subreddit?: string;
  score?: number;
};

export type RedditPost = {
  id: string;
  date: string;
  title: string;
  url: string;
  relevance: number;
  subreddit: string;
  formatted_date: string;
  notes: string;
};

export type SearchState = {
  redditSearch: string;
  redditSubreddit: string;
  redditRelevance: string;
  messagesSearch: string;
};

export function SmartDataTables() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [redditPosts, setRedditPosts] = useState<RedditPost[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState("appearance");
  const { settings } = useAppSettings();

  const [subredditsModified, setSubredditsModified] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [allSavedPosts, setAllSavedPosts] = useState([]);

  const [searchState, setSearchState] = useState<SearchState>({
    redditSearch: "",
    redditSubreddit: "all",
    redditRelevance: "all",
    messagesSearch: "",
  });
  const [activeTab, setActiveTab] = useState("reddit");
  const [shouldScrollAI, setShouldScrollAI] = useState(false);

  const { subRedditsSaved, setSingleSubreddit } = useAddSingleSubReddit();

  // GET ALL THE COMMENTS FROM DB AND SHOW IN THE FRONT END TABLE

  async function getAllComments() {
    try {
      const data: any = await invoke("get_all_comments_command");
      console.log(data, "ALL COMMENTS");
      setMessages(data);
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    getAllComments();
  }, [allSavedPosts]);

  // GET ALL THE SAVED POSTS FROM DB AND SHOW IN THE FRONT END TABLE
  useEffect(() => {
    invoke("get_all_posts")
      .then((data) => {
        console.log(data, "ALL SAVED POSTS");
        setSingleSubreddit(data as any[]);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  useEffect(() => {
    setAllSavedPosts(subRedditsSaved);
  }, [subRedditsSaved]);

  const handleAddComments = (comments: Message[]) => {
    setMessages((prev) => [...prev, ...comments]);
  };

  const handleAddSearchResults = (results: RedditPost[]) => {
    setRedditPosts((prev) => [...prev, ...results]);
  };

  const handleNotifyNewPosts = (count: number) => {
    setNewPostsCount((prev) => prev + count);
  };

  const handleSubredditsChanged = (addedCount = 0) => {
    setSubredditsModified(true);

    if (addedCount > 0) {
      setNewPostsCount(addedCount);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "reddit" && (subredditsModified || newPostsCount > 0)) {
      setSubredditsModified(false);
      setNewPostsCount(0);
    }
    // Auto-scroll to bottom when switching to AI Assistant tab
    if (value === "ai") {
      // Reset and trigger scroll
      setShouldScrollAI(false);
      setTimeout(() => {
        setShouldScrollAI(true);
        setTimeout(() => setShouldScrollAI(false), 300);
      }, 50);
    }
  };

  const dataStats = useMemo(() => {
    const uniqueSubreddits = Array.from(
      new Set(subRedditsSaved.map((p) => p.subreddit)),
    );
    const avgRelevance =
      subRedditsSaved.length > 0
        ? subRedditsSaved.reduce((sum, p) => sum + p.relevance_score, 0) /
          subRedditsSaved.length
        : 0;

    const highIntentPosts = subRedditsSaved.filter(
      (p) => p.intent?.toLowerCase() === "high",
    ).length;
    const postsWithNotes = subRedditsSaved.filter(
      (p) => p.notes && p.notes.trim() !== "",
    ).length;
    const engagedPosts = subRedditsSaved.filter((p) => p.engaged === 1).length;
    const totalPosts = subRedditsSaved.length;
    const totalMessages = messages.length;

    return {
      totalPosts,
      totalMessages,
      uniqueSubredditsCount: uniqueSubreddits.length,
      highIntentPostsCount: highIntentPosts,
      postsWithNotesCount: postsWithNotes,
      engagedPostsCount: engagedPosts,
      topKeywords: settings.monitoredKeywords || [],
      averageRelevance: avgRelevance,
    };
  }, [subRedditsSaved, messages, settings]);

  // HANDLE DELETING THE COMMENTS FROM THE TABLE
  async function handleClearComments() {
    try {
      const data: any = await invoke("clear_comments_command");
      console.log(data, "ALL COMMENTS");
      setMessages([]);
      toast.info("Deleting all comments...");

      new Promise((resolve) => setTimeout(resolve, 1000));
      window.location.reload();
    } catch (err) {
      console.log(err);
    }
  }

  async function handleOpenSettings() {
    try {
      await invoke("open_settings_commmand");
      console.log("settings editor");
    } catch (err) {
      console.log(err);
    }
  }

  async function handleOpenDbFolder() {
    try {
      await invoke("open_db_folder_command");
      console.log("Openined DB FODER");
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div
      className="w-full h-screen flex flex-col overflow-hidden px-2 py-2"
      style={{ fontSize: `${settings.fontSize}px` }}
    >
      <AutomationRunner />
      <div className="mb-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-1 bg-linear-to-r from-primary/50 to-blue-600/50 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <img src="/atalaia.png" alt="logo" className="h-9 w-9 relative" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase leading-none text-foreground/90">
              Atalaia
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
              Intelligence Engine
            </p>
          </div>
        </div>

        <section className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/40 shadow-sm">
          {[
            // {
            //   icon: Play,
            //   onClick: () => setSettingsOpen(true),
            //   tooltip: "Run",
            // },
            // {
            //   icon: StopCircle,
            //   onClick: () => setSettingsOpen(true),
            //   tooltip: "Stop",
            // },
            {
              icon: Settings2,
              onClick: () => setSettingsOpen(true),
              tooltip: "Quick Settings",
            },
            {
              icon: Cog,
              onClick: handleOpenSettings,
              tooltip: "Advanced Settings",
            },
            // {
            //   icon: Database,
            //   onClick: handleOpenDbFolder,
            //   tooltip: "Database",
            // },
          ].map((item, idx) => (
            <Button
              key={idx}
              className="h-8 w-8 cursor-pointer hover:bg-background hover:shadow-sm transition-all"
              variant="ghost"
              size="icon"
              onClick={item.onClick}
              title={item.tooltip}
            >
              <item.icon className="h-4 w-4 opacity-70 group-hover:opacity-100" />
            </Button>
          ))}
        </section>
      </div>

      <Tabs
        defaultValue="reddit"
        className="flex-1 flex flex-col min-h-0 w-full"
        onValueChange={handleTabChange}
      >
        <TabsList className="flex w-full h-9 p-0.5 bg-blue-100/30 border-border/40 mb-2">
          <TabsTrigger
            value="reddit"
            className="flex-1 text-[11px] font-bold uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            Tracking Posts
            {subredditsModified && (
              <Badge
                variant="destructive"
                className="ml-2 h-3.5 px-1 text-[9px] font-black"
              >
                UPDATED
              </Badge>
            )}
            {newPostsCount > 0 && (
              <Badge className="ml-2 h-3.5 px-1 text-[9px] font-black bg-green-600">
                +{newPostsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="messages"
            className="flex-1 text-[11px] font-bold uppercase tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            Messages
            {messages.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-3.5 px-1 text-[9px] font-black opacity-70"
              >
                {messages.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="search"
            className="flex-1 text-[11px] font-bold uppercase tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            Search
          </TabsTrigger>
          <TabsTrigger
            value="automation"
            className="flex-1 text-[11px] font-bold uppercase tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            Automation
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="flex-1 text-[11px] font-bold uppercase tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            AI Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="reddit"
          forceMount
          className={`flex-1 flex flex-col min-h-0 mt-0 outline-none ${activeTab !== "reddit" ? "hidden" : ""}`}
        >
          <RedditTable
            onAddComments={handleAddComments}
            externalPosts={subRedditsSaved}
            searchState={searchState}
            onSearchStateChange={setSearchState}
            isActive={activeTab === "reddit"}
            onOpenSettings={() => {
              setSettingsDefaultTab("monitoring");
              setSettingsOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent
          value="messages"
          forceMount
          className={`flex-1 flex flex-col min-h-0 mt-0 outline-none ${activeTab !== "messages" ? "hidden" : ""}`}
        >
          <MessagesTable
            externalMessages={messages}
            searchState={searchState}
            onSearchStateChange={setSearchState}
            handleClearComments={handleClearComments}
          />
        </TabsContent>

        <TabsContent
          value="search"
          forceMount
          className={`flex-1 flex flex-col min-h-0 mt-0 outline-none ${activeTab !== "search" ? "hidden" : ""}`}
        >
          <RedditSearch
            onAddResults={handleAddSearchResults}
            onNotifyNewPosts={handleNotifyNewPosts}
          />
        </TabsContent>

        <TabsContent
          value="automation"
          forceMount
          className={`flex-1 flex flex-col min-h-0 mt-0 outline-none ${activeTab !== "automation" ? "hidden" : ""}`}
        >
          <AutomationTab />
        </TabsContent>

        <TabsContent
          value="ai"
          forceMount
          className={`flex-1 flex flex-col min-h-0 mt-0 outline-none ${activeTab !== "ai" ? "hidden" : ""}`}
        >
          <AIDataChat dataStats={dataStats} shouldScroll={shouldScrollAI} />
        </TabsContent>
      </Tabs>

      <AppSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSubredditsChanged={handleSubredditsChanged}
        defaultTab={settingsDefaultTab}
      />
    </div>
  );
}
