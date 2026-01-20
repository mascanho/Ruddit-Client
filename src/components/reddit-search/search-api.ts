import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import type { PostDataWrapper } from "@/store/store";
import type { SearchResult, SortType } from "./types";
import { categorizePost } from "@/lib/marketing-utils";

export interface SearchParams {
    query: string;
    sortTypes: SortType[];
    brandKeywords: string[];
    competitorKeywords: string[];
    blacklistSubreddits?: string[];
}

export async function performSearch(
    params: SearchParams
): Promise<SearchResult[]> {
    try {
        const fetchedPosts: PostDataWrapper[] = await invoke("get_reddit_results", {
            sortTypes: params.sortTypes,
            query: params.query.trim(),
        });

        const filteredPosts = params.blacklistSubreddits
            ? fetchedPosts.filter(
                (post) =>
                    !params.blacklistSubreddits!.some(
                        (sub) => post.subreddit?.toLowerCase() === sub.toLowerCase()
                    )
            )
            : fetchedPosts;

        return mapPostsToResults(
            filteredPosts,
            params.brandKeywords,
            params.competitorKeywords
        );
    } catch (error) {
        console.error("Search error:", error);
        toast.error(`Search failed: ${error}`);
        throw error;
    }
}

export async function fetchAllSearchedPosts(
    brandKeywords: string[],
    competitorKeywords: string[]
): Promise<SearchResult[]> {
    try {
        const fetchedPosts: PostDataWrapper[] = await invoke(
            "get_all_searched_posts"
        );
        return mapPostsToResults(fetchedPosts, brandKeywords, competitorKeywords);
    } catch (error) {
        console.error("Error fetching posts:", error);
        throw error;
    }
}

function mapPostsToResults(
    posts: PostDataWrapper[],
    brandKeywords: string[],
    competitorKeywords: string[]
): SearchResult[] {
    return posts.map((post) => ({
        id: post.id.toString(),
        title: post.title,
        subreddit: post.subreddit,
        url: post.url,
        relevance_score: post.relevance_score,
        sort_type: post.sort_type,
        snippet: post.selftext
            ? post.selftext.slice(0, 200) +
            (post.selftext.length > 200 ? "..." : "")
            : "",
        timestamp: post.timestamp,
        formatted_date: post.formatted_date,
        score: post.score,
        num_comments: post.num_comments,
        author: post.author,
        is_self: post.is_self,
        name: post.name,
        selftext: post.selftext,
        thumbnail: post.thumbnail,
        intent: post.intent,
        permalink: post.permalink,
        interest: post.interest,
        category: categorizePost(post.title, brandKeywords, competitorKeywords),
    }));
}
