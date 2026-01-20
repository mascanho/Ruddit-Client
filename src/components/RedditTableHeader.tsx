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
    <TableHeader className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <TableRow className="hover:bg-transparent border-none h-10">
        <TableHead className="w-[32px] px-2 text-center border-b border-border/50">
          <Notebook className="h-3.5 w-3.5 mx-auto text-muted-foreground/30 hover:text-primary transition-colors cursor-help" />
        </TableHead>
        <TableHead className="w-[30px] px-1 text-center font-mono text-[9px] uppercase tracking-tighter text-muted-foreground/40 border-b border-border/50">
          ID
        </TableHead>
        <TableHead className="w-[75px] px-2 border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full px-1 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-between"
            onClick={() => onSort("formatted_date")}
          >
            Date
            <ArrowUpDown className="h-2.5 w-2.5 opacity-20" />
          </Button>
        </TableHead>
        <TableHead className="px-2 border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-1 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-all flex items-center gap-1.5"
            onClick={() => onSort("title")}
          >
            Intelligence Feed
            <ArrowUpDown className="h-2.5 w-2.5 opacity-20" />
          </Button>
        </TableHead>
        <TableHead className="w-[160px] px-2 text-center border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full px-1 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-between"
            onClick={() => onSort("subreddit")}
          >
            Source
            <ArrowUpDown className="h-2.5 w-2.5 opacity-20" />
          </Button>
        </TableHead>
        <TableHead className="w-[95px] px-2 text-center text-[9px] uppercase font-black tracking-widest text-muted-foreground/40 border-b border-border/50">
          Workflow
        </TableHead>
        <TableHead className="w-[40px] px-2 text-center border-b border-border/50">
          <CheckCircle2 className="h-3.5 w-3.5 mx-auto text-muted-foreground/30" />
        </TableHead>
        <TableHead className="w-[45px] px-2 text-center text-[9px] uppercase font-black tracking-widest text-muted-foreground/40 border-b border-border/50">
          Lead
        </TableHead>
        <TableHead className="w-[70px] px-2 text-center text-[9px] uppercase font-black tracking-widest text-muted-foreground/40 border-b border-border/50">
          Segment
        </TableHead>
        <TableHead className="w-[60px] px-2 text-center text-[9px] uppercase font-black tracking-widest text-muted-foreground/40 border-b border-border/50">
          Intent
        </TableHead>
        <TableHead className="w-[85px] px-2 text-center text-[9px] uppercase font-black tracking-widest text-muted-foreground/40 border-b border-border/50">
          Tone
        </TableHead>
        <TableHead className="w-[80px] px-2 text-center border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full px-1 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-between"
            onClick={() => onSort("interest")}
          >
            Score
            <ArrowUpDown className="h-2.5 w-2.5 opacity-20" />
          </Button>
        </TableHead>
        <TableHead className="w-[45px] px-2 text-center text-[9px] uppercase font-black tracking-widest text-muted-foreground/40 border-b border-border/50">
          Ops
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}