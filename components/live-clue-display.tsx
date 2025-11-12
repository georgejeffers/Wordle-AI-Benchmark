"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Clue, ClueAttempt } from "@/lib/types"
import { CheckCircle2, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface LiveClueDisplayProps {
  currentClue?: Clue
  attempts: ClueAttempt[]
  isRunning: boolean
}

export function LiveClueDisplay({ currentClue, attempts, isRunning }: LiveClueDisplayProps) {
  const [pulseKey, setPulseKey] = useState(0)

  useEffect(() => {
    if (currentClue) {
      setPulseKey((prev) => prev + 1)
    }
  }, [currentClue])

  if (!currentClue) return null

  const clueAttempts = attempts.filter((a) => a.clueId === currentClue.id)
  const completed = clueAttempts.length > 0

  return (
    <Card
      className={cn(
        "bg-card/80 backdrop-blur border-2 transition-all",
        isRunning && !completed && "border-primary animate-pulse-glow",
        completed && "border-muted",
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-foreground">{completed ? "Last Clue" : "Current Clue"}</CardTitle>
          <Badge variant={completed ? "secondary" : "default"}>{completed ? "Completed" : "Racing..."}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clue text */}
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-lg font-medium text-foreground text-pretty">{currentClue.clue}</p>
          <p className="text-sm text-muted-foreground mt-2">Length: {currentClue.length} letters</p>
        </div>

        {/* Attempts summary */}
        {completed && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Results:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {clueAttempts.map((attempt) => (
                <div
                  key={attempt.modelId}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border",
                    attempt.correct ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {attempt.correct ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-xs font-medium text-foreground">{attempt.modelId.split("-")[0]}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {attempt.e2eMs.toFixed(0)}ms
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
