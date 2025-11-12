"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ModelScore, RaceState } from "@/lib/types"
import { Clock, Target, Zap, Award } from "lucide-react"

interface RaceStatsPanelProps {
  scores: ModelScore[]
  state: RaceState | null
}

export function RaceStatsPanel({ scores, state }: RaceStatsPanelProps) {
  if (scores.length === 0) return null

  const winner = scores[0]
  const avgAccuracy = scores.reduce((sum, s) => sum + s.accuracyPct, 0) / scores.length
  const fastestMedian = Math.min(...scores.map((s) => s.medianE2EMs))
  const totalAttempts = scores.reduce((sum, s) => sum + s.totalAttempts, 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Award className="w-4 h-4" />
            Winner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-secondary">{winner.modelName}</div>
          <p className="text-xs text-muted-foreground mt-1">Score: {winner.avgScore.toFixed(1)}</p>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Target className="w-4 h-4" />
            Avg Accuracy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{avgAccuracy.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-1">{state?.completedClues || 0} clues completed</p>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Zap className="w-4 h-4" />
            Fastest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-accent">{fastestMedian.toFixed(0)}ms</div>
          <p className="text-xs text-muted-foreground mt-1">Median E2E latency</p>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            Total Attempts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{totalAttempts}</div>
          <p className="text-xs text-muted-foreground mt-1">Across {scores.length} models</p>
        </CardContent>
      </Card>
    </div>
  )
}
