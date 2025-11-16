"use client"

import type { ModelConfig, WordleGameState } from "@/lib/types"
import { WordleBoard } from "./wordle-board"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { MODEL_COLORS } from "@/lib/constants"

interface WordleRaceLaneProps {
  model: ModelConfig
  gameState: WordleGameState
  isRunning: boolean
  isModelWorking: boolean
  blurred?: boolean
}

export function WordleRaceLane({ model, gameState, isRunning, isModelWorking, blurred = false }: WordleRaceLaneProps) {
  const color = MODEL_COLORS[model.id] || "#6366f1"
  const totalTime = gameState.guesses.reduce((sum, g) => sum + g.e2eMs, 0)

  return (
    <Card className={cn(
      "bg-card/50 backdrop-blur border-border transition-all duration-300",
      blurred && "blur-sm opacity-60 pointer-events-none"
    )}>
      <CardContent className="p-4">
        <div className="flex flex-col items-center gap-3">
          {/* Model header */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-semibold text-foreground">{model.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {isModelWorking && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              {gameState.solved && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {gameState.failed && <XCircle className="w-5 h-5 text-red-500" />}
              {!gameState.solved && !gameState.failed && isRunning && (
                <Badge variant="outline" className="text-xs">
                  Guessing...
                </Badge>
              )}
            </div>
          </div>

          {/* Wordle board */}
          <WordleBoard gameState={gameState} isRunning={isRunning && !gameState.solved && !gameState.failed} />

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>Guesses:</span>
              <span className="font-semibold text-foreground">
                {gameState.guesses.length}/{6}
              </span>
            </div>
            {totalTime > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="font-semibold text-foreground">{(totalTime / 1000).toFixed(1)}s</span>
              </div>
            )}
            {gameState.solved && gameState.solvedAtGuess && (
              <Badge variant="default" className="bg-green-500">
                Solved in {gameState.solvedAtGuess} guess{gameState.solvedAtGuess !== 1 ? "es" : ""}
              </Badge>
            )}
            {gameState.failed && (
              <Badge variant="destructive">Failed</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

