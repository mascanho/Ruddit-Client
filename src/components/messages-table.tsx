import { useState, useMemo, useEffect } from "react";
import moment from "moment";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  MoreVertical,
  Trash2,
  ArrowUpDown,
  X,
  MessageSquare,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Message, SearchState } from "./smart-data-tables";
import { useAppSettings } from "@/store/settings-store";
import { toast } from "sonner";

type SortField = keyof Message | null;
type SortDirection = "asc" | "desc";

export function MessagesTable({
  externalMessages = [],
  searchState,
  onSearchStateChange,
  handleClearComments,
}: {
  externalMessages?: Message[];
  searchState: SearchState;
  onSearchStateChange: (state: SearchState) => void;
  handleClearComments: () => void;
}) {
  const [data, setData] = useState<Message[]>(externalMessages);
  const { settings } = useAppSettings();

  useEffect(() => {
    const existingIds = new Set(data.map((m) => m.id));
    const newMessages = externalMessages.filter((m) => !existingIds.has(m.id));
    if (newMessages.length > 0) {
      setData((prev) => [...prev, ...newMessages]);

      toast.success(`${newMessages.length} new message${newMessages.length > 1 ? "s" : ""} added to Messages`);
    }
  }, [externalMessages]);

  const searchQuery = searchState.messagesSearch;
  const setSearchQuery = (value: string) =>
    onSearchStateChange({ ...searchState, messagesSearch: value });

  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(settings.rowsPerPage);

  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((message) => {
      const matchesSearch =
        message?.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message?.body?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message?.id?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });

    if (sortField) {
      filtered.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return 0;
      });
    }

    return filtered;
  }, [data, searchQuery, sortField, sortDirection]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const paginatedData = useMemo(() => {
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, startIndex, endIndex]);

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleDelete = (id: string) => {
    if (!settings.confirmDelete) {
      setData(data.filter((message) => message.id !== id));
      return;
    }
    setData(data.filter((message) => message.id !== id));
    setDeleteId(null);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSortField(null);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || sortField;

  return (
    <>
      <div className="flex-1 flex flex-col gap-3 min-h-0 animate-in fade-in duration-500">
        {/* Search & Filter Card */}
        <Card className="p-3 shadow-sm border-border/60 bg-background/50 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 group w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search by username, message, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-background/80 border-border/60 focus:ring-1 focus:ring-primary/20 transition-all text-xs"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={handleClearComments}
                variant="outline"
                size="sm"
                className="h-9 px-4 text-[11px] font-bold uppercase tracking-wider border-destructive/30 text-destructive/80 hover:bg-destructive hover:text-white transition-all shadow-sm"
              >
                Flush All
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFilters}
                  className="h-9 w-9 opacity-50 hover:opacity-100 transition-all"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Main Table Container */}
        <Card className="p-0 border-border/60 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-auto relative custom-scroll">
            <Table className="table-fixed w-full border-separate border-spacing-0">
              <colgroup>
                <col className="w-[45px]" />
                <col className="w-[150px]" />
                <col className="w-[200px]" />
                <col />
                <col className="w-[120px]" />
                <col className="w-[90px]" />
                <col className="w-[60px]" />
              </colgroup>
              <TableHeader className="sticky top-0 z-40 bg-background shadow-sm">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="sticky top-0 h-9 px-2 text-center bg-background/95 backdrop-blur-md z-40 border-b border-border/50 font-mono text-[10px] uppercase tracking-wider opacity-50">#</TableHead>
                  <TableHead className="sticky top-0 h-9 px-2 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-full px-1 text-[10px] uppercase font-bold tracking-tight opacity-70 hover:opacity-100 hover:bg-accent/50 transition-all flex items-center justify-between"
                      onClick={() => handleSort("username")}
                    >
                      User
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    </Button>
                  </TableHead>
                  <TableHead className="sticky top-0 h-9 px-2 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-full px-1 text-[10px] uppercase font-bold tracking-tight opacity-70 hover:opacity-100 hover:bg-accent/50 transition-all flex items-center justify-between"
                      onClick={() => handleSort("message")}
                    >
                      Topic Reference
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    </Button>
                  </TableHead>
                  <TableHead className="sticky top-0 h-9 px-2 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
                    <span className="text-[10px] uppercase font-bold tracking-tight opacity-50 px-1">Message Content</span>
                  </TableHead>
                  <TableHead className="sticky top-0 h-9 px-2 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-full px-1 text-[10px] uppercase font-bold tracking-tight opacity-70 hover:opacity-100 hover:bg-accent/50 transition-all flex items-center justify-between"
                      onClick={() => handleSort("id")}
                    >
                      Context
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    </Button>
                  </TableHead>
                  <TableHead className="sticky top-0 h-9 px-2 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-full px-1 text-[10px] uppercase font-bold tracking-tight opacity-70 hover:opacity-100 hover:bg-accent/50 transition-all flex items-center justify-between"
                      onClick={() => handleSort("date")}
                    >
                      Logged
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    </Button>
                  </TableHead>
                  <TableHead className="sticky top-0 h-9 px-2 text-center bg-background/95 backdrop-blur-md z-40 border-b border-border/50 font-mono text-[10px] uppercase tracking-wider opacity-50">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-[11px] font-bold uppercase tracking-widest opacity-30"
                    >
                      Null Buffer: No Messages
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((message, index) => (
                    <TableRow
                      key={message.id}
                      className="group h-9 hover:bg-accent/30 transition-colors border-b border-border/40"
                    >
                      <TableCell className="text-center font-mono text-[10px] opacity-30">
                        {(currentPage - 1) * rowsPerPage + index + 1}
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-primary">
                              {message?.author?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-bold text-[11px] truncate text-foreground/80">
                            {message?.author}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="text-[10px] opacity-60 line-clamp-1 italic font-medium">
                          {message?.post_title || "Direct Message"}
                        </div>
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="text-[11px] font-medium line-clamp-1 leading-relaxed text-foreground/90">
                          {message?.body}
                        </div>
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <Badge
                            variant="outline"
                            className="font-mono text-[9px] py-0 h-4 px-1.5 bg-background/50 border-muted-foreground/10 truncate max-w-[80px]"
                          >
                            r/{message?.subreddit}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleCopyId(message?.id)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 text-center font-mono text-[10px] opacity-60">
                        {moment(message?.formatted_date).format("DD.MM.YY")}
                      </TableCell>
                      <TableCell className="px-1 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-40 hover:opacity-100"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              className="text-[11px] font-bold uppercase tracking-tight"
                              onClick={() => setSelectedMessage(message)}
                            >
                              <MessageSquare className="mr-2 h-3.5 w-3.5" />
                              Expand View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[11px] font-bold uppercase tracking-tight"
                              onClick={() => handleCopyId(message.id)}
                            >
                              <Copy className="mr-2 h-3.5 w-3.5" />
                              Registry ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteId(message.id)}
                              className="text-[11px] font-bold uppercase tracking-tight text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Purge Record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer Pagination */}
          {filteredAndSortedData.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 bg-muted/10 border-t backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Page Size:</span>
                  <select
                    className="bg-transparent border-none text-[11px] font-semibold text-primary focus:ring-0 cursor-pointer p-0 h-auto"
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    {[10, 25, 50, 100].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase opacity-40">
                  Nodes {startIndex + 1}—{Math.min(endIndex, filteredAndSortedData.length)} total
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-50 hover:opacity-100 transition-all active:scale-90"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <ChevronLeft className="h-4 w-4 -ml-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-50 hover:opacity-100 transition-all active:scale-90"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-primary/5 border border-primary/20">
                  <span className="text-[11px] font-bold text-primary font-mono">{currentPage}</span>
                  <span className="text-[10px] font-bold text-primary opacity-40">/</span>
                  <span className="text-[11px] font-bold text-primary font-mono">{totalPages}</span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-50 hover:opacity-100 transition-all active:scale-90"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-50 hover:opacity-100 transition-all active:scale-90"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                  <ChevronRight className="h-4 w-4 -ml-3" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {settings.confirmDelete && (
        <AlertDialog
          open={deleteId !== null}
          onOpenChange={() => setDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                message from your data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && handleDelete(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog
        open={selectedMessage !== null}
        onOpenChange={() => setSelectedMessage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Message Details</AlertDialogTitle>
          </AlertDialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Username
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {selectedMessage?.author?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-medium">{selectedMessage?.author}</span>
                </div>
              </div>
              {selectedMessage.source && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Source
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {selectedMessage.source}
                  </Badge>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Message
                </div>
                <div className="text-sm bg-muted p-3 rounded-md">
                  {selectedMessage.message}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Message ID
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    {selectedMessage.id}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyId(selectedMessage.id)}
                  >
                    <Copy className="mr-2 h-3 w-3" />
                    Copy
                  </Button>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Date
                </div>
                <div className="text-sm font-mono">{selectedMessage.date}</div>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSelectedMessage(null)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
