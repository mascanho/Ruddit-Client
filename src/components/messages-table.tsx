// @ts-nocheck
"use client";

import { useState, useMemo, useEffect } from "react";
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
import { useAppSettings } from "./app-settings";

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

      toast({
        title: "New messages added",
        description: `${newMessages.length} new message${newMessages.length > 1 ? "s" : ""} added to Messages`,
        duration: 3000,
      });
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
        message?.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message?.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message?.id.toLowerCase().includes(searchQuery.toLowerCase());

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

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, currentPage, rowsPerPage]);

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
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 flex space-x-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username, message, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              <Button onClick={handleClearComments} variant="destructive">
                Clear Messages
              </Button>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedData.length} of {data.length} messages
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] bg-background sticky top-0 z-10">
                    #
                  </TableHead>
                  <TableHead className="w-[200px] bg-background sticky top-0 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("username")}
                    >
                      Username
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[300px] bg-background sticky top-0 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("message")}
                    >
                      Topic
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[300px] bg-background sticky top-0 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("message")}
                    >
                      Message
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[180px] bg-background sticky top-0 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("id")}
                    >
                      subreddit
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[110px] bg-background sticky top-0 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("date")}
                    >
                      Date
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[70px] bg-background sticky top-0 z-10">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
          <Table>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No messages found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((message, index) => (
                  <TableRow
                    key={message.id}
                    className={`group ${settings.tableDensity === "compact" ? "h-10" : settings.tableDensity === "spacious" ? "h-16" : "h-12"}`}
                  >
                    <TableCell className="text-muted-foreground text-sm font-medium w-[60px]">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="w-[200px]">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {message?.author.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate">
                            {message?.author}
                          </span>
                          {message.source && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {message?.id}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[300px]">
                      <div className="line-clamp-2 text-sm">
                        {message?.post_title?.slice(0, 100)}
                        {message?.post_title?.length > 100 && "..."}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[300px]">
                      <div className="line-clamp-2 text-sm">
                        {message?.body?.slice(0, 100)}
                        {message?.body?.length > 100 && "..."}
                      </div>
                    </TableCell>
                    <TableCell className="w-[180px]">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs"
                        >
                          {message?.subreddit}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleCopyId(message?.id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm w-[110px]">
                      {message?.formatted_date.slice(0, 10)}
                    </TableCell>
                    <TableCell className="w-[70px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setSelectedMessage(message)}
                          >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            View Full Message
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCopyId(message.id)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy ID
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteId(message.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
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

        {filteredAndSortedData.length > 0 && (
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
                      {selectedMessage?.author.charAt(0).toUpperCase()}
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
