"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Plus, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"

interface ConfigPanelProps {
  keywords: string[]
  setKeywords: (keywords: string[]) => void
  dateRange: { from: string; to: string }
  setDateRange: (range: { from: string; to: string }) => void
  crawlFrequency: string
  setCrawlFrequency: (frequency: string) => void
}

export function ConfigPanel({
  keywords,
  setKeywords,
  dateRange,
  setDateRange,
  crawlFrequency,
  setCrawlFrequency,
}: ConfigPanelProps) {
  const [newKeyword, setNewKeyword] = useState("")

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()])
      setNewKeyword("")
    }
  }

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword))
  }

  return (
    <Card className="p-4 bg-card">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-start">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Keywords & Topics</Label>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((keyword) => (
              <Badge key={keyword} variant="secondary" className="gap-1 pr-1 text-xs h-6">
                {keyword}
                <button onClick={() => removeKeyword(keyword)} className="ml-0.5 hover:bg-muted rounded-sm p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            <div className="flex gap-1.5">
              <Input
                placeholder="Add..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                className="bg-background h-6 text-xs w-24 px-2"
              />
              <Button onClick={addKeyword} size="sm" className="h-6 px-2 text-xs">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            Date Range
          </Label>
          <div className="flex gap-1.5">
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="bg-background h-8 text-xs w-32"
            />
            <span className="text-muted-foreground self-center">→</span>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="bg-background h-8 text-xs w-32"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Crawl Frequency
          </Label>
          <div className="space-y-1">
            <Select value={crawlFrequency} onValueChange={setCrawlFrequency}>
              <SelectTrigger className="bg-background h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time</SelectItem>
                <SelectItem value="hourly">Every Hour</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Last: 2m ago</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
