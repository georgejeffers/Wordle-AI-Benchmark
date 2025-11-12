"use client"

import { Trophy, Medal, Award } from "lucide-react"
import type { ModelScore } from "@/lib/types"
import { cn } from "@/lib/utils"

interface RacePodiumProps {
  scores: ModelScore[]
}

export function RacePodium({ scores }: RacePodiumProps) {
  if (scores.length === 0) return null

  const topThree = scores.slice(0, 3)

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-8 h-8 text-secondary" />
      case 2:
        return <Medal className="w-7 h-7 text-muted-foreground" />
      case 3:
        return <Award className="w-6 h-6 text-accent" />
      default:
        return null
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {topThree.map((score, index) => (
        <div
          key={score.modelId}
          className={cn(
            "p-6 rounded-lg border-2 transition-all",
            score.rank === 1 && "border-secondary bg-secondary/10 md:order-2",
            score.rank === 2 && "border-muted bg-muted/20 md:order-1 md:mt-8",
            score.rank === 3 && "border-accent bg-accent/10 md:order-3 md:mt-8",
          )}
        >
          <div className="flex flex-col items-center text-center gap-3">
            {getRankIcon(score.rank)}

            <div>
              <h3 className="font-bold text-lg text-foreground">{score.modelName}</h3>
              <p className="text-sm text-muted-foreground">Rank #{score.rank}</p>
            </div>

            <div
              className="text-3xl font-bold"
              style={{
                color: score.rank === 1 ? "var(--secondary)" : "var(--foreground)",
              }}
            >
              {score.avgScore.toFixed(1)}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs w-full">
              <div className="text-muted-foreground text-right">Accuracy:</div>
              <div className="text-foreground font-medium">{score.accuracyPct.toFixed(0)}%</div>

              <div className="text-muted-foreground text-right">Median E2E:</div>
              <div className="text-foreground font-medium">{score.medianE2EMs.toFixed(0)}ms</div>

              <div className="text-muted-foreground text-right">Correct:</div>
              <div className="text-foreground font-medium">
                {score.totalCorrect}/{score.totalAttempts}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
