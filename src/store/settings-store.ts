"use client";

import { create } from "zustand";
import { useEffect } from "react";

export type AppSettings = {
  // Appearance
  theme: "light" | "dark" | "system";
  accentColor: "blue" | "violet" | "green" | "orange" | "red";
  fontSize: number;

  // Table Settings
  tableDensity: "compact" | "comfortable" | "spacious";
  rowsPerPage: number;
  showRowNumbers: boolean;
  enableAnimations: boolean;

  // Behavior
  confirmDelete: boolean;
  autoRefresh: boolean;
  refreshInterval: number;

  // Data
  defaultSubredditFilter: string;
  defaultRelevanceFilter: string;
  defaultSortField: string;
  defaultSortDirection: "asc" | "desc";

  // Monitoring
  monitoredSubreddits: string[];
  monitoredKeywords: string[]; // Keeping for backward compatibility or "General"
  monitoredSegments: string[];
  brandKeywords: string[];
  competitorKeywords: string[];
  monitoredUsernames: string[];
  blacklistKeywords: string[];
  blacklistSubreddits: string[];
  blacklistUsernames: string[];
  highIntentKeywords: string[];
  mediumIntentKeywords: string[];
};

const defaultSettings: AppSettings = {
  theme: "dark",
  accentColor: "blue",
  fontSize: 14,
  tableDensity: "comfortable",
  rowsPerPage: 100,
  showRowNumbers: false,
  enableAnimations: true,
  confirmDelete: true,
  autoRefresh: false,
  refreshInterval: 30,
  defaultSubredditFilter: "all",
  defaultRelevanceFilter: "all",
  defaultSortField: "none",
  defaultSortDirection: "desc",
  monitoredSubreddits: ["nextjs", "typescript", "webdev"],
  monitoredKeywords: ["api", "database", "performance"],
  monitoredSegments: ["segment1", "segment2", "segment3"],
  brandKeywords: ["ruddit", "myproduct"],
  competitorKeywords: ["competitor1", "competitor2"],
  monitoredUsernames: [],
  blacklistKeywords: [],
  blacklistSubreddits: [],
  blacklistUsernames: [],
  highIntentKeywords: [
    "looking for", "need", "seeking", "in the market for", "shortlist",
    "recommend", "suggest", "alternative to", "vs", "versus", "comparison",
    "review", "best", "top", "pricing", "price", "cost", "budget",
    "license", "subscription", "SaaS", "demo", "trial", "RFP", "RFQ",
    "business case", "vendor", "provider"
  ],
  mediumIntentKeywords: [
    "issues with", "problem", "error", "question", "anyone used",
    "thoughts on", "experience with"
  ],
};

const SETTINGS_STORAGE_KEY = "app-settings";

interface AppSettingsStore {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const useAppSettingsStore = create<AppSettingsStore>((set, get) => {
  return {
    settings: defaultSettings, // Always start with defaults on server
    updateSettings: (newSettings) => {
      const currentSettings = get().settings;
      const updatedSettings = { ...currentSettings, ...newSettings };
      
      // Only access localStorage on client
      if (typeof window !== "undefined") {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
      }
      
      set({ settings: updatedSettings });
    },
    resetSettings: () => {
      // Only access localStorage on client
      if (typeof window !== "undefined") {
        localStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify(defaultSettings),
        );
      }
      set({ settings: defaultSettings });
    },
  };
});

export function useAppSettings() {
  const store = useAppSettingsStore();

  // Hydration fix - load from localStorage only on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        try {
          const parsedSettings = JSON.parse(stored);
          store.updateSettings(parsedSettings);
        } catch (e) {
          console.error("Failed to parse settings", e);
        }
      }
    }
  }, []);

  return store;
}
