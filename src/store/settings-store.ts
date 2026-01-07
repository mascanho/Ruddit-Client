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
  brandKeywords: string[];
  competitorKeywords: string[];
  monitoredUsernames: string[];
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
  brandKeywords: ["ruddit", "myproduct"],
  competitorKeywords: ["competitor1", "competitor2"],
  monitoredUsernames: [],
};

const SETTINGS_STORAGE_KEY = "app-settings";

interface AppSettingsStore {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const useAppSettingsStore = create<AppSettingsStore>((set) => {
  // Initial load logic
  let initialSettings = defaultSettings;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      try {
        initialSettings = { ...defaultSettings, ...JSON.parse(stored) };
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }

  return {
    settings: initialSettings,
    updateSettings: (newSettings) =>
      set((state) => {
        const updated = { ...state.settings, ...newSettings };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
        return { settings: updated };
      }),
    resetSettings: () => {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(defaultSettings),
      );
      return { settings: defaultSettings };
    },
  };
});

export function useAppSettings() {
  const store = useAppSettingsStore();

  // Hydration fix / Storage listener for multi-tab sync (optional but good)
  useEffect(() => {
    // Optional: listen to storage events if we wanted multi-tab sync
  }, []);

  return store;
}
