// Wordle race engine - orchestrates multiple AI models racing to solve Wordle

import type {
  ModelConfig,
  WordleConfig,
  WordleState,
  WordleGuess,
  WordleGameState,
  WordleModelResult,
  WordleRaceResult,
  Clue,
} from "./types"
import { runModelOnClue } from "./ai-runner"
import { generateWordlePrompt } from "./prompts"
import { computeWordleFeedback, extractWordleGuess, calculateClosenessScore, calculateEstimatedCost } from "./wordle-utils"
import { isValidWord } from "./wordle-words"

export interface WordleCallbacks {
  onStateChange?: (state: WordleState) => void
  onModelStart?: (modelId: string, guessIndex: number) => void
  onModelProgress?: (modelId: string, guessIndex: number, reasoning: string) => void
  onGuessComplete?: (guess: WordleGuess) => void
  onModelComplete?: (modelId: string, gameState: WordleGameState) => void
  onRaceComplete?: (result: WordleRaceResult) => void
}

/**
 * Wordle race engine
 */
export class WordleEngine {
  private config: WordleConfig
  private callbacks: WordleCallbacks
  private state: WordleState
  private modelStates: Map<string, WordleGameState>
  private gameStartTime: number

  constructor(config: WordleConfig, callbacks: WordleCallbacks = {}) {
    this.config = config
    this.callbacks = callbacks

    // Initialize model states
    this.modelStates = new Map()
    config.models.forEach((model) => {
      this.modelStates.set(model.id, {
        modelId: model.id,
        guesses: [],
        solved: false,
        failed: false,
      })
    })

    this.state = {
      gameId: config.id,
      status: "pending",
      modelStates: this.modelStates,
    }

    this.gameStartTime = 0
  }

  /**
   * Start the Wordle race
   */
  async start(): Promise<WordleRaceResult> {
    console.log(`[wordle] Starting Wordle race ${this.config.id} with ${this.config.models.length} models`)
    console.log(`[wordle] Target word: ${this.config.targetWord}`)

    const startTime = Date.now()
    this.gameStartTime = startTime
    this.updateState({
      status: "running",
      startedAt: startTime,
    })

    // Run all models in parallel
    const modelPromises = this.config.models.map((model) => this.runModelGame(model))

    await Promise.all(modelPromises)

    // Calculate results
    const modelResults = this.calculateResults()
    const winner = modelResults.find((r) => r.solved && r.rank === 1)?.modelId

    const result: WordleRaceResult = {
      gameId: this.config.id,
      targetWord: this.config.targetWord,
      modelResults,
      winner,
    }

    this.updateState({
      status: "completed",
      completedAt: Date.now(),
    })

    if (this.callbacks.onRaceComplete) {
      this.callbacks.onRaceComplete(result)
    }

    console.log(`[wordle] Race completed! Winner: ${modelResults[0]?.modelName}`)

    return result
  }

  /**
   * Run a single model's Wordle game
   */
  private async runModelGame(model: ModelConfig): Promise<void> {
    const gameState = this.modelStates.get(model.id)!
    const previousGuesses: Array<{ word: string; feedback: Array<"correct" | "present" | "absent"> }> = []

    for (let guessIndex = 0; guessIndex < this.config.maxGuesses; guessIndex++) {
      // Notify model start
      if (this.callbacks.onModelStart) {
        this.callbacks.onModelStart(model.id, guessIndex)
      }

      // Generate prompt with previous guesses (use custom prompt if available)
      const prompt = generateWordlePrompt(
        this.config.targetWord,
        previousGuesses,
        model.customPrompt
      )

      // Create a synthetic clue for the AI runner
      const syntheticClue: Clue = {
        id: `wordle-guess-${guessIndex}`,
        clue: prompt,
        answer: this.config.targetWord,
        length: 5,
        caseRule: "lower",
      }

      // Run the model
      const result = await runModelOnClue({
        raceId: this.config.id,
        roundId: "wordle-round",
        clue: syntheticClue,
        model,
        mode: "plain",
        maxTokens: 10, // Wordle guesses should be short
        timeoutMs: 10000, // 10 second timeout per guess
        onModelProgress: this.callbacks.onModelProgress
          ? (modelId: string, clueId: string, reasoning: string) => {
              // Convert clueId to guessIndex (clueId format: "wordle-guess-N")
              const match = clueId.match(/wordle-guess-(\d+)/)
              const extractedGuessIndex = match ? parseInt(match[1], 10) : guessIndex
              this.callbacks.onModelProgress!(modelId, extractedGuessIndex, reasoning)
            }
          : undefined,
      })

      // Use timing from the attempt result
      const tRequest = result.attempt.tRequest
      const tLast = result.attempt.tLast
      const e2eMs = result.attempt.e2eMs

      // Extract the guessed word
      let guessedWord = extractWordleGuess(result.attempt.output) || result.attempt.normalized || ""

      // Normalize to lowercase for comparison
      guessedWord = guessedWord.toLowerCase().trim()

      // Check if this word has already been guessed
      const previousWords = new Set(previousGuesses.map(g => g.word.toLowerCase()))
      const isDuplicate = previousWords.has(guessedWord)
      
      if (isDuplicate) {
        console.warn(`[wordle] Model ${model.id} repeated previous guess: "${guessedWord}". Previous guesses: ${Array.from(previousWords).join(", ")}`)
        // Mark this as an invalid guess - we'll treat it as if the model failed to produce a valid guess
        guessedWord = ""
      }

      // Validate guess format
      let validGuess = guessedWord.length === 5 && /^[a-z]{5}$/.test(guessedWord)
      if (!validGuess && guessedWord) {
        // Try to clean it up
        const cleaned = guessedWord.toLowerCase().trim().slice(0, 5)
        if (cleaned.length === 5 && /^[a-z]{5}$/.test(cleaned)) {
          // But check again if it's a duplicate after cleaning
          if (!previousWords.has(cleaned)) {
            validGuess = true
            guessedWord = cleaned
          }
        }
      }

      if (!validGuess || guessedWord.length !== 5) {
        console.warn(`[wordle] Model ${model.id} produced invalid guess: "${result.attempt.output}"`)
        // Use a fallback - generate a word that hasn't been guessed yet
        // Try common Wordle starter words that haven't been used
        const commonWords = ["crane", "slate", "adieu", "audio", "house", "mouse", "pound", "round", "sound", "found"]
        let fallback = commonWords.find(w => !previousWords.has(w)) || guessedWord.slice(0, 5).padEnd(5, "a")
        
        // If fallback is still a duplicate, try to modify it
        let attempts = 0
        while (previousWords.has(fallback) && attempts < 10) {
          // Try appending a different letter
          const lastChar = fallback[fallback.length - 1]
          const nextChar = String.fromCharCode(((lastChar.charCodeAt(0) - 97 + 1) % 26) + 97)
          fallback = fallback.slice(0, 4) + nextChar
          attempts++
        }
        
        const feedback = computeWordleFeedback(fallback, this.config.targetWord)
        const correct = fallback === this.config.targetWord.toLowerCase()

        const guess: WordleGuess = {
          modelId: model.id,
          guessIndex,
          word: fallback,
          feedback,
          tRequest,
          tFirst: result.attempt.tFirst,
          tLast,
          e2eMs,
          ttftMs: result.attempt.ttftMs,
          correct,
          tokenUsage: result.attempt.tokenUsage,
        }

        gameState.guesses.push(guess)
        previousGuesses.push({ word: fallback, feedback })

        if (this.callbacks.onGuessComplete) {
          this.callbacks.onGuessComplete(guess)
        }

        if (correct) {
          gameState.solved = true
          gameState.solvedAtGuess = guessIndex + 1
          gameState.timeToSolveMs = e2eMs
          break
        }

        continue
      }

      // Compute feedback
      const feedback = computeWordleFeedback(guessedWord, this.config.targetWord)
      const correct = guessedWord.toLowerCase() === this.config.targetWord.toLowerCase()

      const guess: WordleGuess = {
        modelId: model.id,
        guessIndex,
        word: guessedWord.toLowerCase(),
        feedback,
        tRequest,
        tFirst: result.attempt.tFirst,
        tLast,
        e2eMs,
        ttftMs: result.attempt.ttftMs,
        correct,
        tokenUsage: result.attempt.tokenUsage,
      }

      gameState.guesses.push(guess)
      previousGuesses.push({ word: guessedWord.toLowerCase(), feedback })

      // Update state
      this.modelStates.set(model.id, gameState)
      this.updateState({})

      if (this.callbacks.onGuessComplete) {
        this.callbacks.onGuessComplete(guess)
      }

      // Check if solved
      if (correct) {
        gameState.solved = true
        gameState.solvedAtGuess = guessIndex + 1
        gameState.timeToSolveMs = e2eMs
        this.modelStates.set(model.id, gameState)

        if (this.callbacks.onModelComplete) {
          this.callbacks.onModelComplete(model.id, gameState)
        }
        break
      }
    }

    // Mark as failed if not solved
    if (!gameState.solved) {
      gameState.failed = true
      this.modelStates.set(model.id, gameState)

      if (this.callbacks.onModelComplete) {
        this.callbacks.onModelComplete(model.id, gameState)
      }
    }
  }

  /**
   * Calculate final results and rankings
   */
  private calculateResults(): WordleModelResult[] {
    const results: WordleModelResult[] = []

    this.config.models.forEach((model) => {
      const gameState = this.modelStates.get(model.id)!
      const totalTime = gameState.guesses.reduce((sum, g) => sum + g.e2eMs, 0)

      // Calculate closeness for failed attempts
      let closenessScore: number | undefined
      let correctLetters: number | undefined
      let presentLetters: number | undefined

      if (!gameState.solved && gameState.guesses.length > 0) {
        // Get the last guess to determine closeness
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

      results.push({
        modelId: model.id,
        modelName: model.name || model.id,
        solved: gameState.solved,
        guessCount: gameState.solved ? gameState.solvedAtGuess! : this.config.maxGuesses,
        timeToSolveMs: gameState.solved ? totalTime : undefined,
        closenessScore,
        correctLetters,
        presentLetters,
        totalTokens: totalTokens > 0 ? totalTokens : undefined,
        totalCost: totalCost > 0 ? totalCost : undefined,
        rank: 0, // Will be set after sorting
      })
    })

    // Sort by: solved first, then by time, then by guess count
    // For failed attempts: rank by closeness score (higher = closer)
    results.sort((a, b) => {
      // Solved models rank higher
      if (a.solved !== b.solved) {
        return a.solved ? -1 : 1
      }

      // Among solved models, faster time wins
      if (a.solved && b.solved) {
        const timeA = a.timeToSolveMs || Infinity
        const timeB = b.timeToSolveMs || Infinity
        if (Math.abs(timeA - timeB) > 100) {
          // More than 100ms difference, use time
          return timeA - timeB
        }
        // Times are close, use guess count
        return a.guessCount - b.guessCount
      }

      // Both failed - rank by closeness score (higher = better), then by guess count
      const closenessA = a.closenessScore ?? 0
      const closenessB = b.closenessScore ?? 0
      if (closenessA !== closenessB) {
        return closenessB - closenessA // Higher closeness score ranks higher
      }
      // Same closeness, more guesses = better (they tried harder)
      return b.guessCount - a.guessCount
    })

    // Assign ranks
    results.forEach((result, index) => {
      result.rank = index + 1
    })

    return results
  }

  /**
   * Update state and notify
   */
  private updateState(updates: Partial<WordleState>) {
    this.state = {
      ...this.state,
      ...updates,
      modelStates: this.modelStates,
    }

    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(this.state)
    }
  }

  /**
   * Get current state
   */
  getState(): WordleState {
    return this.state
  }
}

