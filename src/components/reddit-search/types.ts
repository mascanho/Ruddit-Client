export type SearchResult = {
    id: string;
    title: string;
    subreddit: string;
    url: string;
    relevance_score: number;
    sort_type: string;
    snippet: string;
    timestamp?: number;
    formatted_date?: string;
    score?: number;
    num_comments?: number;
    author?: string;
    is_self?: boolean;
    name?: string;
    selftext?: string | null;
    thumbnail?: string | null;
    intent?: string;
    category?: "brand" | "competitor" | "general";
    permalink?: string;
    date_added?: number;
};

export type SortType = "hot" | "top" | "new";
