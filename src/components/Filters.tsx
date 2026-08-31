import type { ComponentType, ReactNode } from "react";
import { Search, Layout, Activity, Flag, Shield, Tag, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
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
  subreddits: string[];
  segments: string[];
  onOpenSettings?: () => void;
  /** Rendered on the right of the search row (e.g. counts + export/import actions) */
  rightSlot?: ReactNode;
}

/**
 * A filter dropdown trigger with a leading icon and a value that truncates
 * inside the box, so the chevron always stays within the button bounds.
 */
function FilterTrigger({
  icon: Icon,
  placeholder,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  placeholder: string;
  className?: string;
}) {
  return (
    <SelectTrigger
      className={cn(
        "h-8 min-w-0 overflow-hidden rounded-lg border-border/40 bg-background/40 px-2.5 text-[10px] font-bold uppercase tracking-tight transition-all hover:bg-background/80",
        className,
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <Icon className="h-3 w-3 shrink-0 text-primary/50" />
        <span className="min-w-0 flex-1 truncate text-left">
          <SelectValue placeholder={placeholder} />
        </span>
      </span>
    </SelectTrigger>
  );
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
  subreddits,
  segments,
  onOpenSettings,
  rightSlot,
}: FiltersProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      {/* Row 1: search + right-side actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-[200px] group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30 group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110" />
          <Input
            placeholder="Search posts or subreddits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 bg-background/40 border-border/40 focus:bg-background focus:ring-2 focus:ring-primary/10 transition-all duration-300 text-xs rounded-lg shadow-sm"
          />
        </div>
        {rightSlot && (
          <div className="flex shrink-0 items-center gap-2">{rightSlot}</div>
        )}
      </div>

      {/* Row 2: filter dropdowns - wrap cleanly on their own line */}
      <div className="flex flex-wrap items-center gap-2 [&>*]:shrink-0">
        <Select value={subredditFilter} onValueChange={setSubredditFilter}>
          <FilterTrigger icon={Layout} placeholder="Community" className="w-[168px]" />
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
          <FilterTrigger icon={Flag} placeholder="Relevance" className="w-[150px]" />
          <SelectContent className="rounded-xl border-border/40 backdrop-blur-xl min-w-[140px]">
            <SelectItem value="all" className="text-[10px] font-bold uppercase">
              All Relevance
            </SelectItem>
            <SelectItem value="high" className="text-[10px] font-bold uppercase">
              High (80%+)
            </SelectItem>
            <SelectItem value="medium" className="text-[10px] font-bold uppercase">
              Medium (60-79%)
            </SelectItem>
            <SelectItem value="low" className="text-[10px] font-bold uppercase">
              Low (&lt;60%)
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <FilterTrigger icon={Shield} placeholder="Status" className="w-[140px]" />
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
            <SelectItem value="replied" className="text-[10px] font-bold uppercase">
              Replied
            </SelectItem>
            <SelectItem value="closed" className="text-[10px] font-bold uppercase">
              Closed
            </SelectItem>
            <SelectItem value="ignored" className="text-[10px] font-bold uppercase">
              Ignored
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={engagementFilter} onValueChange={setEngagementFilter}>
          <FilterTrigger
            icon={Activity}
            placeholder="Engagement"
            className="w-[168px]"
          />
          <SelectContent className="rounded-xl border-border/40 backdrop-blur-xl min-w-[150px]">
            <SelectItem value="all" className="text-[10px] font-bold uppercase">
              Any Engagement
            </SelectItem>
            <SelectItem value="engaged" className="text-[10px] font-bold uppercase">
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
          <FilterTrigger
            icon={Tag}
            placeholder={segments.length === 0 ? "Add segment" : "Segment"}
            className="w-[150px]"
          />
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
    </div>
  );
}
