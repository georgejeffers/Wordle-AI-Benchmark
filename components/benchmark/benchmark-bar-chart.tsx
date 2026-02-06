"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getModelColor } from "@/lib/benchmark-data"
import type { BenchmarkModelResult } from "@/lib/benchmark-types"

interface BenchmarkBarChartProps {
  title: string
  icon: React.ReactNode
  models: BenchmarkModelResult[]
  getValue: (model: BenchmarkModelResult) => number
  formatValue: (value: number) => string
  invertBar?: boolean // lower is better (e.g., avg guesses)
  maxValue?: number
}

export function BenchmarkBarChart({
  title,
  icon,
  models,
  getValue,
  formatValue,
  invertBar = false,
  maxValue: customMaxValue,
}: BenchmarkBarChartProps) {
  if (models.length === 0) return null

  const values = models.map(getValue)
  const maxValue = customMaxValue ?? Math.max(...values)
  const minValue = Math.min(...values)

  // Sort models by value
  const sorted = [...models].sort((a, b) => {
    const va = getValue(a)
    const vb = getValue(b)
    return invertBar ? va - vb : vb - va
  })

  return (
    <Card className="bg-card/50 backdrop-blur border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((model, index) => {
          const value = getValue(model)
          const barWidth = maxValue > 0
            ? invertBar
              ? ((maxValue - value) / (maxValue - minValue || 1)) * 100
              : (value / maxValue) * 100
            : 0
          const color = getModelColor(model.id)

          return (
            <div key={model.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-foreground truncate mr-2">
                  <span className="text-muted-foreground mr-2 text-xs">
                    {index + 1}.
                  </span>
                  {model.name}
                </span>
                <span className="text-muted-foreground whitespace-nowrap font-mono text-xs">
                  {formatValue(value)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(2, barWidth)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
