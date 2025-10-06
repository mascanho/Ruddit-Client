"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare, ArrowUpRight, ThumbsUp, Clock, ChevronLeft, ChevronRight } from "lucide-react"

const mentions = [
  {
    id: 1,
    subreddit: "r/MachineLearning",
    title: "New GPT model shows impressive results on benchmark tests",
    author: "u/ml_researcher",
    timestamp: "2h ago",
    upvotes: 342,
    comments: 87,
    sentiment: "positive",
    keywords: ["GPT", "AI"],
  },
  {
    id: 2,
    subreddit: "r/artificial",
    title: "Discussion: The future of machine learning in healthcare",
    author: "u/tech_enthusiast",
    timestamp: "4h ago",
    upvotes: 256,
    comments: 64,
    sentiment: "neutral",
    keywords: ["machine learning"],
  },
  {
    id: 3,
    subreddit: "r/technology",
    title: "AI companies facing new regulations in Europe",
    author: "u/news_bot",
    timestamp: "6h ago",
    upvotes: 189,
    comments: 43,
    sentiment: "negative",
    keywords: ["AI"],
  },
  {
    id: 4,
    subreddit: "r/programming",
    title: "Built a simple GPT wrapper for code generation",
    author: "u/developer123",
    timestamp: "8h ago",
    upvotes: 412,
    comments: 92,
    sentiment: "positive",
    keywords: ["GPT"],
  },
  {
    id: 5,
    subreddit: "r/datascience",
    title: "Comparing different approaches to neural network optimization",
    author: "u/data_scientist",
    timestamp: "10h ago",
    upvotes: 178,
    comments: 34,
    sentiment: "neutral",
    keywords: ["machine learning"],
  },
  {
    id: 6,
    subreddit: "r/ArtificialIntelligence",
    title: "New research paper on transformer architectures",
    author: "u/researcher_ai",
    timestamp: "12h ago",
    upvotes: 298,
    comments: 56,
    sentiment: "positive",
    keywords: ["AI", "GPT"],
  },
  {
    id: 7,
    subreddit: "r/deeplearning",
    title: "Training large language models on consumer hardware",
    author: "u/ml_hobbyist",
    timestamp: "14h ago",
    upvotes: 523,
    comments: 112,
    sentiment: "positive",
    keywords: ["AI", "machine learning"],
  },
  {
    id: 8,
    subreddit: "r/singularity",
    title: "AGI timeline predictions from industry experts",
    author: "u/futurist_2025",
    timestamp: "16h ago",
    upvotes: 445,
    comments: 203,
    sentiment: "neutral",
    keywords: ["AI"],
  },
  {
    id: 9,
    subreddit: "r/LocalLLaMA",
    title: "New quantization method reduces model size by 60%",
    author: "u/llm_optimizer",
    timestamp: "18h ago",
    upvotes: 367,
    comments: 78,
    sentiment: "positive",
    keywords: ["GPT", "machine learning"],
  },
  {
    id: 10,
    subreddit: "r/ChatGPT",
    title: "GPT-5 rumors and what to expect",
    author: "u/ai_watcher",
    timestamp: "20h ago",
    upvotes: 891,
    comments: 234,
    sentiment: "positive",
    keywords: ["GPT", "AI"],
  },
  {
    id: 11,
    subreddit: "r/StableDiffusion",
    title: "Combining text and image generation models",
    author: "u/creative_ai",
    timestamp: "22h ago",
    upvotes: 276,
    comments: 45,
    sentiment: "neutral",
    keywords: ["AI"],
  },
  {
    id: 12,
    subreddit: "r/learnmachinelearning",
    title: "Best resources for understanding transformer architecture",
    author: "u/ml_student",
    timestamp: "1d ago",
    upvotes: 198,
    comments: 67,
    sentiment: "positive",
    keywords: ["machine learning"],
  },
  {
    id: 13,
    subreddit: "r/MachineLearning",
    title: "Breakthrough in few-shot learning techniques",
    author: "u/research_lead",
    timestamp: "1d ago",
    upvotes: 423,
    comments: 89,
    sentiment: "positive",
    keywords: ["machine learning"],
  },
  {
    id: 14,
    subreddit: "r/artificial",
    title: "Ethics in AI development: A comprehensive guide",
    author: "u/ethics_researcher",
    timestamp: "1d ago",
    upvotes: 312,
    comments: 156,
    sentiment: "neutral",
    keywords: ["AI"],
  },
  {
    id: 15,
    subreddit: "r/technology",
    title: "Major tech companies announce AI safety commitments",
    author: "u/tech_news",
    timestamp: "1d ago",
    upvotes: 567,
    comments: 234,
    sentiment: "positive",
    keywords: ["AI"],
  },
  {
    id: 16,
    subreddit: "r/programming",
    title: "Optimizing GPT inference for production environments",
    author: "u/backend_dev",
    timestamp: "2d ago",
    upvotes: 289,
    comments: 67,
    sentiment: "neutral",
    keywords: ["GPT"],
  },
  {
    id: 17,
    subreddit: "r/datascience",
    title: "Machine learning model interpretability tools comparison",
    author: "u/data_analyst",
    timestamp: "2d ago",
    upvotes: 234,
    comments: 45,
    sentiment: "positive",
    keywords: ["machine learning"],
  },
  {
    id: 18,
    subreddit: "r/ArtificialIntelligence",
    title: "The impact of AI on job markets: 2025 analysis",
    author: "u/economist_ai",
    timestamp: "2d ago",
    upvotes: 678,
    comments: 312,
    sentiment: "neutral",
    keywords: ["AI"],
  },
  {
    id: 19,
    subreddit: "r/deeplearning",
    title: "Novel approach to training sparse neural networks",
    author: "u/phd_student",
    timestamp: "2d ago",
    upvotes: 345,
    comments: 78,
    sentiment: "positive",
    keywords: ["machine learning"],
  },
  {
    id: 20,
    subreddit: "r/singularity",
    title: "Consciousness and artificial intelligence debate",
    author: "u/philosopher_tech",
    timestamp: "2d ago",
    upvotes: 456,
    comments: 289,
    sentiment: "neutral",
    keywords: ["AI"],
  },
  {
    id: 21,
    subreddit: "r/LocalLLaMA",
    title: "Running GPT models on Raspberry Pi 5",
    author: "u/hardware_hacker",
    timestamp: "3d ago",
    upvotes: 512,
    comments: 134,
    sentiment: "positive",
    keywords: ["GPT"],
  },
  {
    id: 22,
    subreddit: "r/ChatGPT",
    title: "Creative uses of GPT in education",
    author: "u/teacher_tech",
    timestamp: "3d ago",
    upvotes: 389,
    comments: 98,
    sentiment: "positive",
    keywords: ["GPT"],
  },
  {
    id: 23,
    subreddit: "r/StableDiffusion",
    title: "AI art generation: Legal and ethical considerations",
    author: "u/digital_artist",
    timestamp: "3d ago",
    upvotes: 267,
    comments: 187,
    sentiment: "negative",
    keywords: ["AI"],
  },
  {
    id: 24,
    subreddit: "r/learnmachinelearning",
    title: "Beginner's guide to understanding neural networks",
    author: "u/ml_educator",
    timestamp: "3d ago",
    upvotes: 445,
    comments: 76,
    sentiment: "positive",
    keywords: ["machine learning"],
  },
  {
    id: 25,
    subreddit: "r/MachineLearning",
    title: "State-of-the-art results on ImageNet classification",
    author: "u/vision_researcher",
    timestamp: "3d ago",
    upvotes: 378,
    comments: 92,
    sentiment: "positive",
    keywords: ["machine learning"],
  },
  {
    id: 26,
    subreddit: "r/artificial",
    title: "AI in climate change prediction and mitigation",
    author: "u/climate_scientist",
    timestamp: "4d ago",
    upvotes: 523,
    comments: 145,
    sentiment: "positive",
    keywords: ["AI"],
  },
  {
    id: 27,
    subreddit: "r/technology",
    title: "Privacy concerns with AI-powered surveillance",
    author: "u/privacy_advocate",
    timestamp: "4d ago",
    upvotes: 689,
    comments: 267,
    sentiment: "negative",
    keywords: ["AI"],
  },
  {
    id: 28,
    subreddit: "r/programming",
    title: "Building a GPT-powered code review assistant",
    author: "u/devtools_creator",
    timestamp: "4d ago",
    upvotes: 412,
    comments: 89,
    sentiment: "positive",
    keywords: ["GPT"],
  },
  {
    id: 29,
    subreddit: "r/datascience",
    title: "Feature engineering techniques for machine learning",
    author: "u/data_engineer",
    timestamp: "4d ago",
    upvotes: 298,
    comments: 54,
    sentiment: "neutral",
    keywords: ["machine learning"],
  },
  {
    id: 30,
    subreddit: "r/ArtificialIntelligence",
    title: "The future of human-AI collaboration",
    author: "u/futurist_ai",
    timestamp: "4d ago",
    upvotes: 567,
    comments: 178,
    sentiment: "positive",
    keywords: ["AI"],
  },
]

export function MentionsFeed() {
  const [currentPage, setCurrentPage] = useState(1)
  const [viewAll, setViewAll] = useState(false)
  const itemsPerPage = viewAll ? 20 : 12
  const totalPages = Math.ceil(mentions.length / itemsPerPage)

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMentions = mentions.slice(startIndex, endIndex)

  const handleViewAll = () => {
    setViewAll(!viewAll)
    setCurrentPage(1)
  }

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }

  return (
    <Card className="p-4 bg-card">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Recent Mentions</h3>
            <p className="text-xs text-muted-foreground">Latest posts matching your keywords</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent" onClick={handleViewAll}>
            {viewAll ? "Show Less" : "View All"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {currentMentions.map((mention) => (
            <div
              key={mention.id}
              className="p-3 rounded-md border border-border hover:bg-muted/50 transition-colors group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="font-mono text-[10px] h-4 px-1.5">
                        {mention.subreddit}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] h-4 px-1.5 ${
                          mention.sentiment === "positive"
                            ? "bg-accent/10 text-accent"
                            : mention.sentiment === "negative"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {mention.sentiment}
                      </Badge>
                    </div>
                    <h4 className="text-xs font-medium leading-snug line-clamp-2">{mention.title}</h4>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="truncate">{mention.author}</span>
                      <span className="flex items-center gap-0.5 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {mention.timestamp}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{mention.upvotes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>{mention.comments}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {mention.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="text-[9px] h-4 px-1">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, mentions.length)} of {mentions.length} mentions
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 bg-transparent"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page
                  if (totalPages <= 5) {
                    page = i + 1
                  } else if (currentPage <= 3) {
                    page = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i
                  } else {
                    page = currentPage - 2 + i
                  }
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 bg-transparent"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
