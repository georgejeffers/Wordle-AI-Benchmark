"use client"

import { cn } from "@/lib/utils"
import type { ModelConfig, ClueAttempt } from "@/lib/types"

interface RaceLaneProps {
  model: ModelConfig
  attempts: ClueAttempt[]
  totalClues: number
  color: string
  isRunning: boolean
}

export function RaceLane({ model, attempts, totalClues, color, isRunning }: RaceLaneProps) {
  const correctCount = attempts.filter((a) => a.correct).length
  const avgScore = attempts.length > 0 ? attempts.reduce((sum, a) => sum + a.clueScore, 0) / attempts.length : 0
  const progress = (attempts.length / totalClues) * 100

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border">
      {/* Model info */}
      <div className="flex-shrink-0 w-32">
        <h3 className="font-semibold text-sm text-foreground">{model.name}</h3>
        <p className="text-xs text-muted-foreground">
          {correctCount}/{attempts.length} correct
        </p>
      </div>

      {/* Progress track */}
      <div className="flex-1 h-12 bg-muted rounded-lg overflow-hidden relative">
        {/* Progress bar */}
        <div
          className={cn("h-full transition-all duration-500 ease-out", isRunning && "animate-pulse-glow")}
          style={{
            width: `${progress}%`,
            backgroundColor: color,
            opacity: 0.8,
          }}
        />

        {/* Clue indicators */}
        <div className="absolute inset-0 flex items-center px-2 gap-1">
          {attempts.map((attempt, i) => (
            <div
              key={i}
              className={cn("w-2 h-2 rounded-full animate-slide-in", attempt.correct ? "bg-green-500" : "bg-red-500")}
              title={`${attempt.clueId}: ${attempt.correct ? "Correct" : "Wrong"} (${attempt.e2eMs.toFixed(0)}ms)`}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>

      {/* Score display */}
      <div className="flex-shrink-0 w-24 text-right">
        <div className="text-2xl font-bold" style={{ color }}>
          {avgScore.toFixed(1)}
        </div>
        <div className="text-xs text-muted-foreground">
          {attempts.length > 0 && <span>{attempts[attempts.length - 1].e2eMs.toFixed(0)}ms</span>}
        </div>
      </div>
    </div>
  )
}
