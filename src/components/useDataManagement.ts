/**
 * Custom hook for data management operations in RedditTable
 * Handles CRM data updates, data merging, and local storage operations
 */

import { useEffect } from "react";
import type { RedditPost } from "./reddit-table-types";

/**
 * Hook that manages data operations and local storage for Reddit posts
 */
export function useDataManagement(
  data: RedditPost[],
  setData: (data: RedditPost[] | ((prev: RedditPost[]) => RedditPost[])) => void,
  externalPosts: RedditPost[] | undefined,
  lastVisitTimestamp: number,
) {
  /**
   * Updates CRM data in localStorage for a specific post
   */
  const updateCrmData = (postId: number, updates: Partial<RedditPost>) => {
    // Update local state
    setData((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, ...updates } : p)),
    );

    // Update LocalStorage
    const storedCrm = JSON.parse(
      localStorage.getItem("atalaia-crm-data") || "{}",
    );
    const postData = storedCrm[postId] || {};
    storedCrm[postId] = { ...postData, ...updates };
    localStorage.setItem("atalaia-crm-data", JSON.stringify(storedCrm));
  };

  // Load CRM data from localStorage on mount and merge with data
  useEffect(() => {
    if (data.length === 0) return;
    const storedCrm = JSON.parse(
      localStorage.getItem("atalaia-crm-data") || "{}",
    );

    // Only update if we have new data to merge to avoid infinite loop if we put this in the dependency array incorrectly
    // Actually, we should do this when data *changes* from external sources (initial load)
    // But since `data` is local state initialized from `initialData` (empty) and then populated in useEffect,
    // we can intercept the setting of data there.
  }, []);

  // Merge external posts with CRM data
  useEffect(() => {
    if (externalPosts && externalPosts.length > 0) {
      const storedCrm = JSON.parse(
        localStorage.getItem("atalaia-crm-data") || "{}",
      );

      setData((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newPosts = externalPosts.filter((p) => !existingIds.has(p.id));

        // Merge with CRM data
        const mergedNewPosts = newPosts.map((p) => ({
          ...p,
          status: storedCrm[p.id]?.status || p.status || "new",
          intent: storedCrm[p.id]?.intent || p.intent || "low", // default to low if unknown? or calculate?
          category: storedCrm[p.id]?.category || p.category || "general",
          engaged: storedCrm[p.id]?.engaged ?? p.engaged ?? 0, // Add engaged status
          segment: storedCrm[p.id]?.segment || p.segment || "",
        }));

        // Also update existing posts with CRM data if needed (e.g. on reload)
        const updatedPrev = prev.map((p) => ({
          ...p,
          status: storedCrm[p.id]?.status || p.status || "new",
          intent: storedCrm[p.id]?.intent || p.intent,
          category: storedCrm[p.id]?.category || p.category,
          engaged: storedCrm[p.id]?.engaged ?? p.engaged ?? 0, // Add engaged status
          segment: storedCrm[p.id]?.segment || p.segment || "",
        }));

        return [...updatedPrev, ...mergedNewPosts];
      });
    }
  }, [externalPosts]);

  return {
    updateCrmData,
  };
}