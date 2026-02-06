"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import { getModelColor } from "@/lib/benchmark-data"
import type { BenchmarkModelResult } from "@/lib/benchmark-types"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface BenchmarkGuessDistributionProps {
  models: BenchmarkModelResult[]
  topN?: number
}

export function BenchmarkGuessDistribution({
  models,
  topN = 8,
}: BenchmarkGuessDistributionProps) {
  // Take top N models by win rate
  const topModels = [...models]
    .filter((m) => m.stats.winRate > 0)
    .sort((a, b) => b.stats.winRate - a.stats.winRate)
    .slice(0, topN)

  if (topModels.length === 0) return null

  // Build chart data: one entry per guess count
  const chartData = [1, 2, 3, 4, 5, 6].map((guessNum) => {
    const entry: Record<string, number | string> = { guess: `${guessNum}` }
    topModels.forEach((model) => {
      entry[model.name] =
        model.stats.guessDistribution[
          guessNum as keyof typeof model.stats.guessDistribution
        ] || 0
    })
    return entry
  })

  return (
    <Card className="bg-card/50 backdrop-blur border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <BarChart3 className="w-5 h-5" />
          Guess Distribution (Top {topModels.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis
              dataKey="guess"
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              label={{
                value: "Guess #",
                position: "insideBottom",
                offset: -5,
                fill: "var(--muted-foreground)",
                fontSize: 12,
              }}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              label={{
                value: "Count",
                angle: -90,
                position: "insideLeft",
                fill: "var(--muted-foreground)",
                fontSize: 12,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--foreground)",
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
            />
            {topModels.map((model) => (
              <Bar
                key={model.id}
                dataKey={model.name}
                fill={getModelColor(model.id)}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
