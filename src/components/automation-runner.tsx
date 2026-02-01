"use client";

import { useEffect, useRef } from "react";
import { useAppSettings } from "@/store/settings-store";
import { useAutomationStore, useAddSingleSubReddit, PostDataWrapper } from "@/store/store";
import { invoke } from "@tauri-apps/api/core";
import { calculateIntent, categorizePost, matchesKeyword } from "@/lib/marketing-utils";

export function AutomationRunner() {
    const { settings } = useAppSettings();
    const {
        isRunning,
        intervalMinutes,
        setLastRun,
        addLog,
        addFoundPosts,
    } = useAutomationStore();

    const automationIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Fix: Use ref to access latest settings inside setInterval closure
    const settingsRef = useRef(settings);
    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    // AUTOMATION LOGIC
    useEffect(() => {
        if (isRunning) {
            if (!automationIntervalRef.current) {
                runAutomationCycle();
                automationIntervalRef.current = setInterval(() => {
                    runAutomationCycle();
                }, intervalMinutes * 60 * 1000);
            }
        } else {
            if (automationIntervalRef.current) {
                clearInterval(automationIntervalRef.current);
                automationIntervalRef.current = null;
            }
        }

        return () => {
            if (automationIntervalRef.current) {
                clearInterval(automationIntervalRef.current);
                automationIntervalRef.current = null;
            }
        };
    }, [isRunning, intervalMinutes]);


    const runAutomationCycle = async () => {
        addLog("Starting automation cycle...", "info");
        await runMonitoredSubredditScan();
        await runGlobalKeywordSearch();
        setLastRun(Date.now());
        addLog("Cycle complete. Waiting for next interval.", "success");
    };

    const processAndFilterPosts = (posts: PostDataWrapper[], source: string) => {
        const currentSettings = settingsRef.current;
        const allKeywords = [
            ...(currentSettings.monitoredKeywords || []),
            ...(currentSettings.brandKeywords || []),
            ...(currentSettings.competitorKeywords || []),
        ];

        return posts
            .map(post => {
                const category = categorizePost(post.title, currentSettings.brandKeywords, currentSettings.competitorKeywords);
                const intent = calculateIntent(
                    post.title,
                    currentSettings.highIntentKeywords || [],
                    currentSettings.mediumIntentKeywords || []
                );
                return { ...post, category, intent: intent.charAt(0).toUpperCase() + intent.slice(1) };
            })
            .filter(post => {
                const text = (post.title + " " + (post.selftext || "")).toLowerCase();
                const sub = post.subreddit.toLowerCase().replace(/^r\//, "");
                const isBlacklisted = (currentSettings.blacklistSubreddits || [])
                    .some(b => b.toLowerCase() === sub);

                if (isBlacklisted) return false;

                return allKeywords.some(k => text.includes(k.toLowerCase()));
            });
    };

    const runGlobalKeywordSearch = async () => {
        const currentSettings = settingsRef.current;
        addLog("Running Global Keyword Search & Subreddit Discovery...", "info");

        const allKeywords = [
            ...(currentSettings.brandKeywords || []).map(k => ({ term: k, type: 'brand' })),
            ...(currentSettings.competitorKeywords || []).map(k => ({ term: k, type: 'competitor' })),
            ...(currentSettings.monitoredKeywords || []).map(k => ({ term: k, type: 'general' }))
        ];

        if (allKeywords.length === 0) {
            addLog("No keywords configured for global search.", "warning");
            return;
        }

        const discoveredSubreddits = new Set<string>();
        const existingSubreddits = new Set((currentSettings.monitoredSubreddits || []).map(s => s.toLowerCase()));

        const chunkSize = 10;
        for (let i = 0; i < allKeywords.length; i += chunkSize) {
            const chunk = allKeywords.slice(i, i + chunkSize);
            const query = chunk.map(k => `"${k.term}"`).join(" OR ");

            addLog(`Searching Globally for: ${chunk.map(k => k.term).join(", ")}...`, "info");

            try {
                const results: PostDataWrapper[] = await invoke("get_reddit_results", {
                    sortTypes: ["new"],
                    query: query
                });

                results.forEach(post => {
                    const sub = post.subreddit.toLowerCase();
                    if (!existingSubreddits.has(sub)) {
                        discoveredSubreddits.add(post.subreddit);
                    }
                });

                const relevantPosts = processAndFilterPosts(results, "Global");

                if (relevantPosts.length > 0) {
                    addFoundPosts(relevantPosts);
                    addLog(`Found ${relevantPosts.length} new matches globally.`, "success");
                }
            } catch (error) {
                addLog(`Global search failed: ${error}`, "error");
            }
            if (!automationIntervalRef.current) break;
            await new Promise(r => setTimeout(r, 3000));
        }

        if (discoveredSubreddits.size > 0) {
            const list = Array.from(discoveredSubreddits).slice(0, 5).join(", r/");
            addLog(`Discovered new subreddits: r/${list}`, "success");
        }
    };

    const runMonitoredSubredditScan = async () => {
        const currentSettings = settingsRef.current;
        const monitoredSubreddits = currentSettings.monitoredSubreddits || [];
        if (monitoredSubreddits.length === 0) {
            return;
        }

        addLog(`Deep scanning ${monitoredSubreddits.length} subreddits...`, "info");

        const blacklistSubreddits = currentSettings.blacklistSubreddits || [];
        const filteredSubreddits = monitoredSubreddits.filter(
            s => !blacklistSubreddits.some(b => b.toLowerCase() === s.toLowerCase())
        );

        const allKeywords = [
            ...(currentSettings.brandKeywords || []),
            ...(currentSettings.competitorKeywords || []),
            ...(currentSettings.monitoredKeywords || [])
        ];

        if (allKeywords.length === 0) {
            addLog("No keywords to search in monitored subreddits.", "warning");
            return;
        }

        for (const subreddit of filteredSubreddits) {
            if (!automationIntervalRef.current) break;
            addLog(`Scanning r/${subreddit} for all monitored keywords...`, "info");

            const chunkSize = 20;
            for (let i = 0; i < allKeywords.length; i += chunkSize) {
                if (!automationIntervalRef.current) break;
                const chunk = allKeywords.slice(i, i + chunkSize);
                const query = `subreddit:${subreddit} (${chunk.map(k => `"${k}"`).join(" OR ")})`;

                try {
                    const results: PostDataWrapper[] = await invoke("get_reddit_results", {
                        sortTypes: ["new"],
                        query: query
                    });
                    const relevantPosts = processAndFilterPosts(results, `r/${subreddit} search`);
                    if (relevantPosts.length > 0) {
                        addFoundPosts(relevantPosts);
                        addLog(`Found ${relevantPosts.length} keyword matches in r/${subreddit}.`, "success");
                    }
                } catch (error) {
                    console.error(`Search failed for ${query}`, error);
                    addLog(`Search failed in r/${subreddit}: ${error}`, "error");
                }
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    };

    return null; // Logic only
}