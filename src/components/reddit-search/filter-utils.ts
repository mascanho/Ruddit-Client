import type { SearchResult, SortType } from "./types";

export type ViewSortType =
    | "date-desc"
    | "date-asc"
    | "score-desc"
    | "score-asc"
    | "comments-desc"
    | "comments-asc"
    | "original";

export interface FilterOptions {
    viewSort: ViewSortType;
    viewFilters: SortType[];
    viewIntentFilters: string[];
    filterQuery: string;
    blacklistUsernames?: string[];
    blacklistSubreddits?: string[];
    blacklistKeywords?: string[];
}

export function filterAndSortResults(
    results: SearchResult[],
    options: FilterOptions
): SearchResult[] {
    return [...results]
        .filter((item) => {
            // Blacklist filtering - exclude posts from blacklisted users
            if (options.blacklistUsernames && options.blacklistUsernames.length > 0) {
                const isUserBlacklisted = options.blacklistUsernames.some(
                    (user) => item.author?.toLowerCase() === user.toLowerCase()
                );
                if (isUserBlacklisted) return false;
            }

            // Blacklist filtering - exclude posts from blacklisted subreddits
            if (options.blacklistSubreddits && options.blacklistSubreddits.length > 0) {
                const isSubredditBlacklisted = options.blacklistSubreddits.some(
                    (sub) => item.subreddit?.toLowerCase() === sub.toLowerCase()
                );
                if (isSubredditBlacklisted) return false;
            }

            // Blacklist filtering - exclude posts containing blacklisted keywords
            if (options.blacklistKeywords && options.blacklistKeywords.length > 0) {
                const textToCheck = [
                    item.title || "",
                    item.selftext || "",
                ].join(" ").toLowerCase();

                const containsBlacklistedKeyword = options.blacklistKeywords.some(
                    (keyword) => textToCheck.includes(keyword.toLowerCase())
                );
                if (containsBlacklistedKeyword) return false;
            }

            const types = (item.sort_type || "").split(",");
            const sortTypeMatch = options.viewFilters.some((filter) =>
                types.includes(filter)
            );

            const intent = item.intent || "Low";
            const intentMatch = options.viewIntentFilters.some(
                (f) => f.toLowerCase() === intent.toLowerCase()
            );

            const matchesFilter = options.filterQuery
                ? (item.title || "")
                    .toLowerCase()
                    .includes(options.filterQuery.toLowerCase()) ||
                (item.subreddit || "")
                    .toLowerCase()
                    .includes(options.filterQuery.toLowerCase()) ||
                (item.selftext || "")
                    .toLowerCase()
                    .includes(options.filterQuery.toLowerCase())
                : true;

            return sortTypeMatch && intentMatch && matchesFilter;
        })
        .sort((a, b) => {
            if (options.viewSort === "original") return 0;

            if (options.viewSort.startsWith("date")) {
                const timeA = a.timestamp || 0;
                const timeB = b.timestamp || 0;
                return options.viewSort === "date-desc" ? timeB - timeA : timeA - timeB;
            }

            if (options.viewSort.startsWith("score")) {
                const scoreA = a.score || 0;
                const scoreB = b.score || 0;
                return options.viewSort === "score-desc"
                    ? scoreB - scoreA
                    : scoreA - scoreB;
            }

            if (options.viewSort.startsWith("comments")) {
                const commentsA = a.num_comments || 0;
                const commentsB = b.num_comments || 0;
                return options.viewSort === "comments-desc"
                    ? commentsB - commentsA
                    : commentsA - commentsB;
            }

            return 0;
        });
}
