"use client"

import { useState, useEffect, useRef } from "react"
import type { ModelConfig, WordleGameState } from "@/lib/types"
import { WordleBoard } from "./wordle-board"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { MODEL_COLORS, REASONING_MODELS } from "@/lib/constants"

interface WordleRaceLaneProps {
  model: ModelConfig
  gameState: WordleGameState
  isRunning: boolean
  isModelWorking: boolean
  blurred?: boolean
  currentGuessThinking?: string
  gameStartedAt?: number
}

export function WordleRaceLane({ model, gameState, isRunning, isModelWorking, blurred = false, currentGuessThinking = "", gameStartedAt }: WordleRaceLaneProps) {
  const [showThinking, setShowThinking] = useState(false)
  const [liveTime, setLiveTime] = useState(0)
  const color = MODEL_COLORS[model.id] || "#6366f1"
  
  // Use refs to always access latest values in interval callback
  // Update refs synchronously during render to ensure they're always current
  const gameStateRef = useRef(gameState)
  const isRunningRef = useRef(isRunning)
  const gameStartedAtRef = useRef(gameStartedAt)
  
  // Update refs synchronously (not in useEffect) so they're always current
  gameStateRef.current = gameState
  isRunningRef.current = isRunning
  gameStartedAtRef.current = gameStartedAt
  
  // Calculate live time - acts as a stopwatch that counts up continuously
  // Set up interval once and keep it running, using refs to always read latest values
  useEffect(() => {
    const updateLiveTime = () => {
      const currentGameState = gameStateRef.current
      const currentGameStartedAt = gameStartedAtRef.current
      const minTimestamp = 1577836800000 // Jan 1, 2020
      const maxTimestamp = 4102444800000 // Jan 1, 2100
      
      // Debug: log timer info for first few seconds
      const debugLog = !currentGameState.solved && !currentGameState.failed && currentGameState.guesses.length <= 1
      if (debugLog) {
        console.log(`[${model.id}] Timer update:`, {
          gameStartedAt: currentGameStartedAt,
          guessCount: currentGameState.guesses.length,
          solved: currentGameState.solved,
          failed: currentGameState.failed,
        })
      }
      
      // If solved, use the final time and freeze
      if (currentGameState.solved) {
        const finalTime = currentGameState.timeToSolveMs !== undefined && currentGameState.timeToSolveMs > 0
          ? currentGameState.timeToSolveMs
          : currentGameState.guesses.reduce((sum, g) => sum + g.e2eMs, 0)
        setLiveTime(finalTime)
        return
      }
      
      // If failed, calculate total time and freeze
      if (currentGameState.failed) {
        if (currentGameState.guesses.length > 0 && currentGameStartedAt && 
            currentGameStartedAt > minTimestamp && currentGameStartedAt < maxTimestamp) {
          const lastGuess = currentGameState.guesses[currentGameState.guesses.length - 1]
          if (lastGuess.tLast > minTimestamp && lastGuess.tLast < maxTimestamp) {
            // Time from game start to last guess completion
            setLiveTime(lastGuess.tLast - currentGameStartedAt)
          } else {
            setLiveTime(currentGameState.guesses.reduce((sum, g) => sum + g.e2eMs, 0))
          }
        } else {
          setLiveTime(currentGameState.guesses.reduce((sum, g) => sum + g.e2eMs, 0))
        }
        return
      }
      
      // Game is active - stopwatch counts up continuously
      // Use gameStartedAt as the single source of truth
      if (currentGameStartedAt && currentGameStartedAt > minTimestamp && currentGameStartedAt < maxTimestamp) {
        const now = Date.now()
        const elapsed = now - currentGameStartedAt
        setLiveTime(Math.max(0, elapsed))
      } else if (currentGameState.guesses.length > 0) {
        // Fallback: if no valid gameStartedAt, use first guess as reference
        const firstGuess = currentGameState.guesses[0]
        if (firstGuess.tRequest > minTimestamp && firstGuess.tRequest < maxTimestamp) {
          const now = Date.now()
          const elapsed = now - firstGuess.tRequest
          setLiveTime(Math.max(0, elapsed))
        } else {
          setLiveTime(currentGameState.guesses.reduce((sum, g) => sum + g.e2eMs, 0))
        }
      } else {
        setLiveTime(0)
      }
    }
    
    // Initial update
    updateLiveTime()
    
    // Update every 100ms for smooth stopwatch display
    const interval = setInterval(updateLiveTime, 100)
    return () => clearInterval(interval)
  }, []) // Empty dependency array - interval runs continuously, refs provide latest values
  
  const totalTime = liveTime
  const baseModelId = model.baseModelId || model.id
  const hasThinkingText = currentGuessThinking.trim().length > 0
  const isReasoningModel = REASONING_MODELS.has(baseModelId)
  const isThinkingEnabled = isReasoningModel || model.enableThinking === true
  const shouldShowThinkingToggle =
    (isThinkingEnabled || hasThinkingText) &&
    (isModelWorking || hasThinkingText)
  const thinkingButtonLabel = hasThinkingText
    ? showThinking
      ? "Hide thinking"
      : "Show thinking"
    : showThinking
      ? "Hide thinking"
      : "Thinking..."

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
            {(totalTime > 0 || (isRunning && gameStartedAt)) && (
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

          {/* Show thinking button only for models with reasoning enabled or active thoughts */}
          {shouldShowThinkingToggle && (
            <div className="w-full border-t pt-2 mt-2">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="flex items-center gap-2 w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showThinking ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                <span className="font-medium">
                  {thinkingButtonLabel}
                </span>
              </button>
              {showThinking && (
                <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs font-mono text-muted-foreground max-h-32 overflow-y-auto">
                  {hasThinkingText ? (
                    <pre className="whitespace-pre-wrap break-words">{currentGuessThinking}</pre>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Waiting for thinking...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
