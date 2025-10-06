import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"

const subreddits = [
  { name: "r/MachineLearning", mentions: 487, change: 12.5, trend: "up" },
  { name: "r/artificial", mentions: 342, change: 8.3, trend: "up" },
  { name: "r/technology", mentions: 298, change: -3.2, trend: "down" },
  { name: "r/programming", mentions: 256, change: 15.7, trend: "up" },
  { name: "r/datascience", mentions: 189, change: 5.4, trend: "up" },
  { name: "r/ArtificialInteligence", mentions: 167, change: -1.8, trend: "down" },
  { name: "r/learnmachinelearning", mentions: 143, change: 22.1, trend: "up" },
]

export function SubredditsList() {
  return (
    <Card className="p-6 bg-card h-full">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Top Subreddits</h3>
          <p className="text-sm text-muted-foreground">Most active communities</p>
        </div>

        <div className="space-y-3">
          {subreddits.map((subreddit, index) => (
            <div
              key={subreddit.name}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-muted-foreground w-6">{index + 1}</span>
                <div>
                  <p className="text-sm font-medium">{subreddit.name}</p>
                  <p className="text-xs text-muted-foreground">{subreddit.mentions} mentions</p>
                </div>
              </div>
              <Badge
                variant={subreddit.trend === "up" ? "default" : "secondary"}
                className={`gap-1 ${
                  subreddit.trend === "up"
                    ? "bg-accent/10 text-accent hover:bg-accent/20"
                    : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                }`}
              >
                {subreddit.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(subreddit.change)}%
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
