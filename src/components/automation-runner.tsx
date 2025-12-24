"use client";

import { useEffect, useRef } from "react";
import { useAppSettings } from "./app-settings";
import { useAutomationStore, useAddSingleSubReddit, PostDataWrapper } from "@/store/store";
import { invoke } from "@tauri-apps/api/core";
import { calculateIntent, categorizePost } from "@/lib/marketing-utils";

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
            // Check if already running to avoid double-logging or overlapping on strict mode remounts
            // But here safely assume we want to ensure it's on.
            if (!automationIntervalRef.current) {
                // Run immediately on start
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

        // 1. GLOBAL KEYWORD SEARCH
        await runGlobalKeywordSearch();

        // 2. MONITORED SUBREDDIT DEEP SCAN
        await runMonitoredSubredditScan();

        setLastRun(new Date());
        addLog("Cycle complete. Waiting for next interval.", "success");
    };

    // Shared processing function to filter and format posts
    const processAndFilterPosts = (posts: PostDataWrapper[], source: string) => {
        const currentSettings = settingsRef.current;
        return posts
            .map(post => {
                const category = categorizePost(post.title, currentSettings.brandKeywords, currentSettings.competitorKeywords);
                const intent = calculateIntent(post.title);
                return { ...post, category, intent: intent.charAt(0).toUpperCase() + intent.slice(1) };
            })
            .filter(post => {
                // Filter logic: Only keep High/Medium intent OR Brand mentions
                const isHighMedium = post.intent === "High" || post.intent === "Medium";
                const isBrand = post.category === "brand" || post.category === "competitor";

                // Rigorous check against CURRENT settings
                const text = (post.title + " " + (post.selftext || "")).toLowerCase();
                const matchesGeneral = currentSettings.monitoredKeywords.some(k => text.includes(k.toLowerCase()));
                const matchesBrand = currentSettings.brandKeywords.some(k => text.includes(k.toLowerCase()));
                const matchesCompetitor = currentSettings.competitorKeywords.some(k => text.includes(k.toLowerCase()));

                if (!matchesGeneral && !matchesBrand && !matchesCompetitor) return false;

                // If it's a "General" keyword match, enforce High/Medium intent
                if (matchesGeneral && !matchesBrand && !matchesCompetitor) {
                    return isHighMedium;
                }

                return true;
            });
    };

    const runGlobalKeywordSearch = async () => {
        const currentSettings = settingsRef.current;
        addLog("Running Global Keyword Search...", "info");

        const allKeywords = [
            ...currentSettings.brandKeywords.map(k => ({ term: k, type: 'brand' })),
            ...currentSettings.competitorKeywords.map(k => ({ term: k, type: 'competitor' })),
            ...currentSettings.monitoredKeywords.map(k => ({ term: k, type: 'general' }))
        ];

        if (allKeywords.length === 0) {
            addLog("No keywords configured for global search.", "warning");
            return;
        }

        const chunkSize = 5;
        for (let i = 0; i < allKeywords.length; i += chunkSize) {
            const chunk = allKeywords.slice(i, i + chunkSize);
            const query = chunk.map(k => k.term).join(" OR ");

            addLog(`Searching Global: ${query}...`, "info");

            try {
                const results: PostDataWrapper[] = await invoke("get_reddit_results", {
                    sortTypes: ["new"],
                    query: query
                });

                const relevantPosts = processAndFilterPosts(results, "Global");

                if (relevantPosts.length > 0) {
                    addFoundPosts(relevantPosts);
                    addLog(`Found ${relevantPosts.length} matches globally.`, "success");
                }
            } catch (error) {
                addLog(`Global search failed: ${error}`, "error");
            }
            // Check if stopped during async wait
            if (!settingsRef.current) break; // simplistic check, really relying on next cycle
            await new Promise(r => setTimeout(r, 2000));
        }
    };

    const runMonitoredSubredditScan = async () => {
        const currentSettings = settingsRef.current;
        if (currentSettings.monitoredSubreddits.length === 0) {
            return;
        }

        addLog(`Scanning ${currentSettings.monitoredSubreddits.length} monitored subreddits...`, "info");

        const allKeywords = [
            ...currentSettings.brandKeywords,
            ...currentSettings.competitorKeywords,
            ...currentSettings.monitoredKeywords
        ];

        for (const subreddit of currentSettings.monitoredSubreddits) {
            addLog(`Scanning r/${subreddit}...`, "info");

            // 1. Scan "New" feed
            try {
                const results: PostDataWrapper[] = await invoke("get_reddit_results", {
                    sortTypes: ["new"],
                    query: `r/${subreddit}`
                });
                const relevantPosts = processAndFilterPosts(results, `r/${subreddit}`);
                if (relevantPosts.length > 0) {
                    addFoundPosts(relevantPosts);
                    addLog(`Found ${relevantPosts.length} matches in r/${subreddit} (New feed).`, "success");
                }
            } catch (error) {
                addLog(`Failed to scan new in r/${subreddit}: ${error}`, "error");
            }

            // 2. Targeted Keyword Search
            if (allKeywords.length > 0) {
                const chunkSize = 5;
                for (let i = 0; i < allKeywords.length; i += chunkSize) {
                    const chunk = allKeywords.slice(i, i + chunkSize);
                    const query = `subreddit:${subreddit} (${chunk.join(" OR ")})`;

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
                    }
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            await new Promise(r => setTimeout(r, 1000));
        }
    };

    return null; // Logic only
}
