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
        "Hello! I'm your AI assistant powered by Gemini. I have access to your tracked Reddit posts and can answer questions, analyze trends, or help you draft responses. What would you like to know?",
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
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const response: string = await invoke("ask_gemini_command", { question: userQuery });
      return response;
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Sorry, I encountered an error while communicating with the AI. Please check your API key in settings.";
    }
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
                className={`max-w-[80%] rounded-lg p-3 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <p
                  className={`text-xs mt-2 ${message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
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
