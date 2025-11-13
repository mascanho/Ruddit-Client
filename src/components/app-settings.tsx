"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings2, Palette, Table2, Bell, Database, Plus, X, Radar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export type AppSettings = {
  // Appearance
  theme: "light" | "dark" | "system"
  accentColor: "blue" | "violet" | "green" | "orange" | "red"
  fontSize: number

  // Table Settings
  tableDensity: "compact" | "comfortable" | "spacious"
  rowsPerPage: number
  showRowNumbers: boolean
  enableAnimations: boolean

  // Behavior
  confirmDelete: boolean
  autoRefresh: boolean
  refreshInterval: number

  // Data
  defaultSubredditFilter: string
  defaultRelevanceFilter: string
  defaultSortField: string
  defaultSortDirection: "asc" | "desc"

  // Monitoring
  monitoredSubreddits: string[]
  monitoredKeywords: string[]
}

const defaultSettings: AppSettings = {
  theme: "dark",
  accentColor: "blue",
  fontSize: 14,
  tableDensity: "comfortable",
  rowsPerPage: 10,
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
  monitoredKeywords: ["react", "api", "database", "performance"],
}

const SETTINGS_STORAGE_KEY = "app-settings"

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)

  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (stored) {
      try {
        setSettings(JSON.parse(stored))
      } catch (error) {
        console.error("Failed to parse settings:", error)
      }
    }
  }, [])

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaultSettings))
  }

  return { settings, updateSettings, resetSettings }
}

export function AppSettingsDialog({
  open,
  onOpenChange,
  onSubredditsChanged,
}: { open: boolean; onOpenChange: (open: boolean) => void; onSubredditsChanged?: (addedCount: number) => void }) {
  const { settings, updateSettings, resetSettings } = useAppSettings()
  const { toast } = useToast()
  const [newSubreddit, setNewSubreddit] = useState("")
  const [newKeyword, setNewKeyword] = useState("")

  const handleReset = () => {
    resetSettings()
    toast({
      title: "Settings reset",
      description: "All settings have been restored to defaults.",
    })
  }

  const addSubreddit = () => {
    if (!newSubreddit.trim()) return
    const cleaned = newSubreddit.trim().toLowerCase().replace(/^r\//, "")
    if (settings.monitoredSubreddits.includes(cleaned)) {
      toast({ title: "Already monitoring", description: `r/${cleaned} is already in your list.` })
      return
    }
    updateSettings({ monitoredSubreddits: [...settings.monitoredSubreddits, cleaned] })
    setNewSubreddit("")

    toast({
      title: "⚠️ Subreddit added",
      description: `Now monitoring r/${cleaned}. Refresh Reddit Posts to update results.`,
      duration: 5000,
    })

    const simulatedPostCount = Math.floor(Math.random() * 6) + 3
    onSubredditsChanged?.(simulatedPostCount)
  }

  const removeSubreddit = (subreddit: string) => {
    updateSettings({ monitoredSubreddits: settings.monitoredSubreddits.filter((s) => s !== subreddit) })

    toast({
      title: "⚠️ Subreddit removed",
      description: `Stopped monitoring r/${subreddit}. Your Reddit Posts data has changed.`,
      duration: 5000,
    })

    onSubredditsChanged?.(0)
  }

  const addKeyword = () => {
    if (!newKeyword.trim()) return
    const cleaned = newKeyword.trim().toLowerCase()
    if (settings.monitoredKeywords.includes(cleaned)) {
      toast({ title: "Already monitoring", description: `"${cleaned}" is already in your list.` })
      return
    }
    updateSettings({ monitoredKeywords: [...settings.monitoredKeywords, cleaned] })
    setNewKeyword("")
    toast({ title: "Keyword added", description: `Now monitoring "${cleaned}"` })
  }

  const removeKeyword = (keyword: string) => {
    updateSettings({ monitoredKeywords: settings.monitoredKeywords.filter((k) => k !== keyword) })
    toast({ title: "Keyword removed", description: `Stopped monitoring "${keyword}"` })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Application Settings
          </DialogTitle>
          <DialogDescription>Customize the appearance and behavior of your data tables.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="appearance" className="text-xs sm:text-sm">
              <Palette className="h-4 w-4 mr-1.5" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="table" className="text-xs sm:text-sm">
              <Table2 className="h-4 w-4 mr-1.5" />
              Table
            </TabsTrigger>
            <TabsTrigger value="behavior" className="text-xs sm:text-sm">
              <Bell className="h-4 w-4 mr-1.5" />
              Behavior
            </TabsTrigger>
            <TabsTrigger value="defaults" className="text-xs sm:text-sm">
              <Database className="h-4 w-4 mr-1.5" />
              Defaults
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="text-xs sm:text-sm">
              <Radar className="h-4 w-4 mr-1.5" />
              Monitor
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
                    <p className="text-sm text-muted-foreground mb-3">Choose your preferred color scheme</p>
                    <Select value={settings.theme} onValueChange={(value) => updateSettings({ theme: value as any })}>
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
                    <p className="text-sm text-muted-foreground mb-3">Primary color for buttons and highlights</p>
                    <Select
                      value={settings.accentColor}
                      onValueChange={(value) => updateSettings({ accentColor: value as any })}
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
                    <Label htmlFor="fontSize" className="text-base font-semibold">
                      Font Size: {settings.fontSize}px
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">Adjust the base font size</p>
                    <Slider
                      id="fontSize"
                      min={12}
                      max={18}
                      step={1}
                      value={[settings.fontSize]}
                      onValueChange={([value]) => updateSettings({ fontSize: value })}
                      className="mt-2"
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="table" className="space-y-6 mt-0">
              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="density" className="text-base font-semibold">
                      Table Density
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">Adjust spacing and row height</p>
                    <Select
                      value={settings.tableDensity}
                      onValueChange={(value) => updateSettings({ tableDensity: value as any })}
                    >
                      <SelectTrigger id="density">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="comfortable">Comfortable</SelectItem>
                        <SelectItem value="spacious">Spacious</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="rowsPerPage" className="text-base font-semibold">
                      Rows Per Page: {settings.rowsPerPage}
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">Number of rows to display per page</p>
                    <Slider
                      id="rowsPerPage"
                      min={5}
                      max={50}
                      step={5}
                      value={[settings.rowsPerPage]}
                      onValueChange={([value]) => updateSettings({ rowsPerPage: value })}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="rowNumbers" className="text-base font-semibold">
                        Show Row Numbers
                      </Label>
                      <p className="text-sm text-muted-foreground">Display row numbers in tables</p>
                    </div>
                    <Switch
                      id="rowNumbers"
                      checked={settings.showRowNumbers}
                      onCheckedChange={(checked) => updateSettings({ showRowNumbers: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="animations" className="text-base font-semibold">
                        Enable Animations
                      </Label>
                      <p className="text-sm text-muted-foreground">Smooth transitions and effects</p>
                    </div>
                    <Switch
                      id="animations"
                      checked={settings.enableAnimations}
                      onCheckedChange={(checked) => updateSettings({ enableAnimations: checked })}
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="behavior" className="space-y-6 mt-0">
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="confirmDelete" className="text-base font-semibold">
                        Confirm Before Delete
                      </Label>
                      <p className="text-sm text-muted-foreground">Show confirmation dialog when deleting</p>
                    </div>
                    <Switch
                      id="confirmDelete"
                      checked={settings.confirmDelete}
                      onCheckedChange={(checked) => updateSettings({ confirmDelete: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoRefresh" className="text-base font-semibold">
                        Auto Refresh Data
                      </Label>
                      <p className="text-sm text-muted-foreground">Automatically refresh table data</p>
                    </div>
                    <Switch
                      id="autoRefresh"
                      checked={settings.autoRefresh}
                      onCheckedChange={(checked) => updateSettings({ autoRefresh: checked })}
                    />
                  </div>

                  {settings.autoRefresh && (
                    <div>
                      <Label htmlFor="refreshInterval" className="text-base font-semibold">
                        Refresh Interval: {settings.refreshInterval}s
                      </Label>
                      <p className="text-sm text-muted-foreground mb-3">How often to refresh data</p>
                      <Slider
                        id="refreshInterval"
                        min={10}
                        max={300}
                        step={10}
                        value={[settings.refreshInterval]}
                        onValueChange={([value]) => updateSettings({ refreshInterval: value })}
                        className="mt-2"
                      />
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="defaults" className="space-y-6 mt-0">
              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="defaultSubreddit" className="text-base font-semibold">
                      Default Subreddit Filter
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">Initial subreddit filter on load</p>
                    <Select
                      value={settings.defaultSubredditFilter}
                      onValueChange={(value) => updateSettings({ defaultSubredditFilter: value })}
                    >
                      <SelectTrigger id="defaultSubreddit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subreddits</SelectItem>
                        <SelectItem value="nextjs">r/nextjs</SelectItem>
                        <SelectItem value="typescript">r/typescript</SelectItem>
                        <SelectItem value="webdev">r/webdev</SelectItem>
                        <SelectItem value="database">r/database</SelectItem>
                        <SelectItem value="vercel">r/vercel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="defaultRelevance" className="text-base font-semibold">
                      Default Relevance Filter
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">Initial relevance filter on load</p>
                    <Select
                      value={settings.defaultRelevanceFilter}
                      onValueChange={(value) => updateSettings({ defaultRelevanceFilter: value })}
                    >
                      <SelectTrigger id="defaultRelevance">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Relevance</SelectItem>
                        <SelectItem value="high">High (80+)</SelectItem>
                        <SelectItem value="medium">Medium (60-79)</SelectItem>
                        <SelectItem value="low">Low (&lt;60)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="defaultSort" className="text-base font-semibold">
                      Default Sort Field
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">Initial sort field on load</p>
                    <Select
                      value={settings.defaultSortField}
                      onValueChange={(value) => updateSettings({ defaultSortField: value })}
                    >
                      <SelectTrigger id="defaultSort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Sort</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="subreddit">Subreddit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="defaultDirection" className="text-base font-semibold">
                      Default Sort Direction
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">Initial sort direction on load</p>
                    <Select
                      value={settings.defaultSortDirection}
                      onValueChange={(value) => updateSettings({ defaultSortDirection: value as any })}
                    >
                      <SelectTrigger id="defaultDirection">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-6 mt-0">
              <Card className="p-4">
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-semibold">Monitored Subreddits</Label>
                    <p className="text-sm text-muted-foreground mb-3">Track specific subreddits for relevant content</p>

                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="e.g., nextjs, typescript, webdev"
                        value={newSubreddit}
                        onChange={(e) => setNewSubreddit(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addSubreddit()}
                      />
                      <Button onClick={addSubreddit} size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {settings.monitoredSubreddits.map((subreddit) => (
                        <Badge key={subreddit} variant="secondary" className="px-3 py-1.5">
                          <span className="font-mono">r/{subreddit}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-2 hover:bg-transparent"
                            onClick={() => removeSubreddit(subreddit)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                      {settings.monitoredSubreddits.length === 0 && (
                        <p className="text-sm text-muted-foreground">No subreddits added yet</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Monitored Keywords</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Track posts containing specific keywords across all subreddits
                    </p>

                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="e.g., react, api, performance"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                      />
                      <Button onClick={addKeyword} size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {settings.monitoredKeywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="px-3 py-1.5">
                          {keyword}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-2 hover:bg-transparent"
                            onClick={() => removeKeyword(keyword)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                      {settings.monitoredKeywords.length === 0 && (
                        <p className="text-sm text-muted-foreground">No keywords added yet</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>Tip:</strong> Use the search feature on the main page to discover new subreddits and
                      keywords based on your monitored items.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
