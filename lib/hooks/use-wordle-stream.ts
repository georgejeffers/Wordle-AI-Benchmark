"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type {
  WordleConfig,
  WordleState,
  WordleGuess,
  WordleGameState,
  WordleRaceResult,
  ModelConfig,
} from "@/lib/types"
import { computeWordleFeedback } from "@/lib/wordle-utils"

interface StreamEvent {
  type: "config" | "state" | "modelStart" | "guess" | "modelComplete" | "complete" | "error"
  config?: Omit<WordleConfig, "targetWord"> & { targetWord?: string } // Config may include target word if user is participating
  state?: WordleState & { modelStates?: Record<string, WordleGameState> }
  modelId?: string
  guessIndex?: number
  guess?: WordleGuess
  gameState?: WordleGameState
  result?: WordleRaceResult
  error?: string
}

interface UseWordleStreamResult {
  config: Omit<WordleConfig, "targetWord"> | null
  state: WordleState | null
  result: WordleRaceResult | null
  modelStates: Map<string, WordleGameState>
  isRunning: boolean
  error: string | null
  workingModels: Set<string>
  includeUser: boolean
  userGameState: WordleGameState | null
  targetWord: string | null
  submitUserGuess: (word: string) => void
  startWordleRace: (name: string, models?: string[], targetWord?: string, includeUser?: boolean) => Promise<void>
  reset: () => void
}

/**
 * Hook to manage Wordle race streaming
 */
export function useWordleStream(): UseWordleStreamResult {
  const [config, setConfig] = useState<Omit<WordleConfig, "targetWord"> | null>(null)
  const [state, setState] = useState<WordleState | null>(null)
  const [result, setResult] = useState<WordleRaceResult | null>(null)
  const [modelStates, setModelStates] = useState<Map<string, WordleGameState>>(new Map())
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workingModels, setWorkingModels] = useState<Set<string>>(new Set())
  const [includeUser, setIncludeUser] = useState(false)
  const [userGameState, setUserGameState] = useState<WordleGameState | null>(null)
  const [targetWord, setTargetWord] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    setConfig(null)
    setState(null)
    setResult(null)
    setModelStates(new Map())
    setIsRunning(false)
    setError(null)
    setWorkingModels(new Set())
    setIncludeUser(false)
    setUserGameState(null)
    setTargetWord(null)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const startWordleRace = useCallback(
    async (name: string, models?: string[], targetWordParam?: string, includeUserParam?: boolean) => {
      reset()
      setIsRunning(true)
      setError(null)
      setIncludeUser(includeUserParam || false)
      setTargetWord(targetWordParam || null)
      
      // Initialize user game state if participating
      if (includeUserParam) {
        setUserGameState({
          modelId: "user",
          guesses: [],
          solved: false,
          failed: false,
        })
      }

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        const response = await fetch("/api/wordle/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name, 
            models, 
            targetWord: targetWordParam,
            includeUser: includeUserParam || false,
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error("No response body")
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              try {
                const event: StreamEvent = JSON.parse(data)

                switch (event.type) {
                  case "config":
                    if (event.config) {
                      setConfig(event.config)
                      // Store target word if provided (when user is participating)
                      if (event.config.targetWord) {
                        setTargetWord(event.config.targetWord)
                      }
                    }
                    break
                  case "state":
                    if (event.state) {
                      // Update state metadata but preserve existing guesses from modelStates
                      // Don't overwrite modelStates from state events - they come from guess events
                      setState((prev) => ({
                        gameId: event.state!.gameId,
                        status: event.state!.status,
                        startedAt: event.state!.startedAt ?? prev?.startedAt,
                        completedAt: event.state!.completedAt ?? prev?.completedAt,
                        modelStates: prev?.modelStates || new Map(),
                      }))
                    }
                    break
                  case "modelStart":
                    if (event.modelId) {
                      setWorkingModels((prev) => new Set(prev).add(event.modelId!))
                    }
                    break
                  case "guess":
                    if (event.guess) {
                      setWorkingModels((prev) => {
                        const next = new Set(prev)
                        // Don't remove here - wait for modelComplete
                        return next
                      })

                      setModelStates((prev) => {
                        const next = new Map(prev)
                        const gameState = next.get(event.guess!.modelId) || {
                          modelId: event.guess!.modelId,
                          guesses: [],
                          solved: false,
                          failed: false,
                        }
                        
                        // Check if this guess already exists (prevent duplicates)
                        const guessExists = gameState.guesses.some(
                          (g) => g.guessIndex === event.guess!.guessIndex && g.modelId === event.guess!.modelId
                        )
                        
                        if (!guessExists) {
                          // Add the new guess
                          gameState.guesses = [...gameState.guesses, event.guess!]
                          // Sort by guessIndex to ensure correct order
                          gameState.guesses.sort((a, b) => a.guessIndex - b.guessIndex)
                          
                          if (event.guess!.correct) {
                            gameState.solved = true
                            gameState.solvedAtGuess = event.guess!.guessIndex + 1
                            gameState.timeToSolveMs = event.guess!.e2eMs
                          }
                        }
                        
                        next.set(event.guess!.modelId, gameState)
                        return next
                      })
                    }
                    break
                  case "modelComplete":
                    if (event.modelId) {
                      setWorkingModels((prev) => {
                        const next = new Set(prev)
                        next.delete(event.modelId!)
                        return next
                      })
                      if (event.gameState) {
                        setModelStates((prev) => {
                          const next = new Map(prev)
                          next.set(event.modelId!, event.gameState!)
                          return next
                        })
                      }
                    }
                    break
                  case "complete":
                    if (event.result) {
                      setResult(event.result)
                      // Store target word when race completes (for user to see)
                      if (event.result.targetWord) {
                        setTargetWord(event.result.targetWord)
                      }
                      setIsRunning(false)
                      setWorkingModels(new Set())
                    }
                    break
                  case "error":
                    setError(event.error || "Unknown error")
                    setIsRunning(false)
                    setWorkingModels(new Set())
                    break
                }
              } catch (err) {
                console.error("[wordle] Failed to parse SSE event:", err)
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.log("[wordle] Race aborted")
        } else {
          console.error("[wordle] Race stream error:", err)
          setError(err instanceof Error ? err.message : "Unknown error")
        }
        setIsRunning(false)
        setWorkingModels(new Set())
      }
    },
    [reset],
  )

  const submitUserGuess = useCallback((word: string) => {
    if (!userGameState || userGameState.solved || userGameState.failed || !targetWord) {
      return
    }

    const normalizedWord = word.toLowerCase().trim()
    if (normalizedWord.length !== 5 || !/^[a-z]{5}$/.test(normalizedWord)) {
      return
    }

    const guessIndex = userGameState.guesses.length
    if (guessIndex >= 6) {
      return
    }

    const feedback = computeWordleFeedback(normalizedWord, targetWord)
    const correct = normalizedWord === targetWord.toLowerCase()
    const now = Date.now()

    const guess: WordleGuess = {
      modelId: "user",
      guessIndex,
      word: normalizedWord,
      feedback,
      tRequest: now,
      tFirst: now,
      tLast: now,
      e2eMs: 0, // User guesses are instant
      ttftMs: 0,
      correct,
    }

    const newGuesses = [...userGameState.guesses, guess]
    const solved = correct
    const failed = !solved && newGuesses.length >= 6

    setUserGameState({
      modelId: "user",
      guesses: newGuesses,
      solved,
      failed,
      solvedAtGuess: solved ? guessIndex + 1 : undefined,
      timeToSolveMs: solved ? 0 : undefined, // User guesses don't have meaningful timing
    })
  }, [userGameState, targetWord])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    config,
    state,
    result,
    modelStates,
    isRunning,
    error,
    workingModels,
    includeUser,
    userGameState,
    targetWord,
    submitUserGuess,
    startWordleRace,
    reset,
  }
}

