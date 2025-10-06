import { Card } from "@/components/ui/card"
import { TrendingUp, MessageSquare, Users, Activity } from "lucide-react"

export function StatsOverview() {
  const stats = [
    {
      label: "Total Mentions",
      value: "2,847",
      change: "+12.5%",
      trend: "up",
      icon: MessageSquare,
    },
    {
      label: "Active Subreddits",
      value: "156",
      change: "+8",
      trend: "up",
      icon: Users,
    },
    {
      label: "Sentiment Score",
      value: "7.8/10",
      change: "+0.3",
      trend: "up",
      icon: TrendingUp,
    },
    {
      label: "Engagement Rate",
      value: "4.2%",
      change: "-0.1%",
      trend: "down",
      icon: Activity,
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="p-2 bg-card border-border/50">
            <div className="flex items-center justify-between gap-1.5">
              <div className="space-y-0.5 min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
                <p className="text-base font-semibold tracking-tight">{stat.value}</p>
                <p className={`text-[10px] font-medium ${stat.trend === "up" ? "text-chart-1" : "text-destructive"}`}>
                  {stat.change}
                </p>
              </div>
              <div className="p-1 bg-muted/50 rounded">
                <Icon className="w-3 h-3 text-muted-foreground" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
