/**
 * TableHeader component for the Reddit Table
 * Contains the table header with sortable columns
 */

import { ArrowUpDown, Notebook, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SortField } from "./reddit-table-types";

interface TableHeaderProps {
  onSort: (field: SortField) => void;
}

export function RedditTableHeader({ onSort }: TableHeaderProps) {
  return (
    <TableHeader className="sticky top-0 z-40 bg-background shadow-sm">
      <TableRow className="hover:bg-transparent border-none">
        <TableHead className="sticky top-0 h-9 px-2 text-center bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
          <Notebook className="h-3.5 w-3.5 mx-auto opacity-40" />
        </TableHead>
        <TableHead className="sticky top-0 h-9 px-1 text-center font-mono text-[10px] uppercase tracking-wider opacity-50 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
          #
        </TableHead>
        <TableHead className="sticky top-0 h-9 px-2 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full px-1 text-[10px] uppercase font-bold tracking-tight opacity-70 hover:opacity-100 hover:bg-accent/50 transition-all flex items-center justify-between"
            onClick={() => onSort("formatted_date")}
          >
            Date
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          </Button>
        </TableHead>
        <TableHead className="sticky top-0 h-9 px-2 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-1 text-[10px] uppercase font-bold tracking-tight opacity-70 hover:opacity-100 hover:bg-accent/50 transition-all flex items-center gap-1"
            onClick={() => onSort("title")}
          >
            Post Content
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          </Button>
        </TableHead>
        <TableHead className="sticky top-0 h-9 px-2 text-center bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full px-1 text-[10px] uppercase font-bold tracking-tight opacity-70 hover:opacity-100 hover:bg-accent/50 transition-all flex items-center justify-between"
            onClick={() => onSort("subreddit")}
          >
            Subreddit
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          </Button>
        </TableHead>
        <TableHead className="sticky top-0 h-9 px-2 text-center text-[10px] uppercase font-bold tracking-tight opacity-50 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
          Status
        </TableHead>
        <TableHead className="sticky top-0 h-9 px-2 text-center text-[10px] uppercase font-bold tracking-tight opacity-50 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
          <CheckCircle2 className="h-3.5 w-3.5 mx-auto" />
        </TableHead>
        <TableHead className="sticky top-0 h-9 px-2 text-center text-[10px] uppercase font-bold tracking-tight opacity-50 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
          Owner
        </TableHead>
        <TableHead className="sticky top-0 h-9 px-2 text-center text-[10px] uppercase font-bold tracking-tight opacity-50 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
          Segments
        </TableHead>
        <TableHead className="sticky top-0 h-9 px-2 text-center text-[10px] uppercase font-bold tracking-tight opacity-50 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
          Intent
        </TableHead>
        <TableHead className="sticky top-0 h-9 px-2 text-center text-[10px] uppercase font-bold tracking-tight opacity-50 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
          Tone
        </TableHead>
        <TableHead className="sticky top-0 h-9 px-2 text-center bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full px-1 text-[10px] uppercase font-bold tracking-tight opacity-70 hover:opacity-100 hover:bg-accent/50 transition-all flex items-center justify-between"
            onClick={() => onSort("interest")}
          >
            Interest
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          </Button>
        </TableHead>
        <TableHead className="sticky top-0 h-9 px-2 text-center text-[10px] uppercase font-bold tracking-tight opacity-50 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
          Op
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}