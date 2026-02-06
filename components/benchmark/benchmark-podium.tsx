"use client"

import { Trophy, Medal, Award } from "lucide-react"
import { getModelColor } from "@/lib/benchmark-data"
import type { BenchmarkLeaderboardEntry } from "@/lib/benchmark-types"
import { cn } from "@/lib/utils"

interface BenchmarkPodiumProps {
  leaderboard: BenchmarkLeaderboardEntry[]
}

export function BenchmarkPodium({ leaderboard }: BenchmarkPodiumProps) {
  if (leaderboard.length === 0) return null

  const topThree = leaderboard.slice(0, 3)

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-8 h-8 text-yellow-500" />
      case 2:
        return <Medal className="w-7 h-7 text-gray-400" />
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />
      default:
        return null
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {topThree.map((entry) => {
        const color = getModelColor(entry.modelId)

        return (
          <div
            key={entry.modelId}
            className={cn(
              "p-6 rounded-lg border-2 transition-all",
              entry.rank === 1 && "border-yellow-500/50 bg-yellow-500/5 md:order-2",
              entry.rank === 2 && "border-gray-400/50 bg-gray-400/5 md:order-1 md:mt-8",
              entry.rank === 3 && "border-amber-600/50 bg-amber-600/5 md:order-3 md:mt-8",
            )}
          >
            <div className="flex flex-col items-center text-center gap-3">
              {getRankIcon(entry.rank)}

              <div>
                <h3 className="font-bold text-lg text-foreground">{entry.modelName}</h3>
                <p className="text-sm text-muted-foreground">Rank #{entry.rank}</p>
              </div>

              <div
                className="text-3xl font-bold"
                style={{ color }}
              >
                {entry.score.toFixed(1)}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs w-full">
                <div className="text-muted-foreground text-right">Win Rate:</div>
                <div className="text-foreground font-medium">{entry.winRate.toFixed(0)}%</div>

                <div className="text-muted-foreground text-right">Avg Guesses:</div>
                <div className="text-foreground font-medium">{entry.avgGuesses.toFixed(2)}</div>

                <div className="text-muted-foreground text-right">Median Time:</div>
                <div className="text-foreground font-medium">
                  {entry.medianTimeMs > 0 ? `${(entry.medianTimeMs / 1000).toFixed(1)}s` : "N/A"}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
