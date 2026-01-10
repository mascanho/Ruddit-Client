import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SortType } from "./types";
import { Search, Flame, TrendingUp, Clock } from "lucide-react";

interface SearchBarProps {
    query: string;
    setQuery: (query: string) => void;
    handleSearch: () => void;
    isSearching: boolean;
    selectedSorts: SortType[];
    toggleSort: (sort: SortType) => void;
}

export function SearchBar({
    query,
    setQuery,
    handleSearch,
    isSearching,
    selectedSorts,
    toggleSort,
}: SearchBarProps) {
    return (
        <Card className="p-3 shadow-sm border-border/60 bg-white backdrop-blur-sm">
            <div className="flex items-center gap-3">
                {/* Search Input - Main Focus */}
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Search global subreddits, keywords, or topics..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-9 h-9 bg-background/80 border-border/60 focus:ring-1 focus:ring-primary/20 transition-all text-sm"
                    />
                </div>

                <Button
                    onClick={handleSearch}
                    disabled={isSearching || !query.trim()}
                    className="px-4 h-9 font-bold uppercase text-[11px] tracking-wider shadow-sm hover:shadow transition-all active:scale-95"
                >
                    {isSearching ? (
                        <div className="flex items-center gap-2">
                            <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Running
                        </div>
                    ) : (
                        "Search"
                    )}
                </Button>

                {/* Vertical Divider */}
                <div className="h-6 w-px bg-border/60 mx-1" />

                {/* Sort Selection - Sectioned */}
                <div className="flex items-center gap-1.5 p-1 bg-muted/30 rounded-lg border border-border/40">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground/60 px-1">
                        Source:
                    </span>
                    {(["hot", "top", "new"] as SortType[]).map((sort) => (
                        <Button
                            key={sort}
                            variant={selectedSorts.includes(sort) ? "default" : "ghost"}
                            size="sm"
                            onClick={() => toggleSort(sort)}
                            disabled={isSearching}
                            className={`h-7 px-3 text-[10px] font-bold uppercase tracking-tight transition-all ${selectedSorts.includes(sort)
                                    ? "shadow-sm"
                                    : "opacity-60 hover:opacity-100 hover:bg-background/80"
                                }`}
                        >
                            {sort === "hot" && <Flame className="h-3 w-3 mr-1.5" />}
                            {sort === "top" && <TrendingUp className="h-3 w-3 mr-1.5" />}
                            {sort === "new" && <Clock className="h-3 w-3 mr-1.5" />}
                            {sort}
                        </Button>
                    ))}
                </div>
            </div>
        </Card>
    );
}
