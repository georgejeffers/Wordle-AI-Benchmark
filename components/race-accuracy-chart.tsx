"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ModelScore } from "@/lib/types"
import { Target } from "lucide-react"

interface RaceAccuracyChartProps {
  scores: ModelScore[]
}

export function RaceAccuracyChart({ scores }: RaceAccuracyChartProps) {
  if (scores.length === 0) return null

  return (
    <Card className="bg-card/50 backdrop-blur border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Target className="w-5 h-5" />
          Accuracy Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {scores.map((score) => {
          const isPerfect = score.accuracyPct === 100

          return (
            <div key={score.modelId} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-foreground">
                  {score.modelName}
                  {isPerfect && <span className="ml-2 text-xs text-secondary">✓ Perfect</span>}
                </span>
                <span className="text-muted-foreground">
                  {score.totalCorrect}/{score.totalAttempts} ({score.accuracyPct.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-secondary to-primary transition-all duration-500"
                  style={{ width: `${score.accuracyPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
