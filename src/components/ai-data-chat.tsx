"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAIChatStore, Message } from "@/store/ai-chat-store";

type DataStats = {
  totalPosts: number;
  totalMessages: number;
  uniqueSubredditsCount: number;
  highIntentPostsCount: number;
  postsWithNotesCount: number;
  engagedPostsCount: number;
  topKeywords: string[];
  averageRelevance: number;
};

export function AIDataChat({ dataStats }: { dataStats: DataStats }) {
  const { messages, isLoading, addMessage, setIsLoading } = useAIChatStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const generateResponse = async (userQuery: string): Promise<string> => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const response: string = await invoke("ask_gemini_command", {
        question: userQuery,
      });
      return response;
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Sorry, I encountered an error while communicating with the AI. Please check your API key in settings.";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput("");
    setIsLoading(true);

    const response = await generateResponse(userMessage.content);

    const assistantMessage: Message = {
      role: "assistant",
      content: response,
      timestamp: new Date(),
    };

    addMessage(assistantMessage);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[500px] border-border/50 bg-gradient-to-b from-background/50 to-background backdrop-blur-sm">
      <div className="p-1 border-b bg-muted/30 backdrop-blur-md sticky top-0 z-10">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-500 border-indigo-500/20 whitespace-nowrap"
          >
            {dataStats.totalPosts} Posts
          </Badge>
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-500 border-purple-500/20 whitespace-nowrap"
          >
            {dataStats.totalMessages} Messages
          </Badge>
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5 bg-pink-500/10 text-pink-500 border-pink-500/20 whitespace-nowrap"
          >
            {dataStats.uniqueSubredditsCount} Subreddits
          </Badge>
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5 bg-orange-500/10 text-orange-500 border-orange-500/20 whitespace-nowrap"
          >
            {dataStats.averageRelevance.toFixed(1)}% Relevance
          </Badge>
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-500 border-green-500/20 whitespace-nowrap"
          >
            {dataStats.highIntentPostsCount} High Intent
          </Badge>
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border-yellow-500/20 whitespace-nowrap"
          >
            {dataStats.postsWithNotesCount} With Notes
          </Badge>
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-500 border-blue-500/20 whitespace-nowrap"
          >
            {dataStats.engagedPostsCount} Engaged
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 h-20 overflow-auto max-h-[calc(100vh-200px)]">
        <div className="space-y-6 max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              {message.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md mt-1">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[100%] rounded-xl p-2.5 shadow-sm ${message.role === "user"
                  ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-none"
                  : "bg-muted/50 border border-border/50 rounded-tl-none"
                  }`}
              >
                <div
                  className={`text-[13px] leading-snug ${message.role === "user" ? "text-white/95" : "text-foreground"}`}
                >
                  {message.role === "assistant" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node, ...props }) => (
                          <p className="mb-2 last:mb-0" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc pl-4 mb-2" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal pl-4 mb-2" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="mb-1" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                          <a
                            className="text-primary underline hover:text-primary/80"
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                          />
                        ),
                        code: ({
                          node,
                          inline,
                          className,
                          children,
                          ...props
                        }: any) => {
                          return inline ? (
                            <code
                              className="bg-muted px-1 py-0.5 rounded text-xs font-mono"
                              {...props}
                            >
                              {children}
                            </code>
                          ) : (
                            <div className="bg-muted/50 p-2 rounded-md my-2 overflow-x-auto">
                              <code
                                className="text-xs font-mono block"
                                {...props}
                              >
                                {children}
                              </code>
                            </div>
                          );
                        },
                        h1: ({ node, ...props }) => (
                          <h1 className="text-lg font-bold mb-2" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 className="text-base font-bold mb-2" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-sm font-bold mb-1" {...props} />
                        ),
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-2">
                            <table
                              className="w-full border-collapse text-xs"
                              {...props}
                            />
                          </div>
                        ),
                        th: ({ node, ...props }) => (
                          <th
                            className="border border-border px-2 py-1 bg-muted font-semibold text-left"
                            {...props}
                          />
                        ),
                        td: ({ node, ...props }) => (
                          <td
                            className="border border-border px-2 py-1"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                <p
                  className={`text-[10px] mt-2 font-medium ${message.role === "user"
                    ? "text-white/60"
                    : "text-muted-foreground"
                    }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {message.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 shadow-sm mt-1 border border-border">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 justify-start animate-in fade-in duration-300">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <Bot className="h-4 w-4 text-white animate-pulse" />
              </div>
              <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-tl-none p-4 flex items-center gap-2 h-[52px]">
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" />
                <div className="h-2 w-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
                <div className="h-2 w-2 rounded-full bg-pink-500 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-muted/30 backdrop-blur-md">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.length === 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {[
                "Summarize my data",
                "What are the top trends?",
                "Suggest new subreddits",
                "Draft a post about...",
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="bg-background/50 hover:bg-indigo-500/10 hover:text-indigo-600 hover:border-indigo-200 transition-all text-xs whitespace-nowrap rounded-full"
                  onClick={() => setInput(suggestion)}
                  disabled={isLoading}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}

          <div className="relative flex items-center gap-2">
            <Input
              placeholder="Ask anything about your Reddit data..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSend()
              }
              disabled={isLoading}
              className="pr-10 py-5 rounded-lg border-border/50 focus-visible:ring-indigo-500/30 shadow-sm bg-background/80 backdrop-blur-sm text-xs"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="absolute right-1 h-8 w-8 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md transition-all"
            >
              <Send className="h-3.5 w-3.5 text-white" />
            </Button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground">
            Gemini can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  );
}
