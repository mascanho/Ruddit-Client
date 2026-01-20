/**
 * Filters component for the Reddit Table
 * Contains search input and filter dropdowns
 */

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  subredditFilter: string;
  setSubredditFilter: (value: string) => void;
  relevanceFilter: string;
  setRelevanceFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  engagementFilter: string;
  setEngagementFilter: (value: string) => void;
  segmentFilter: string;
  setSegmentFilter: (value: string) => void;
  toneFilter: string;
  setToneFilter: (value: string) => void;
  subreddits: string[];
  segments: string[];
  onOpenSettings?: () => void;
}

export function Filters({
  searchQuery,
  setSearchQuery,
  subredditFilter,
  setSubredditFilter,
  relevanceFilter,
  setRelevanceFilter,
  statusFilter,
  setStatusFilter,
  engagementFilter,
  setEngagementFilter,
  segmentFilter,
  setSegmentFilter,
  toneFilter,
  setToneFilter,
  subreddits,
  segments,
  onOpenSettings,
}: FiltersProps) {
  return (
    <>
      {/* Search Input - Expands to fill space */}
      <div className="relative flex-1 min-w-[300px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-7 h-7 bg-background/80 border-border/60 focus:ring-1 focus:ring-primary/20 transition-all text-xs"
        />
      </div>

      {/* Filter Dropdowns - Grouped together */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={subredditFilter} onValueChange={setSubredditFilter}>
          <SelectTrigger className="w-36 h-6 text-[10px] font-bold uppercase tracking-tight bg-background/50">
            <SelectValue placeholder="Community" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              value="all"
              className="text-[10px] font-bold uppercase w-[300px]"
            >
              All r/subreddits
            </SelectItem>
            {subreddits.map((subreddit) => (
              <SelectItem
                key={subreddit}
                value={subreddit}
                className="text-[10px] font-bold"
              >
                r/{subreddit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={relevanceFilter} onValueChange={setRelevanceFilter}>
          <SelectTrigger className="w-[110px] h-7 text-[10px] font-bold uppercase tracking-tight bg-background/50">
            <SelectValue placeholder="Intent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px] font-bold uppercase">
              All Intent
            </SelectItem>
            <SelectItem
              value="high"
              className="text-[10px] font-bold uppercase"
            >
              High
            </SelectItem>
            <SelectItem
              value="medium"
              className="text-[10px] font-bold uppercase"
            >
              Medium
            </SelectItem>
            <SelectItem value="low" className="text-[10px] font-bold uppercase">
              Low
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[110px] h-7 text-[10px] font-bold uppercase tracking-tight bg-background/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px] font-bold uppercase">
              All Status
            </SelectItem>
            <SelectItem value="new" className="text-[10px] font-bold uppercase">
              New
            </SelectItem>
            <SelectItem
              value="investigating"
              className="text-[10px] font-bold uppercase"
            >
              Research
            </SelectItem>
            <SelectItem
              value="replied"
              className="text-[10px] font-bold uppercase"
            >
              Replied
            </SelectItem>
            <SelectItem
              value="closed"
              className="text-[10px] font-bold uppercase"
            >
              Closed
            </SelectItem>
            <SelectItem
              value="ignored"
              className="text-[10px] font-bold uppercase"
            >
              Ignored
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={engagementFilter} onValueChange={setEngagementFilter}>
          <SelectTrigger className="w-[140px] h-7 text-[10px] font-bold uppercase tracking-tight bg-background/50">
            <SelectValue placeholder="Engagement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Engagement</SelectItem>
            <SelectItem value="engaged">Engaged</SelectItem>
            <SelectItem value="not_engaged">Not Engaged</SelectItem>
          </SelectContent>
        </Select>

        <Select value={toneFilter} onValueChange={setToneFilter}>
          <SelectTrigger className="w-[110px] h-7 text-[10px] font-bold uppercase tracking-tight bg-background/50">
            <SelectValue placeholder="Tone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px] font-bold uppercase">
              All Tones
            </SelectItem>
            <SelectItem value="positive" className="text-[10px] font-bold uppercase text-green-600">
              Positive
            </SelectItem>
            <SelectItem value="neutral" className="text-[10px] font-bold uppercase">
              Neutral
            </SelectItem>
            <SelectItem value="negative" className="text-[10px] font-bold uppercase text-red-600">
              Negative
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={segmentFilter} onValueChange={(value) => {
          if (value === "add_segment") {
            // Open settings modal to add segments
            onOpenSettings?.();
            return;
          }
          setSegmentFilter(value);
        }}>
          <SelectTrigger className="w-[120px] h-7 text-[10px] font-bold uppercase tracking-tight bg-background/50">
            <SelectValue placeholder={segments.length === 0 ? "Add segment" : "Segment"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px] font-bold uppercase">
              Any Segment
            </SelectItem>
            {segments.map((segment) => (
              <SelectItem
                key={segment}
                value={segment}
                className="text-[10px] font-bold"
              >
                {segment}
              </SelectItem>
            ))}
            <SelectItem
              value="add_segment"
              className="text-[10px] font-bold text-blue-600 border-t border-border/50 mt-1 pt-2"
            >
              + Add segment
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

