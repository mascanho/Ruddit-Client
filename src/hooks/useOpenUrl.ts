// @ts-nocheck
import { openUrl } from "@tauri-apps/plugin-opener";

export const useOpenUrl = () => {
  const openUrlInBrowser = async (url: string) => {
    console.log("Opening URL:", url);
    try {
      await openUrl(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  return openUrlInBrowser;
};
