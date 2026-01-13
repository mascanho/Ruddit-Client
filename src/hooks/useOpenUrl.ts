// @ts-nocheck
import { openUrl } from "@tauri-apps/plugin-opener";

export const useOpenUrl = () => {
  const openUrlInBrowser = async (url: string) => {
    if (!url) return;

    console.log("Opening URL:", url);
    let targetUrl = url;

    // Handle relative Reddit URLs
    if (url.startsWith("/r/") || url.startsWith("/u/")) {
      targetUrl = `https://www.reddit.com${url}`;
    } else if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("mailto:")) {
      // If it looks like a domain but lacks protocol
      if (url.includes(".") && !url.includes(" ")) {
        targetUrl = `https://${url}`;
      }
    }

    try {
      await openUrl(targetUrl);
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  return openUrlInBrowser;
};
