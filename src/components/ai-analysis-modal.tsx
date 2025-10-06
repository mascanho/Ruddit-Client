"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Send } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

export function AIAnalysisModal() {
  const [prompt, setPrompt] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)

  const handleAnalyze = () => {
    if (!prompt.trim()) return

    setIsAnalyzing(true)

    // Simulate AI analysis
    setTimeout(() => {
      setIsAnalyzing(false)
      setAnalysis(`Based on your Reddit mentions data for "${prompt}":

**Sentiment Trends:**
- Overall sentiment is positive (78% positive, 15% neutral, 7% negative)
- Highest engagement on posts with positive sentiment
- Negative mentions primarily related to regulatory concerns

**Top Performing Posts:**
1. "New GPT model shows impressive results" - 891 upvotes, r/ChatGPT
2. "Training large language models on consumer hardware" - 523 upvotes, r/deeplearning
3. "AGI timeline predictions from industry experts" - 445 upvotes, r/singularity

**Engagement Patterns:**
- Peak activity between 2-6 PM EST
- r/MachineLearning and r/ChatGPT show highest engagement rates
- Technical discussions generate 2.3x more comments than news posts

**Recommendations:**
- Focus on technical content for better engagement
- Post during peak hours (2-6 PM EST)
- Engage with r/MachineLearning and r/ChatGPT communities
- Address regulatory concerns proactively`)
    }, 2000)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="w-4 h-4" />
          AI Analysis
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>AI Analysis</DialogTitle>
          <DialogDescription>Ask questions about your Reddit mentions data or request insights</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Textarea
              placeholder="e.g., What are the main sentiment trends this week? Which posts got the most engagement?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] resize-none bg-background"
            />
            <div className="flex justify-end">
              <Button onClick={handleAnalyze} disabled={!prompt.trim() || isAnalyzing} className="gap-2">
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </div>

          {analysis && (
            <ScrollArea className="h-[400px] rounded-md border border-border p-4 bg-card">
              <div className="prose prose-sm prose-invert max-w-none">
                {analysis.split("\n").map((line, i) => (
                  <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
                    {line}
                  </p>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
