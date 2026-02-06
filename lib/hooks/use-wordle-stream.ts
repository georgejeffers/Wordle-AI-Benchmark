"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type {
  WordleConfig,
  WordleState,
  WordleGuess,
  WordleGameState,
  WordleRaceResult,
  WordleModelResult,
  ModelConfig,
} from "@/lib/types"
import { computeWordleFeedback, calculateClosenessScore, calculateEstimatedCost, rankWordleResults } from "@/lib/wordle-utils"

interface StreamEvent {
  type: "config" | "state" | "modelStart" | "reasoning-delta" | "guess" | "modelComplete" | "complete" | "error"
  config?: Omit<WordleConfig, "targetWord"> & { targetWord?: string } // Config may include target word if user is participating
  state?: WordleState & { modelStates?: Record<string, WordleGameState> }
  modelId?: string
  guessIndex?: number
  delta?: string // Reasoning delta text
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
  currentGuessThinking: Map<string, string> // modelId -> reasoning text for current guess
  submitUserGuess: (word: string) => void
  startWordleRace: (name: string, models?: ModelConfig[], targetWord?: string, includeUser?: boolean) => Promise<void>
  endEarly: () => void
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
  const [currentGuessThinking, setCurrentGuessThinking] = useState<Map<string, string>>(new Map())
  const userStartTimeRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const modelConfigRef = useRef<Map<string, ModelConfig>>(new Map())

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
    setCurrentGuessThinking(new Map())
    modelConfigRef.current = new Map()
    userStartTimeRef.current = null
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const startWordleRace = useCallback(
    async (name: string, models?: ModelConfig[], targetWordParam?: string, includeUserParam?: boolean) => {
      reset()
      setIsRunning(true)
      setError(null)
      setIncludeUser(includeUserParam || false)
      setTargetWord(targetWordParam || null)
      
      // Initialize user game state if participating
      if (includeUserParam) {
        userStartTimeRef.current = Date.now()
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
            models: models || [], 
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
        let buffer = ""

        if (!reader) {
          throw new Error("No response body")
        }

        while (true) {
          const { done, value } = await reader.read()
          
          if (value) {
            const chunk = decoder.decode(value, { stream: !done })
            buffer += chunk
          }

          // Process complete lines (ending with \n)
          const lines = buffer.split("\n")
          // Keep the last incomplete line in buffer (or process it if done)
          if (done) {
            // Process all remaining lines including the last one
            buffer = ""
          } else {
            buffer = lines.pop() || ""
          }

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim()
              // Skip empty data strings
              if (!data) continue
              
              try {
                const event: StreamEvent = JSON.parse(data)

                switch (event.type) {
                  case "config":
                    if (event.config) {
                      setConfig(event.config)
                      if (event.config.models) {
                        modelConfigRef.current = new Map(event.config.models.map((m) => [m.id, m]))
                      }
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
                      // Don't clear thinking - preserve it as history for previous guesses
                      // The reasoning-delta will append to existing thinking for the new guess
                      // Ensure thinking exists in the map (even if empty) to preserve history
                      setCurrentGuessThinking((prev) => {
                        const next = new Map(prev)
                        if (!next.has(event.modelId!)) {
                          next.set(event.modelId!, "")
                        }
                        return next
                      })
                    }
                    break
                  case "reasoning-delta":
                    if (event.modelId && event.delta !== undefined) {
                      setCurrentGuessThinking((prev) => {
                        const next = new Map(prev)
                        const current = next.get(event.modelId!) || ""
                        // Always append delta to preserve all thinking history
                        next.set(event.modelId!, current + event.delta)
                        return next
                      })
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

                      // Append guessed word marker for thinking-capable models so history stays visible
                      const modelConfig = modelConfigRef.current.get(event.guess!.modelId)
                      const baseModelId = modelConfig?.baseModelId || modelConfig?.id || event.guess!.modelId
                      // Only show thinking if:
                      // 1. enableThinking is explicitly true, OR
                      // 2. enableThinking is undefined and it's a reasoning model (which always has thinking)
                      // Do NOT show thinking if enableThinking is explicitly false
                      const modelSupportsThinking =
                        !!modelConfig && modelConfig.enableThinking === true

                      if (modelSupportsThinking) {
                        setCurrentGuessThinking((prev) => {
                          const next = new Map(prev)
                          const existing = next.get(event.guess!.modelId) || ""
                          const guessWord = event.guess!.word ? event.guess!.word.toUpperCase() : ""
                          const marker = guessWord ? `{GUESSED WORD: ${guessWord}}` : "{GUESSED WORD}"
                          // Only add separator if there's existing content (preserve all thinking history)
                          const separator = existing.length > 0 && !existing.trim().endsWith(marker.trim()) ? "\n\n" : ""
                          // Always preserve existing thinking and append marker
                          next.set(event.guess!.modelId, `${existing}${separator}${marker}\n`)
                          return next
                        })
                      }
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
                console.error("[wordle] Data that failed to parse:", data.substring(0, 200))
              }
            }
          }
          
          if (done) break
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
    
    // Calculate time for this guess (time since start or since last guess)
    const guessStartTime = guessIndex === 0 
      ? (userStartTimeRef.current || now)
      : (userGameState.guesses[guessIndex - 1]?.tLast || now)
    const guessTime = now - guessStartTime

    const guess: WordleGuess = {
      modelId: "user",
      guessIndex,
      word: normalizedWord,
      feedback,
      tRequest: guessStartTime,
      tFirst: now,
      tLast: now,
      e2eMs: guessTime,
      ttftMs: guessTime,
      correct,
    }

    const newGuesses = [...userGameState.guesses, guess]
    const solved = correct
    const failed = !solved && newGuesses.length >= 6
    
    // Calculate total time to solve
    const totalTime = userStartTimeRef.current 
      ? now - userStartTimeRef.current 
      : newGuesses.reduce((sum, g) => sum + g.e2eMs, 0)

    setUserGameState({
      modelId: "user",
      guesses: newGuesses,
      solved,
      failed,
      solvedAtGuess: solved ? guessIndex + 1 : undefined,
      timeToSolveMs: solved ? totalTime : undefined,
    })
  }, [userGameState, targetWord])

  const endEarly = useCallback(() => {
    const existingResult = result // Get existing result from state before we create new one
    console.log("[wordle] endEarly called", { config: !!config, state: !!state, targetWord: !!targetWord, existingResult: !!existingResult })
    
    if (!config || !state) {
      console.warn("[wordle] Cannot end early: missing config or state")
      return
    }

    // Get target word from existing result if available, otherwise use stored targetWord
    // If still not available, try to infer from solved models' guesses
    let finalTargetWord = existingResult?.targetWord || targetWord
    
    if (!finalTargetWord) {
      // Try to infer target word from solved models
      for (const [modelId, gameState] of modelStates.entries()) {
        if (gameState.solved && gameState.guesses.length > 0) {
          const solvedGuess = gameState.guesses.find(g => g.correct)
          if (solvedGuess) {
            finalTargetWord = solvedGuess.word
            console.log("[wordle] Inferred target word from solved model:", finalTargetWord)
            break
          }
        }
      }
    }
    
    // If still no target word, use placeholder (will be revealed in results)
    if (!finalTargetWord) {
      console.warn("[wordle] Target word not available - using placeholder")
      finalTargetWord = "?????" // Placeholder
    }

    // Abort the stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Calculate final results from current model states
    const modelResults: WordleModelResult[] = []
    const now = Date.now()
    const gameStartTime = state.startedAt || now

    // Process each AI model
    config.models.forEach((model) => {
      const gameState = modelStates.get(model.id) || {
        modelId: model.id,
        guesses: [],
        solved: false,
        failed: false,
      }

      const isStillRunning = workingModels.has(model.id)
      const didNotFinish = isStillRunning && !gameState.solved && !gameState.failed

      // Calculate total time spent
      let totalTime: number | undefined
      if (gameState.solved && gameState.timeToSolveMs) {
        totalTime = gameState.timeToSolveMs
      } else if (gameState.guesses.length > 0) {
        // Calculate time from first guess to last guess, or to now if still running
        const firstGuess = gameState.guesses[0]
        const lastGuess = gameState.guesses[gameState.guesses.length - 1]
        if (didNotFinish) {
          // Still running - use time from start to now
          totalTime = now - gameStartTime
        } else {
          // Use time from first to last guess
          totalTime = lastGuess.tLast - firstGuess.tRequest
        }
      } else if (didNotFinish) {
        // Started but no guesses yet - use time from start to now
        totalTime = now - gameStartTime
      }

      // Calculate closeness for failed/didn't finish attempts (feedback is already calculated)
      let closenessScore: number | undefined
      let correctLetters: number | undefined
      let presentLetters: number | undefined

      if (!gameState.solved && gameState.guesses.length > 0) {
        const lastGuess = gameState.guesses[gameState.guesses.length - 1]
        const closeness = calculateClosenessScore(lastGuess.feedback)
        closenessScore = closeness.totalScore
        correctLetters = closeness.correctCount
        presentLetters = closeness.presentCount
      }

      // Calculate total tokens and cost
      let totalTokens = 0
      let totalCost = 0
      let totalPromptTokens = 0
      let totalCompletionTokens = 0

      gameState.guesses.forEach((guess) => {
        if (guess.tokenUsage) {
          totalTokens += guess.tokenUsage.total
          totalPromptTokens += guess.tokenUsage.prompt
          totalCompletionTokens += guess.tokenUsage.completion
        }
      })

      if (totalPromptTokens > 0 || totalCompletionTokens > 0) {
        // Use baseModelId for cost calculation if this is a custom entry
        const modelIdForCost = model.baseModelId || model.id
        totalCost = calculateEstimatedCost(modelIdForCost, totalPromptTokens, totalCompletionTokens)
      }

      modelResults.push({
        modelId: model.id,
        modelName: model.name || model.id,
        solved: gameState.solved,
        guessCount: gameState.solved ? gameState.solvedAtGuess! : gameState.guesses.length,
        timeToSolveMs: gameState.solved ? totalTime : didNotFinish ? totalTime : undefined,
        closenessScore,
        correctLetters,
        presentLetters,
        totalTokens: totalTokens > 0 ? totalTokens : undefined,
        totalCost: totalCost > 0 ? totalCost : undefined,
        didNotFinish,
        rank: 0, // Will be set after sorting
      })
    })

    // Add user result if participating
    if (includeUser && userGameState) {
      const didNotFinish = !userGameState.solved && !userGameState.failed && userGameState.guesses.length < 6

      // Calculate closeness for failed attempts (only if we have target word)
      let closenessScore: number | undefined
      let correctLetters: number | undefined
      let presentLetters: number | undefined

      if (finalTargetWord && !userGameState.solved && userGameState.guesses.length > 0) {
        const lastGuess = userGameState.guesses[userGameState.guesses.length - 1]
        const closeness = calculateClosenessScore(lastGuess.feedback)
        closenessScore = closeness.totalScore
        correctLetters = closeness.correctCount
        presentLetters = closeness.presentCount
      }

      // Calculate total tokens and cost for user
      let totalTokens = 0
      let totalCost = 0
      let totalPromptTokens = 0
      let totalCompletionTokens = 0

      userGameState.guesses.forEach((guess) => {
        if (guess.tokenUsage) {
          totalTokens += guess.tokenUsage.total
          totalPromptTokens += guess.tokenUsage.prompt
          totalCompletionTokens += guess.tokenUsage.completion
        }
      })

      if (totalPromptTokens > 0 || totalCompletionTokens > 0) {
        totalCost = calculateEstimatedCost("user", totalPromptTokens, totalCompletionTokens)
      }

      // Calculate time spent
      let totalTime: number | undefined
      if (userGameState.solved && userGameState.timeToSolveMs) {
        totalTime = userGameState.timeToSolveMs
      } else if (userGameState.guesses.length > 0) {
        if (didNotFinish && userStartTimeRef.current) {
          // Still running - use time from start to now
          totalTime = now - userStartTimeRef.current
        } else {
          // Use time from first to last guess
          const firstGuess = userGameState.guesses[0]
          const lastGuess = userGameState.guesses[userGameState.guesses.length - 1]
          totalTime = lastGuess.tLast - firstGuess.tRequest
        }
      } else if (didNotFinish && userStartTimeRef.current) {
        // Started but no guesses yet - use time from start to now
        totalTime = now - userStartTimeRef.current
      }

      modelResults.push({
        modelId: "user",
        modelName: "You",
        solved: userGameState.solved,
        guessCount: userGameState.solved ? userGameState.solvedAtGuess! : userGameState.guesses.length,
        timeToSolveMs: userGameState.solved ? totalTime : didNotFinish ? totalTime : undefined,
        closenessScore,
        correctLetters,
        presentLetters,
        totalTokens: totalTokens > 0 ? totalTokens : undefined,
        totalCost: totalCost > 0 ? totalCost : undefined,
        didNotFinish,
        rank: 0, // Will be set after sorting
      })
    }

    rankWordleResults(modelResults)
    const winner = modelResults.find((r) => r.solved && r.rank === 1)?.modelId

    const finalResult: WordleRaceResult = {
      gameId: config.id,
      targetWord: finalTargetWord,
      modelResults,
      winner,
    }

    // Update state
    setResult(finalResult)
    setIsRunning(false)
    setWorkingModels(new Set())
    setState((prev) => ({
      ...prev!,
      status: "completed",
      completedAt: now,
    }))
    
    // Store target word for display
    setTargetWord(finalTargetWord)
  }, [config, state, targetWord, result, modelStates, workingModels, includeUser, userGameState])

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
    currentGuessThinking,
    submitUserGuess,
    startWordleRace,
    endEarly,
    reset,
  }
}
