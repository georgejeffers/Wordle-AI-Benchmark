"use client"

import { useState } from "react"
import type { WordleGameState } from "@/lib/types"
import { WordleBoard } from "./wordle-board"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { CheckCircle2, XCircle, Send, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserWordleLaneProps {
  gameState: WordleGameState
  isRunning: boolean
  onSubmitGuess: (word: string) => void
  targetWord?: string | null // Only shown after race completes
}

export function UserWordleLane({ gameState, isRunning, onSubmitGuess, targetWord }: UserWordleLaneProps) {
  const [inputValue, setInputValue] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    
    const trimmed = inputValue.trim().toLowerCase()
    
    if (!trimmed) {
      setError("Please enter a word")
      return
    }
    
    if (trimmed.length !== 5) {
      setError("Word must be exactly 5 letters")
      return
    }
    
    if (!/^[a-z]{5}$/.test(trimmed)) {
      setError("Word must contain only letters")
      return
    }

    if (!targetWord) {
      setError("Waiting for target word...")
      return
    }

    setError("")
    onSubmitGuess(trimmed)
    setInputValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canGuess = isRunning && !gameState.solved && !gameState.failed && gameState.guesses.length < 6

  return (
    <Card className="bg-card/50 backdrop-blur border-border border-2 border-primary/50">
      <CardContent className="p-4">
        <div className="flex flex-col items-center gap-3">
          {/* User header */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="font-semibold text-foreground">You</span>
            </div>
            <div className="flex items-center gap-2">
              {gameState.solved && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {gameState.failed && <XCircle className="w-5 h-5 text-red-500" />}
              {canGuess && (
                <Badge variant="outline" className="text-xs border-primary">
                  Your turn
                </Badge>
              )}
            </div>
          </div>

          {/* Wordle board */}
          <WordleBoard gameState={gameState} isRunning={canGuess} />

          {/* Guess input */}
          {canGuess && (
            <form onSubmit={handleSubmit} className="w-full space-y-2">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => {
                    const trimmed = e.target.value.replace(/[^a-zA-Z]/g, "").toLowerCase().slice(0, 5)
                    setInputValue(trimmed)
                    setError("")
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter 5-letter word"
                  maxLength={5}
                  autoComplete="off"
                  spellCheck={false}
                  className={cn(
                    "bg-muted text-foreground uppercase",
                    error && "border-destructive"
                  )}
                  disabled={!canGuess}
                />
                <Button
                  type="submit"
                  disabled={inputValue.length !== 5 || !canGuess || !targetWord}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              {!targetWord && (
                <p className="text-xs text-muted-foreground">
                  Waiting for race to start...
                </p>
              )}
            </form>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>Guesses:</span>
              <span className="font-semibold text-foreground">
                {gameState.guesses.length}/6
              </span>
            </div>
            {(gameState.timeToSolveMs !== undefined || gameState.guesses.length > 0) && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="font-semibold text-foreground">
                  {gameState.timeToSolveMs !== undefined 
                    ? `${(gameState.timeToSolveMs / 1000).toFixed(1)}s`
                    : gameState.guesses.length > 0
                    ? `${(gameState.guesses.reduce((sum, g) => sum + g.e2eMs, 0) / 1000).toFixed(1)}s`
                    : "0.0s"}
                </span>
              </div>
            )}
            {gameState.solved && gameState.solvedAtGuess && (
              <Badge variant="default" className="bg-green-500">
                Solved in {gameState.solvedAtGuess} guess{gameState.solvedAtGuess !== 1 ? "es" : ""}
              </Badge>
            )}
            {gameState.failed && (
              <>
                <Badge variant="destructive">Failed</Badge>
                {targetWord && (
                  <span className="text-xs">Answer: <span className="font-bold text-foreground">{targetWord.toUpperCase()}</span></span>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

