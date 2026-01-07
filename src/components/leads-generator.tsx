"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  Target,
  MessageCircle,
  ExternalLink,
  Sparkles,
  ThumbsUp,
  Activity,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { RedditPost, Message } from "./smart-data-tables";
import { Progress } from "@/components/ui/progress";
import { useAppSettings } from "@/store/settings-store";

type Lead = {
  id: string;
  title: string;
  score: number;
  type: "post" | "subreddit" | "conversation";
  reasons: string[];
  data:
    | RedditPost
    | { subreddit: string; posts: RedditPost[] }
    | { messages: Message[]; topic: string };
};

export function LeadsGenerator({
  posts,
  messages,
}: {
  posts: RedditPost[];
  messages: Message[];
}) {
  const [selectedType, setSelectedType] = useState<
    "all" | "post" | "subreddit" | "conversation"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const { settings } = useAppSettings();
  const [rowsPerPage, setRowsPerPage] = useState(settings.rowsPerPage);

  const leads = useMemo(() => {
    const generatedLeads: Lead[] = [];

    const highValuePosts = posts.filter((p) => p.relevance >= 85);
    highValuePosts.forEach((post) => {
      const reasons = [];
      if (post.relevance >= 90) reasons.push("Extremely high relevance score");
      else reasons.push("High relevance score");

      const daysOld = Math.floor(
        (Date.now() - new Date(post.date).getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysOld <= 3) reasons.push("Very recent post");
      else if (daysOld <= 7) reasons.push("Recent activity");

      generatedLeads.push({
        id: `lead_post_${post.id}`,
        title: post.title,
        score: post.relevance + (daysOld <= 3 ? 10 : daysOld <= 7 ? 5 : 0),
        type: "post",
        reasons,
        data: post,
      });
    });

    const subredditGroups = posts.reduce(
      (acc, post) => {
        if (!acc[post.subreddit]) acc[post.subreddit] = [];
        acc[post.subreddit].push(post);
        return acc;
      },
      {} as Record<string, RedditPost[]>,
    );

    Object.entries(subredditGroups).forEach(([subreddit, subredditPosts]) => {
      if (subredditPosts.length >= 3) {
        const avgRelevance =
          subredditPosts.reduce((sum, p) => sum + p.relevance, 0) /
          subredditPosts.length;
        if (avgRelevance >= 75) {
          const reasons = [
            `${subredditPosts.length} tracked posts in this subreddit`,
            `Average relevance: ${avgRelevance.toFixed(0)}%`,
          ];

          if (avgRelevance >= 85) reasons.push("Consistently high relevance");

          generatedLeads.push({
            id: `lead_subreddit_${subreddit}`,
            title: `r/${subreddit} Community Opportunity`,
            score: avgRelevance + subredditPosts.length * 2,
            type: "subreddit",
            reasons,
            data: { subreddit, posts: subredditPosts },
          });
        }
      }
    });

    const conversationGroups = messages.reduce(
      (acc, msg) => {
        const source = msg.source || "Direct messages";
        if (!acc[source]) acc[source] = [];
        acc[source].push(msg);
        return acc;
      },
      {} as Record<string, Message[]>,
    );

    Object.entries(conversationGroups).forEach(([topic, msgs]) => {
      if (msgs.length >= 4) {
        const reasons = [
          `${msgs.length} comments in this thread`,
          "Active discussion",
        ];

        const uniqueUsers = new Set(msgs.map((m) => m.username)).size;
        if (uniqueUsers >= 3)
          reasons.push(`${uniqueUsers} different participants`);

        generatedLeads.push({
          id: `lead_conv_${topic}`,
          title: topic,
          score: msgs.length * 5 + uniqueUsers * 3,
          type: "conversation",
          reasons,
          data: { messages: msgs, topic },
        });
      }
    });

    return generatedLeads.sort((a, b) => b.score - a.score);
  }, [posts, messages]);

  const filteredLeads = useMemo(() => {
    if (selectedType === "all") return leads;
    return leads.filter((lead) => lead.type === selectedType);
  }, [leads, selectedType]);

  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredLeads.slice(startIndex, endIndex);
  }, [filteredLeads, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);

  const stats = useMemo(() => {
    return {
      total: leads.length,
      posts: leads.filter((l) => l.type === "post").length,
      subreddits: leads.filter((l) => l.type === "subreddit").length,
      conversations: leads.filter((l) => l.type === "conversation").length,
    };
  }, [leads]);

  const getLeadIcon = (type: Lead["type"]) => {
    switch (type) {
      case "post":
        return <Target className="h-4 w-4" />;
      case "subreddit":
        return <TrendingUp className="h-4 w-4" />;
      case "conversation":
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return "text-green-600 dark:text-green-400";
    if (score >= 85) return "text-blue-600 dark:text-blue-400";
    if (score >= 75) return "text-yellow-600 dark:text-yellow-400";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Lead Generation
            </h3>
            <p className="text-sm text-muted-foreground">
              AI-powered insights to identify the most valuable opportunities
              from your tracked data
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                Total Leads
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">
                Hot Posts
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.posts}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">
                Subreddits
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.subreddits}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-muted-foreground">
                Conversations
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.conversations}</div>
          </Card>
        </div>

        <Tabs
          value={selectedType}
          onValueChange={(v) => {
            setSelectedType(v as typeof selectedType);
            setCurrentPage(1);
          }}
        >
          <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-red-500">
            <TabsTrigger value="all">All Leads</TabsTrigger>
            <TabsTrigger value="post">Posts</TabsTrigger>
            <TabsTrigger value="subreddit">Subreddits</TabsTrigger>
            <TabsTrigger value="conversation">Conversations</TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {filteredLeads.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No leads yet</h3>
          <p className="text-sm text-muted-foreground">
            Track more posts and messages to generate intelligent lead
            recommendations
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="border-b">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px] bg-background sticky top-0 z-10">
                        #
                      </TableHead>
                      <TableHead className="w-[140px] bg-background sticky top-0 z-10">
                        Type
                      </TableHead>
                      <TableHead className="min-w-[300px] bg-background sticky top-0 z-10">
                        Title
                      </TableHead>
                      <TableHead className="w-[150px] bg-background sticky top-0 z-10">
                        Score
                      </TableHead>
                      <TableHead className="min-w-[250px] bg-background sticky top-0 z-10">
                        Reasons
                      </TableHead>
                      <TableHead className="w-[100px] bg-background sticky top-0 z-10">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
              </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
              <Table>
                <TableBody>
                  {paginatedLeads.map((lead, index) => (
                    <TableRow key={lead.id}>
                      <TableCell className="text-muted-foreground text-sm font-medium w-[60px]">
                        {(currentPage - 1) * rowsPerPage + index + 1}
                      </TableCell>
                      <TableCell className="w-[140px]">
                        <div className="flex items-center gap-2">
                          {getLeadIcon(lead.type)}
                          <Badge variant="outline" className="capitalize">
                            {lead.type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[300px]">
                        <div className="line-clamp-2 font-medium">
                          {lead.title}
                        </div>
                        {lead.type === "post" && (
                          <Badge
                            variant="outline"
                            className="font-mono text-xs mt-1"
                          >
                            r/{(lead.data as RedditPost).subreddit}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="w-[150px]">
                        <div className="flex items-center gap-3">
                          <div
                            className={`text-xl font-bold ${getScoreColor(lead.score)}`}
                          >
                            {lead.score}
                          </div>
                          <Progress
                            value={Math.min(lead.score, 100)}
                            className="h-2 w-20"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[250px]">
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {lead.reasons.slice(0, 2).map((reason, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3 flex-shrink-0" />
                              <span className="line-clamp-1">{reason}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="w-[100px]">
                        {lead.type === "post" && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={(lead.data as RedditPost).url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {lead.type === "subreddit" && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`https://reddit.com/r/${(lead.data as { subreddit: string }).subreddit}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredLeads.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Rows per page:
                  </span>
                  <Select
                    value={rowsPerPage.toString()}
                    onValueChange={(v) => {
                      setRowsPerPage(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <ChevronLeft className="h-4 w-4 -ml-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <ChevronRight className="h-4 w-4 -ml-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
