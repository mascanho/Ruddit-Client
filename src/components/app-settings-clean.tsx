"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings2,
  Palette,
  Table2,
  Bell,
  Database,
  Plus,
  X,
  Radar,
  UserCog,
  Sparkles,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppSettings } from "@/store/settings-store";

export function AppSettingsDialog({
  open,
  onOpenChange,
  onSubredditsChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubredditsChanged?: (addedCount: number) => void;
}) {
  const { settings, updateSettings, resetSettings } = useAppSettings();
  const { toast } = useToast();
  
  const [newSubreddit, setNewSubreddit] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newBrandKeyword, setNewBrandKeyword] = useState("");
  const [newCompetitorKeyword, setNewCompetitorKeyword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newBlacklistKeyword, setNewBlacklistKeyword] = useState("");

  const handleReset = () => {
    resetSettings();
    toast({
      title: "Settings reset",
      description: "All settings have been restored to defaults.",
    });
  };

  const addSubreddit = () => {
    if (!newSubreddit.trim()) return;
    const cleaned = newSubreddit.trim().toLowerCase().replace(/^r\//, "");
    if (settings.monitoredSubreddits.includes(cleaned)) {
      toast({
        title: "Already monitoring",
        description: `r/${cleaned} is already in your list.`,
      });
      return;
    }
    updateSettings({
      monitoredSubreddits: [...settings.monitoredSubreddits, cleaned],
    });
    setNewSubreddit("");
    toast({
      title: "⚠️ Subreddit added",
      description: `Now monitoring r/${cleaned}. Refresh Reddit Posts to update results.`,
      duration: 5000,
    });
    onSubredditsChanged?.(Math.floor(Math.random() * 6) + 3);
  };

  const removeSubreddit = (subreddit: string) => {
    updateSettings({
      monitoredSubreddits: settings.monitoredSubreddits.filter(
        (s) => s !== subreddit,
      ),
    });
    toast({
      title: "⚠️ Subreddit removed",
      description: `Stopped monitoring r/${subreddit}. Your Reddit Posts data has changed.`,
      duration: 5000,
    });
    onSubredditsChanged?.(0);
  };

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const cleaned = newKeyword.trim().toLowerCase();
    if (settings.monitoredKeywords.includes(cleaned)) {
      toast({
        title: "Already monitoring",
        description: `"${cleaned}" is already in your list.`,
      });
      return;
    }
    updateSettings({
      monitoredKeywords: [...settings.monitoredKeywords, cleaned],
    });
    setNewKeyword("");
    toast({
      title: "Keyword added",
      description: `Now monitoring "${cleaned}"`,
    });
  };

  const removeKeyword = (keyword: string) => {
    updateSettings({
      monitoredKeywords: settings.monitoredKeywords.filter(
        (k) => k !== keyword,
      ),
    });
    toast({
      title: "Keyword removed",
      description: `Stopped monitoring "${keyword}"`,
    });
  };

  const addBrandKeyword = () => {
    if (!newBrandKeyword.trim()) return;
    const cleaned = newBrandKeyword.trim().toLowerCase();
    if (settings.brandKeywords.includes(cleaned)) {
      toast({
        title: "Already monitoring",
        description: `"${cleaned}" is already in your list.`,
      });
      return;
    }
    updateSettings({
      brandKeywords: [...(settings.brandKeywords || []), cleaned],
    });
    setNewBrandKeyword("");
    toast({
      title: "Brand Keyword added",
      description: `Now monitoring "${cleaned}"`,
    });
  };

  const removeBrandKeyword = (keyword: string) => {
    updateSettings({
      brandKeywords: (settings.brandKeywords || []).filter(
        (k) => k !== keyword,
      ),
    });
    toast({
      title: "Keyword removed",
      description: `Stopped monitoring "${keyword}"`,
    });
  };

  const addCompetitorKeyword = () => {
    if (!newCompetitorKeyword.trim()) return;
    const cleaned = newCompetitorKeyword.trim().toLowerCase();
    if (settings.competitorKeywords.includes(cleaned)) {
      toast({
        title: "Already monitoring",
        description: `"${cleaned}" is already in your list.`,
      });
      return;
    }
    updateSettings({
      competitorKeywords: [...(settings.competitorKeywords || []), cleaned],
    });
    setNewCompetitorKeyword("");
    toast({
      title: "Competitor Keyword added",
      description: `Now monitoring "${cleaned}"`,
    });
  };

  const removeCompetitorKeyword = (keyword: string) => {
    updateSettings({
      competitorKeywords: (settings.competitorKeywords || []).filter(
        (k) => k !== keyword,
      ),
    });
    toast({
      title: "Keyword removed",
      description: `Stopped monitoring "${keyword}"`,
    });
  };

  const addUsername = () => {
    if (!newUsername.trim()) return;
    const cleaned = newUsername.trim().toLowerCase();
    if ((settings.monitoredUsernames || []).includes(cleaned)) {
      toast({
        title: "Already monitoring",
        description: `User "${cleaned}" is already on your monitor list.`,
      });
      return;
    }
    updateSettings({
      monitoredUsernames: [...(settings.monitoredUsernames || []), cleaned],
    });
    setNewUsername("");
    toast({
      title: "User added",
      description: `Now monitoring user "${cleaned}"`,
    });
  };

  const removeUsername = (username: string) => {
    updateSettings({
      monitoredUsernames: (settings.monitoredUsernames || []).filter(
        (u) => u !== username,
      ),
    });
    toast({
      title: "User removed",
      description: `Stopped monitoring user "${username}"`,
    });
  };

  const addBlacklistKeyword = () => {
    if (!newBlacklistKeyword.trim()) return;
    const cleaned = newBlacklistKeyword.trim().toLowerCase();
    if ((settings.blacklistKeywords || []).includes(cleaned)) {
      toast({
        title: "Already blacklisted",
        description: `"${cleaned}" is already in your blacklist.`,
      });
      return;
    }
    updateSettings({
      blacklistKeywords: [...(settings.blacklistKeywords || []), cleaned],
    });
    setNewBlacklistKeyword("");
    toast({
      title: "Blacklist keyword added",
      description: `Posts containing "${cleaned}" will be filtered out`,
    });
  };

  const removeBlacklistKeyword = (keyword: string) => {
    updateSettings({
      blacklistKeywords: (settings.blacklistKeywords || []).filter(
        (k) => k !== keyword,
      ),
    });
    toast({
      title: "Blacklist keyword removed",
      description: `"${keyword}" removed from blacklist`,
    });
  };

  // API Keys State
  const [apiKeys, setApiKeys] = useState({
    reddit_api_id: "",
    reddit_api_secret: "",
    reddit_username: "",
    reddit_password: "",
    gemini_api_key: "",
    gemini_model: "gemini-pro",
    ai_provider: "gemini",
    openai_api_key: "",
    openai_model: "gpt-4o",
  });

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const fetchModels = async (key: string, provider: string) => {
    if (!key || key === "CHANGE_ME") return;
    setIsLoadingModels(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      
      if (provider === "openai") {
        setAvailableModels(["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]);
        return;
      }

      const models = await invoke<string[]>("get_gemini_models_command", {
        apiKey: key,
      });
      setAvailableModels(models);

      const currentModel =
        provider === "openai" ? apiKeys.openai_model : apiKeys.gemini_model;
      const defaultModel = provider === "openai" ? "gpt-4o" : "gemini-pro";

      if (
        models.length > 0 &&
        !models.includes(currentModel) &&
        currentModel === defaultModel
      ) {
        setApiKeys((prev) => ({
          ...prev,
          [provider === "openai" ? "openai_model" : "gemini_model"]: models[0],
        }));
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
      sonnerToast.error("Failed to fetch models", {
        description: "Could not retrieve available models.",
      });
    } finally {
      setIsLoadingModels(false);
    }
  };

  const saveApiKeys = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("update_reddit_config_command", { newApiKeys: apiKeys });
      sonnerToast.success("API keys saved", {
        description: "Reddit API configuration has been updated.",
      });
    } catch (error) {
      sonnerToast.error("Error", {
        description: "Failed to save API keys.",
      });
    }
  };

  useEffect(() => {
    if (open) {
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke("get_reddit_config_command").then((config: any) => {
          setApiKeys(config);
          const provider = config.ai_provider || "gemini";
          const key =
            provider === "openai"
              ? config.openai_api_key
              : config.gemini_api_key;
          if (key && key !== "CHANGE_ME") {
            fetchModels(key, provider);
          }
        });
      });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] min-h-[90vh] h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Application Settings
          </DialogTitle>
          <DialogDescription>
            Customize appearance and behavior of your data tables.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="appearance"
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="appearance" className="text-xs sm:text-sm">
              <Palette className="h-4 w-4 mr-1.5" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="text-xs sm:text-sm">
              <Radar className="h-4 w-4 mr-1.5" />
              Monitor
            </TabsTrigger>
            <TabsTrigger value="llm" className="text-xs sm:text-sm">
              <Sparkles className="h-4 w-4 mr-1.5" />
              LLM
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-2 mt-4">
            <TabsContent value="appearance" className="space-y-6 mt-0">
              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="theme" className="text-base font-semibold">
                      Theme
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Choose your preferred color scheme
                    </p>
                    <Select
                      value={settings.theme}
                      onValueChange={(value) =>
                        updateSettings({ theme: value as any })
                      }
                    >
                      <SelectTrigger id="theme">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="accent" className="text-base font-semibold">
                      Accent Color
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Primary color for buttons and highlights
                    </p>
                    <Select
                      value={settings.accentColor}
                      onValueChange={(value) =>
                        updateSettings({ accentColor: value as any })
                      }
                    >
                      <SelectTrigger id="accent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blue">Blue</SelectItem>
                        <SelectItem value="violet">Violet</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="orange">Orange</SelectItem>
                        <SelectItem value="red">Red</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label
                      htmlFor="fontSize"
                      className="text-base font-semibold"
                    >
                      Font Size: {settings.fontSize}px
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Adjust the base font size
                    </p>
                    <Slider
                      id="fontSize"
                      min={12}
                      max={18}
                      step={1}
                      value={[settings.fontSize]}
                      onValueChange={([value]) =>
                        updateSettings({ fontSize: value })
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}