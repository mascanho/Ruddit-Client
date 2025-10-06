"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { StatsOverview } from "@/components/stats-overview";
import { MentionsChart } from "@/components/mentions-chart";
import { SubredditsList } from "@/components/subreddits-list";
import { MentionsFeed } from "@/components/mentions-feed";
import { ConfigModal } from "@/components/config-modal";
import { AIAnalysisModal } from "@/components/ai-analysis-modal";

export default function RedditTrackerPage() {
  const [keywords, setKeywords] = useState<string[]>([
    "AI",
    "machine learning",
    "GPT",
  ]);
  const [dateRange, setDateRange] = useState({
    from: "2025-01-01",
    to: "2025-02-10",
  });
  const [crawlFrequency, setCrawlFrequency] = useState("hourly");

  return (
    <section className="h-full overflow-hidden">
      <Header>
        <div className="flex  gap-2">
          <AIAnalysisModal />
          <ConfigModal
            keywords={keywords}
            setKeywords={setKeywords}
            dateRange={dateRange}
            setDateRange={setDateRange}
            crawlFrequency={crawlFrequency}
            setCrawlFrequency={setCrawlFrequency}
          />
        </div>
      </Header>

      <main className="mx-auto px-4 py-4 space-y-4 ">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-20">
          <div className="lg:col-span-2 space-y-4">
            <StatsOverview />
            <StatsOverview />
            <MentionsChart />
          </div>
          <div>
            <SubredditsList />
          </div>
        </div>

        <MentionsFeed />
      </main>
    </section>
  );
}
