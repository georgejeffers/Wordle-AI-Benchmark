"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getModelColor } from "@/lib/benchmark-data"
import type { BenchmarkModelResult, BenchmarkLeaderboardEntry } from "@/lib/benchmark-types"
import { ChevronDown, ChevronUp, ArrowUpDown, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

type SortKey = "rank" | "winRate" | "avgGuesses" | "medianTimeMs" | "totalCost" | "score" | "tokens"
type SortDir = "asc" | "desc"

interface BenchmarkLeaderboardProps {
  leaderboard: BenchmarkLeaderboardEntry[]
  models: BenchmarkModelResult[]
}

export function BenchmarkLeaderboard({ leaderboard, models }: BenchmarkLeaderboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rank")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [expandedModel, setExpandedModel] = useState<string | null>(null)
  const [hideZeroWinRate, setHideZeroWinRate] = useState(true)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      // Default sort direction per column
      setSortDir(
        key === "avgGuesses" || key === "medianTimeMs" || key === "totalCost" || key === "rank"
          ? "asc"
          : "desc"
      )
    }
  }

  const filtered = hideZeroWinRate
    ? leaderboard.filter((e) => e.winRate > 0)
    : leaderboard

  const sorted = [...filtered].sort((a, b) => {
    let va: number, vb: number
    switch (sortKey) {
      case "rank": va = a.rank; vb = b.rank; break
      case "winRate": va = a.winRate; vb = b.winRate; break
      case "avgGuesses": va = a.avgGuesses; vb = b.avgGuesses; break
      case "medianTimeMs": va = a.medianTimeMs; vb = b.medianTimeMs; break
      case "totalCost": va = a.totalCost; vb = b.totalCost; break
      case "score": va = a.score; vb = b.score; break
      case "tokens":
        const ma = models.find(m => m.id === a.modelId)
        const mb = models.find(m => m.id === b.modelId)
        va = ma?.stats.totalTokens ?? 0
        vb = mb?.stats.totalTokens ?? 0
        break
      default: va = a.rank; vb = b.rank
    }
    return sortDir === "asc" ? va - vb : vb - va
  })

  const SortHeader = ({ label, colKey, className }: { label: string; colKey: SortKey; className?: string }) => (
    <button
      onClick={() => handleSort(colKey)}
      className={cn(
        "flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors",
        sortKey === colKey && "text-foreground",
        className
      )}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  )

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">1st</Badge>
    if (rank === 2) return <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/30">2nd</Badge>
    if (rank === 3) return <Badge className="bg-amber-600/20 text-amber-600 border-amber-600/30">3rd</Badge>
    return <span className="text-muted-foreground text-sm">#{rank}</span>
  }

  return (
    <Card className="bg-card/50 backdrop-blur border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Full Leaderboard</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHideZeroWinRate(!hideZeroWinRate)}
            className="text-xs"
          >
            {hideZeroWinRate ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
            {hideZeroWinRate ? "Show 0% models" : "Hide 0% models"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Table header */}
        <div className="grid grid-cols-[2rem_1fr_3.5rem_3.5rem_3.5rem] sm:grid-cols-[3rem_1fr_5rem_5rem_5rem_5rem_5rem] gap-2 pb-2 border-b border-border mb-2">
          <SortHeader label="#" colKey="rank" />
          <span className="text-xs font-medium text-muted-foreground">Model</span>
          <SortHeader label="Win %" colKey="winRate" />
          <SortHeader label="Guesses" colKey="avgGuesses" />
          <SortHeader label="Time" colKey="medianTimeMs" className="hidden sm:flex" />
          <SortHeader label="Tokens" colKey="tokens" className="hidden sm:flex" />
          <SortHeader label="Score" colKey="score" />
        </div>

        {/* Table rows */}
        <div className="space-y-1">
          {sorted.map((entry) => {
            const modelData = models.find((m) => m.id === entry.modelId)
            const color = getModelColor(entry.modelId)
            const isExpanded = expandedModel === entry.modelId

            return (
              <div key={entry.modelId}>
                <button
                  onClick={() => setExpandedModel(isExpanded ? null : entry.modelId)}
                  className="w-full grid grid-cols-[2rem_1fr_3.5rem_3.5rem_3.5rem] sm:grid-cols-[3rem_1fr_5rem_5rem_5rem_5rem_5rem] gap-2 items-center py-2 px-1 rounded hover:bg-muted/50 transition-colors text-left"
                >
                  <div>{getRankBadge(entry.rank)}</div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-medium text-foreground truncate">
                      {entry.modelName}
                    </span>
                    {isExpanded
                      ? <ChevronUp className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      : <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    }
                  </div>
                  <div className="text-sm text-foreground font-mono">
                    {entry.winRate != null ? `${entry.winRate.toFixed(0)}%` : "-"}
                  </div>
                  <div className="text-sm text-foreground font-mono">
                    {entry.avgGuesses != null ? entry.avgGuesses.toFixed(2) : "-"}
                  </div>
                  <div className="hidden sm:block text-sm text-foreground font-mono">
                    {entry.medianTimeMs != null && entry.medianTimeMs > 0 ? `${(entry.medianTimeMs / 1000).toFixed(1)}s` : "-"}
                  </div>
                  <div className="hidden sm:block text-sm text-foreground font-mono text-xs">
                    {modelData?.stats.totalTokens
                      ? `${(modelData.stats.totalTokens / 1000).toFixed(0)}k`
                      : "-"
                    }
                  </div>
                  <div className="text-sm font-bold font-mono" style={{ color }}>
                    {entry.score != null ? entry.score.toFixed(1) : "-"}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && modelData && (
                  <div className="ml-4 sm:ml-12 mr-2 mb-3 p-3 sm:p-4 rounded-lg bg-muted/30 border border-border space-y-4">
                    {/* Guess distribution */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        Guess Distribution
                      </h4>
                      <div className="space-y-1">
                        {([1, 2, 3, 4, 5, 6] as const).map((n) => {
                          const count = modelData.stats.guessDistribution[n]
                          const maxCount = Math.max(
                            ...Object.values(modelData.stats.guessDistribution)
                          )
                          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0

                          return (
                            <div key={n} className="flex items-center gap-2">
                              <span className="w-4 text-xs text-muted-foreground text-right">
                                {n}
                              </span>
                              <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                                <div
                                  className="h-full rounded transition-all"
                                  style={{
                                    width: `${barWidth}%`,
                                    backgroundColor: color,
                                    minWidth: count > 0 ? "4px" : "0",
                                  }}
                                />
                              </div>
                              <span className="w-6 text-xs text-muted-foreground text-right">
                                {count}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <div className="text-muted-foreground">Games Played</div>
                        <div className="font-medium text-foreground">{modelData.stats.gamesPlayed}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Games Solved</div>
                        <div className="font-medium text-foreground">{modelData.stats.gamesSolved}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Time</div>
                        <div className="font-medium text-foreground">
                          {modelData.stats.avgTimeMs > 0
                            ? `${(modelData.stats.avgTimeMs / 1000).toFixed(1)}s`
                            : "N/A"
                          }
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Total Tokens</div>
                        <div className="font-medium text-foreground">
                          {modelData.stats.totalTokens > 0
                            ? modelData.stats.totalTokens.toLocaleString()
                            : "N/A"
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
