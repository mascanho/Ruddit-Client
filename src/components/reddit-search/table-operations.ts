import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import type { PostDataWrapper } from "@/store/store";
import type { SearchResult } from "./types";
import { categorizePost } from "@/lib/marketing-utils";

export interface AddToTableParams {
    result: SearchResult;
    brandKeywords: string[];
    competitorKeywords: string[];
    subRedditsSaved: PostDataWrapper[];
    addSingleSubreddit: (post: PostDataWrapper) => void;
    onNotifyNewPosts: (count: number) => void;
}

export async function addResultToTable(
    params: AddToTableParams
): Promise<void> {
    try {
        const parsedId = parseInt(params.result.id, 10);

        const isClientSideDuplicate = params.subRedditsSaved.some(
            (post) => post.id === parsedId
        );

        if (isClientSideDuplicate) {
            toast.info(
                `Post "${params.result.title}" is already in your tracking table.`,
                {
                    position: "bottom-center",
                }
            );
            return;
        }

        const postData = buildPostData(
            params.result,
            parsedId,
            params.brandKeywords,
            params.competitorKeywords
        );

        const isInserted: boolean = await invoke("save_single_reddit_command", {
            post: postData,
        });

        if (!isInserted) {
            toast.info(`Post "${postData.title}" is already in your tracking table.`, {
                position: "bottom-center",
            });
            return;
        }

        params.addSingleSubreddit(postData);

        if (postData.url && postData.title && !postData.is_self) {
            await invoke("get_post_comments_command", {
                url: postData.url,
                title: postData.title,
                sortType: postData.sort_type,
                subreddit: postData.subreddit,
            });
        }

        toast.info(`Added ${postData.title} post to table`, {
            position: "bottom-center",
        });
        params.onNotifyNewPosts(1);
    } catch (err: any) {
        console.error("Error in addToTable:", err);
        toast.error(`Failed to add post: ${err.message || err}`);
    }
}

export async function addAllResultsToTable(
    results: SearchResult[],
    brandKeywords: string[],
    competitorKeywords: string[],
    subRedditsSaved: PostDataWrapper[],
    addSingleSubreddit: (post: PostDataWrapper) => void,
    onNotifyNewPosts: (count: number) => void
): Promise<void> {
    let addedCount = 0;
    let duplicateCount = 0;

    for (const result of results) {
        const parsedId = parseInt(result.id, 10);
        const postData = buildPostData(
            result,
            parsedId,
            brandKeywords,
            competitorKeywords
        );

        const isClientSideDuplicate = subRedditsSaved.some(
            (post) => post.id === postData.id
        );

        if (isClientSideDuplicate) {
            duplicateCount++;
            continue;
        }

        try {
            const isInserted: boolean = await invoke("save_single_reddit_command", {
                post: postData,
            });

            if (isInserted) {
                addSingleSubreddit(postData);
                addedCount++;
                if (
                    postData.url &&
                    postData.title &&
                    postData.sort_type &&
                    postData.subreddit
                ) {
                    await invoke("get_post_comments_command", {
                        url: postData.url,
                        title: postData.title,
                        sortType: postData.sort_type,
                        subreddit: postData.subreddit,
                    });
                }
            } else {
                duplicateCount++;
            }
        } catch (err: any) {
            console.error(`Error adding post ${postData.title}:`, err);
            toast.error(
                `Failed to add post "${postData.title}": ${err.message || err}`
            );
        }
    }

    if (addedCount > 0) {
        toast.success(`Successfully added ${addedCount} post(s) to table!`, {
            position: "bottom-center",
        });
        onNotifyNewPosts(addedCount);
    }
    if (duplicateCount > 0) {
        toast.info(
            `${duplicateCount} post(s) were already in your tracking table.`,
            {
                position: "bottom-center",
            }
        );
    }
}

function buildPostData(
    result: SearchResult,
    parsedId: number,
    brandKeywords: string[],
    competitorKeywords: string[]
): PostDataWrapper {
    return {
        id: parsedId,
        timestamp: result.timestamp || Date.now(),
        formatted_date:
            result.formatted_date || new Date().toISOString().split("T")[0],
        title: result.title,
        url: result.url,
        sort_type: result.sort_type,
        relevance_score: result.relevance_score,
        subreddit: result.subreddit,
        permalink: result.permalink || result.url,
        engaged: 0,
        assignee: "",
        notes: "",
        name: result.name || `t3_${result.id}`,
        selftext: result.selftext || "",
        author: result.author || "unknown",
        score: result.score || 0,
        thumbnail: result.thumbnail || "",
        is_self: result.is_self || false,
        num_comments: result.num_comments || 0,
        status: "new",
        intent: result.intent || "Low",
        category: categorizePost(result.title, brandKeywords, competitorKeywords),
        date_added: result.date_added || 0,
    };
}
