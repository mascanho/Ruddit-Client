"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send } from "lucide-react";

export function AIPromptPanel() {
  const [prompt, setPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    if (!prompt.trim()) return;

    setIsAnalyzing(true);
    console.log("[v0] Analyzing with prompt:", prompt);

    // Simulate AI analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      alert(
        `AI Analysis for: "${prompt}"\n\nThis would provide insights about sentiment trends, top performing posts, engagement patterns, and recommendations based on your Reddit mentions data.`,
      );
    }, 1500);
  };

  return (
    <Card className="p-3  border-primary/20">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-3 text-primary" />
          <h3 className="text-sm font-semibold">AIssss Analysis</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Ask questions about your Reddit mentions data or request insights
        </p>
        <div className="space-y-2">
          <Textarea
            placeholder="e.g., What are the main sentiment trends this week? Which posts got the most engagement?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[80px] text-sm resize-none bg-background"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleAnalyze}
              disabled={!prompt.trim() || isAnalyzing}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
