import {
  Search,
  Filter,
  Layout,
  Activity,
  Flag,
  Shield,
  Smile,
  Tag,
  PlusCircle,
} from "lucide-react";
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
      <div className="relative flex-1 min-w-[200px] max-w-md group">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30 group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110" />
        <Input
          placeholder="Search through intelligence..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 bg-background/40 border-border/40 focus:bg-background focus:ring-2 focus:ring-primary/10 transition-all duration-300 text-xs rounded-lg shadow-sm"
        />
      </div>

      {/* Filter Dropdowns - Grouped together */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={subredditFilter} onValueChange={setSubredditFilter}>
          <SelectTrigger className="w-40 h-8 text-[10px] font-bold uppercase tracking-tight bg-background/40 border-border/40 hover:bg-background/80 transition-all rounded-lg">
            <div className="flex items-center gap-2">
              <Layout className="h-3 w-3 text-primary/50" />
              <SelectValue placeholder="Community" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/40 backdrop-blur-xl min-w-[160px]">
            <SelectItem value="all" className="text-[10px] font-bold uppercase">
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
          <SelectTrigger className="w-[130px] h-8 text-[10px] font-bold uppercase tracking-tight bg-background/40 border-border/40 hover:bg-background/80 transition-all rounded-lg">
            <div className="flex items-center gap-2">
              <Flag className="h-3 w-3 text-primary/50" />
              <SelectValue placeholder="Intent" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/40 backdrop-blur-xl min-w-[120px]">
            <SelectItem
              value="all"
              className="text-[10px] font-bold uppercase w-full"
            >
              All Intent
            </SelectItem>
            <SelectItem
              value="high"
              className="text-[10px] font-bold uppercase"
            >
              High Intent
            </SelectItem>
            <SelectItem
              value="medium"
              className="text-[10px] font-bold uppercase"
            >
              Medium Intent
            </SelectItem>
            <SelectItem value="low" className="text-[10px] font-bold uppercase">
              Low Intent
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-[10px] font-bold uppercase tracking-tight bg-background/40 border-border/40 hover:bg-background/80 transition-all rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3 text-primary/50" />
              <SelectValue placeholder="Status" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/40 backdrop-blur-xl min-w-[140px]">
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
          <SelectTrigger className="w-[160px] h-8 text-[10px] font-bold uppercase tracking-tight bg-background/40 border-border/40 hover:bg-background/80 transition-all rounded-lg">
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-primary/50" />
              <SelectValue placeholder="Engagement" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/40 backdrop-blur-xl min-w-[140px]">
            <SelectItem value="all" className="text-[10px] font-bold uppercase">
              Any Engagement
            </SelectItem>
            <SelectItem
              value="engaged"
              className="text-[10px] font-bold uppercase"
            >
              Engaged
            </SelectItem>
            <SelectItem
              value="not_engaged"
              className="text-[10px] font-bold uppercase"
            >
              Not Engaged
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={toneFilter} onValueChange={setToneFilter}>
          <SelectTrigger className="w-[130px] h-8 text-[10px] font-bold uppercase tracking-tight bg-background/40 border-border/40 hover:bg-background/80 transition-all rounded-lg">
            <div className="flex items-center gap-2">
              <Smile className="h-3 w-3 text-primary/50" />
              <SelectValue placeholder="Tone" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/40 backdrop-blur-xl min-w-[120px]">
            <SelectItem value="all" className="text-[10px] font-bold uppercase">
              All Tones
            </SelectItem>
            <SelectItem
              value="positive"
              className="text-[10px] font-bold uppercase text-green-600"
            >
              Positive
            </SelectItem>
            <SelectItem
              value="neutral"
              className="text-[10px] font-bold uppercase"
            >
              Neutral
            </SelectItem>
            <SelectItem
              value="negative"
              className="text-[10px] font-bold uppercase text-red-600"
            >
              Negative
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={segmentFilter}
          onValueChange={(value) => {
            if (value === "add_segment") {
              onOpenSettings?.();
              return;
            }
            setSegmentFilter(value);
          }}
        >
          <SelectTrigger className="w-[145px] h-8 text-[10px] font-bold uppercase tracking-tight bg-background/40 border-border/40 hover:bg-background/80 transition-all rounded-lg">
            <div className="flex items-center gap-2">
              <Tag className="h-3 w-3 text-primary/50" />
              <SelectValue
                placeholder={segments.length === 0 ? "Add segment" : "Segment"}
              />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/40 backdrop-blur-xl min-w-[140px]">
            <SelectItem value="all" className="text-[10px] font-bold uppercase">
              Any Segment
            </SelectItem>
            {segments.map((segment) => (
              <SelectItem
                key={segment}
                value={segment}
                className="text-[10px] font-bold uppercase"
              >
                {segment}
              </SelectItem>
            ))}
            <SelectItem
              value="add_segment"
              className="text-[10px] font-bold text-blue-600 border-t border-border/50 mt-1 pt-2"
            >
              <div className="flex items-center gap-1.5">
                <PlusCircle className="h-3 w-3" />
                <span>Add segment</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
