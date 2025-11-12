"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ModelScore } from "@/lib/types"
import { BarChart3 } from "lucide-react"

interface RaceSpeedChartProps {
  scores: ModelScore[]
}

export function RaceSpeedChart({ scores }: RaceSpeedChartProps) {
  if (scores.length === 0) return null

  const maxLatency = Math.max(...scores.map((s) => s.medianE2EMs))
  const minLatency = Math.min(...scores.map((s) => s.medianE2EMs))

  return (
    <Card className="bg-card/50 backdrop-blur border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <BarChart3 className="w-5 h-5" />
          Speed Comparison (Median E2E)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {scores.map((score) => {
          const percentage = ((maxLatency - score.medianE2EMs) / (maxLatency - minLatency)) * 100
          const isFastest = score.medianE2EMs === minLatency

          return (
            <div key={score.modelId} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-foreground">
                  {score.modelName}
                  {isFastest && <span className="ml-2 text-xs text-accent">⚡ Fastest</span>}
                </span>
                <span className="text-muted-foreground">{score.medianE2EMs.toFixed(0)}ms</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-primary transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
