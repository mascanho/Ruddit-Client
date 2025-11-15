// @ts-nocheck
"use client";
import { useState, useMemo, useEffect } from "react";
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
import { AppSettingsDialog, useAppSettings } from "./app-settings";
import { RedditSearch } from "./reddit-search";
import { AIDataChat } from "./ai-data-chat";
import { LeadsGenerator } from "./leads-generator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAddSingleSubReddit, useRedditPostsTab } from "@/store/store";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

export type Message = {
  id: string;
  username: string;
  message: string;
  date: string;
  source?: string;
};

export type RedditPost = {
  id: string;
  date: string;
  title: string;
  url: string;
  relevance: number;
  subreddit: string;
  formatted_date: string;
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

  const { subRedditsSaved } = useAddSingleSubReddit();

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

  async function getAllRedditsSaved() {
    try {
      const data: any = await invoke("get_all_posts");
      console.log(data, "ALL SAVED POSTS");
      setAllSavedPosts(data);
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    getAllRedditsSaved();
  }, [redditPosts, subRedditsSaved]);

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
    if (value === "reddit" && (subredditsModified || newPostsCount > 0)) {
      setSubredditsModified(false);
      setNewPostsCount(0);
    }
  };

  const dataStats = useMemo(() => {
    const subreddits = Array.from(new Set(redditPosts.map((p) => p.subreddit)));
    const avgRelevance =
      redditPosts.length > 0
        ? redditPosts.reduce((sum, p) => sum + p.relevance, 0) /
          redditPosts.length
        : 0;

    return {
      totalPosts: redditPosts.length,
      totalMessages: messages.length,
      subreddits,
      topKeywords: settings.monitoredKeywords || [],
      averageRelevance: avgRelevance,
    };
  }, [redditPosts, messages, settings]);

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
      className="container mx-auto py-8 px-4 w-full max-w-full"
      style={{ fontSize: `${settings.fontSize}px` }}
    >
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Ruddit</h1>
          <p className="text-muted-foreground">
            Lead Generation and Brand Monitoring
          </p>
        </div>
        <section className="flex space-x-2  justify-between">
          <Button
            className="cursor-pointer"
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            className="cursor-pointer"
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
          >
            <StopCircle className="h-4 w-4" />
          </Button>
          <Button
            className="cursor-pointer"
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button
            className="cursor-pointer"
            variant="outline"
            size="icon"
            onClick={handleOpenSettings}
          >
            <Cog className="h-4 w-4" />
          </Button>
          <Button
            className="cursor-pointer"
            variant="outline"
            size="icon"
            onClick={handleOpenDbFolder}
          >
            <Database className="h-4 w-4" />
          </Button>
        </section>
      </div>

      <Tabs
        defaultValue="reddit"
        className="w-full"
        onValueChange={handleTabChange}
      >
        <TabsList className="grid w-full flex justify-between w-full max-w-full grid-cols-5 mb-6">
          <TabsTrigger value="reddit" className="relative">
            Reddit Posts
            {subredditsModified && (
              <Badge
                variant="destructive"
                className="ml-2 px-1.5 py-0.5 text-xs flex items-center gap-1"
              >
                <AlertCircle className="h-3 w-3" />
                Updated
              </Badge>
            )}
            {newPostsCount > 0 && (
              <Badge className="ml-2 px-2 py-0.5 text-xs bg-green-600 hover:bg-green-700">
                +{newPostsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages">
            Messages
            {messages.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {messages.length}
              </span>
            )}
          </TabsTrigger>
          {/* <TabsTrigger value="leads"> */}
          {/*   <TrendingUp className="h-4 w-4 mr-1" /> */}
          {/*   Leads */}
          {/* </TabsTrigger> */}
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="ai">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="reddit" className="space-y-4">
          <RedditTable
            onAddComments={handleAddComments}
            externalPosts={allSavedPosts}
            searchState={searchState}
            onSearchStateChange={setSearchState}
          />
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <MessagesTable
            externalMessages={messages}
            searchState={searchState}
            onSearchStateChange={setSearchState}
            handleClearComments={handleClearComments}
          />
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <LeadsGenerator posts={redditPosts} messages={messages} />
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <RedditSearch
            onAddResults={handleAddSearchResults}
            onNotifyNewPosts={handleNotifyNewPosts}
          />
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <AIDataChat dataStats={dataStats} />
        </TabsContent>
      </Tabs>

      <AppSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSubredditsChanged={handleSubredditsChanged}
      />
    </div>
  );
}
