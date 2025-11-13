"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Send, Bot, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type Message = {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

type DataStats = {
  totalPosts: number
  totalMessages: number
  subreddits: string[]
  topKeywords: string[]
  averageRelevance: number
}

export function AIDataChat({ dataStats }: { dataStats: DataStats }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI assistant. I can help you analyze your Reddit data, find patterns, suggest content strategies, and answer questions about your tracked posts and messages. What would you like to know?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const generateResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI response based on data stats
    const lowerQuery = userQuery.toLowerCase()

    if (lowerQuery.includes("summary") || lowerQuery.includes("overview")) {
      return `Based on your data:
      
📊 You have ${dataStats.totalPosts} Reddit posts tracked across ${dataStats.subreddits.length} subreddits with an average relevance score of ${dataStats.averageRelevance.toFixed(1)}%.

📬 You've collected ${dataStats.totalMessages} messages from comments.

🎯 Your most active subreddits are: ${dataStats.subreddits
        .slice(0, 3)
        .map((s) => `r/${s}`)
        .join(", ")}

💡 Consider focusing on high-relevance posts (80+%) for the best engagement opportunities.`
    }

    if (lowerQuery.includes("trend") || lowerQuery.includes("pattern")) {
      return `I've analyzed your tracked content and found these patterns:

📈 Most of your high-relevance posts (80+%) come from r/${dataStats.subreddits[0]} and r/${dataStats.subreddits[1]}.

⏰ Peak engagement times appear to be when technical discussions are posted.

🔥 Hot topics in your data: ${dataStats.topKeywords.slice(0, 4).join(", ")}

💡 Recommendation: Focus monitoring on posts that combine technical depth with practical applications.`
    }

    if (lowerQuery.includes("recommend") || lowerQuery.includes("suggest")) {
      return `Here are my recommendations based on your data:

✅ **Expand Monitoring**: Consider adding r/programming and r/coding to capture broader discussions.

🎯 **Keywords to Track**: Based on current trends, add keywords like "deployment", "architecture", and "best practices".

⚡ **Engagement Strategy**: Posts with 85+ relevance in r/${dataStats.subreddits[0]} typically generate the most valuable comments.

📊 **Content Gaps**: You might be missing discussions about testing and CI/CD - consider adding these keywords.`
    }

    if (lowerQuery.includes("subreddit") || lowerQuery.includes("where")) {
      return `Your tracked subreddits breakdown:

${dataStats.subreddits.map((sub, i) => `${i + 1}. r/${sub} - ${Math.floor(Math.random() * 30 + 10)} posts`).join("\n")}

The most relevant content comes from r/${dataStats.subreddits[0]}, which has the highest average relevance score. Consider increasing monitoring frequency there.`
    }

    if (lowerQuery.includes("engagement") || lowerQuery.includes("comment")) {
      return `Comment engagement analysis:

💬 You have ${dataStats.totalMessages} comments across your tracked posts.

📊 Average ${Math.floor(dataStats.totalMessages / dataStats.totalPosts)} comments per post.

🌟 Posts with "tutorial" or "guide" in the title generate 2-3x more comments.

💡 Tip: Posts asking specific technical questions tend to get higher quality responses. Focus on capturing these discussions.`
    }

    // Default response
    return `That's an interesting question about your Reddit data! 

From what I can see, you're tracking ${dataStats.totalPosts} posts with an average relevance of ${dataStats.averageRelevance.toFixed(1)}%. Your monitoring covers ${dataStats.subreddits.length} subreddits.

Could you be more specific about what you'd like to know? I can help with:
- Data summaries and statistics
- Trend analysis
- Content recommendations
- Subreddit performance
- Engagement metrics

Just ask!`
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const response = await generateResponse(userMessage.content)

    const assistantMessage: Message = {
      role: "assistant",
      content: response,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsLoading(false)
  }

  return (
    <Card className="p-6 flex flex-col h-[600px]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Data Assistant
        </h3>
        <p className="text-sm text-muted-foreground">Ask questions about your tracked Reddit data</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Badge variant="outline" className="text-xs">
          {dataStats.totalPosts} Posts
        </Badge>
        <Badge variant="outline" className="text-xs">
          {dataStats.totalMessages} Messages
        </Badge>
        <Badge variant="outline" className="text-xs">
          {dataStats.subreddits.length} Subreddits
        </Badge>
        <Badge variant="outline" className="text-xs">
          {dataStats.averageRelevance.toFixed(1)}% Avg Relevance
        </Badge>
      </div>

      <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <p
                  className={`text-xs mt-2 ${
                    message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>

              {message.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0.2s]" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2">
        <Input
          placeholder="Ask about your data..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={isLoading}
        />
        <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setInput("Give me a summary of my data")}
          disabled={isLoading}
        >
          Summary
        </Button>
        <Button variant="outline" size="sm" onClick={() => setInput("What trends do you see?")} disabled={isLoading}>
          Trends
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setInput("What subreddits should I monitor?")}
          disabled={isLoading}
        >
          Recommendations
        </Button>
      </div>
    </Card>
  )
}
