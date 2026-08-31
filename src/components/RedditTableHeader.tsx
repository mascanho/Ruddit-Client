/**
 * TableHeader component for the Reddit Table
 * Contains the table header with sortable columns
 */

import { ArrowUpDown, Notebook, CheckCircle2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SortField } from "./reddit-table-types";

interface TableHeaderProps {
  onSort: (field: SortField) => void;
}

/** Shared label styling so every header column reads the same. */
const LABEL =
  "text-[10px] uppercase font-bold tracking-wide text-muted-foreground/70";

function SortHeader({
  field,
  label,
  onSort,
  align = "center",
}: {
  field: SortField;
  label: string;
  onSort: (field: SortField) => void;
  align?: "center" | "start";
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-7 px-1.5 ${LABEL} hover:text-primary hover:bg-primary/5 transition-all inline-flex items-center gap-1 ${
        align === "start" ? "justify-start" : "w-full justify-center"
      }`}
      onClick={() => onSort(field)}
    >
      {label}
      <ArrowUpDown className="h-2.5 w-2.5 shrink-0 opacity-30" />
    </Button>
  );
}

export function RedditTableHeader({ onSort }: TableHeaderProps) {
  return (
    <TableHeader className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <TableRow className="hover:bg-transparent border-none h-10">
        <TableHead
          title="Notes — a dot marks posts that have notes"
          className="px-2 text-center border-b border-border/50"
        >
          <Notebook className="h-3.5 w-3.5 mx-auto text-muted-foreground/40" />
        </TableHead>
        <TableHead className="px-1 text-center font-mono text-[9px] uppercase tracking-tighter text-muted-foreground/40 border-b border-border/50">
          #
        </TableHead>
        <TableHead className="px-2 text-left border-b border-border/50">
          <SortHeader
            field="formatted_date"
            label="Date"
            onSort={onSort}
            align="start"
          />
        </TableHead>
        <TableHead className="px-2 text-left border-b border-border/50">
          <SortHeader
            field="title"
            label="Post"
            onSort={onSort}
            align="start"
          />
        </TableHead>
        <TableHead className="px-2 text-center border-b border-border/50">
          <SortHeader field="subreddit" label="Subreddit" onSort={onSort} />
        </TableHead>
        <TableHead className="px-2 text-center border-b border-border/50">
          <SortHeader
            field="relevance_score"
            label="Relevance"
            onSort={onSort}
          />
        </TableHead>
        <TableHead
          className={`px-2 text-center border-b border-border/50 ${LABEL}`}
        >
          Status
        </TableHead>
        <TableHead
          title="Engaged — have we replied to / interacted with this post?"
          className="px-2 text-center border-b border-border/50"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mx-auto text-muted-foreground/40" />
        </TableHead>
        <TableHead
          title="Owner — team member assigned to this post"
          className={`px-1 text-center border-b border-border/50 ${LABEL}`}
        >
          Owner
        </TableHead>
        <TableHead
          className={`px-2 text-center border-b border-border/50 ${LABEL}`}
        >
          Segment
        </TableHead>
        <TableHead
          className={`px-2 text-center border-b border-border/50 ${LABEL}`}
        >
          Intent
        </TableHead>
        <TableHead className="px-2 text-center border-b border-border/50">
          <SortHeader field="interest" label="Interest" onSort={onSort} />
        </TableHead>
        <TableHead
          title="Actions"
          className="px-2 text-center border-b border-border/50"
        >
          <MoreVertical className="h-3.5 w-3.5 mx-auto text-muted-foreground/40" />
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
