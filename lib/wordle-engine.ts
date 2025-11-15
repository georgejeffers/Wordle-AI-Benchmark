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
import { computeWordleFeedback, extractWordleGuess } from "./wordle-utils"
import { isValidWord } from "./wordle-words"

export interface WordleCallbacks {
  onStateChange?: (state: WordleState) => void
  onModelStart?: (modelId: string, guessIndex: number) => void
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

      // Generate prompt with previous guesses
      const prompt = generateWordlePrompt(this.config.targetWord, previousGuesses)

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
      })

      // Use timing from the attempt result
      const tRequest = result.attempt.tRequest
      const tLast = result.attempt.tLast
      const e2eMs = result.attempt.e2eMs

      // Extract the guessed word
      const guessedWord = extractWordleGuess(result.attempt.output) || result.attempt.normalized || ""

      // Validate guess
      let validGuess = guessedWord.length === 5 && /^[a-z]{5}$/.test(guessedWord)
      if (!validGuess && guessedWord) {
        // Try to clean it up
        const cleaned = guessedWord.toLowerCase().trim().slice(0, 5)
        if (cleaned.length === 5 && /^[a-z]{5}$/.test(cleaned)) {
          validGuess = true
        }
      }

      if (!validGuess || guessedWord.length !== 5) {
        console.warn(`[wordle] Model ${model.id} produced invalid guess: "${result.attempt.output}"`)
        // Use a fallback - just take first 5 letters or pad
        const fallback = guessedWord.slice(0, 5).padEnd(5, "a")
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

      results.push({
        modelId: model.id,
        modelName: model.name,
        solved: gameState.solved,
        guessCount: gameState.solved ? gameState.solvedAtGuess! : this.config.maxGuesses,
        timeToSolveMs: gameState.solved ? totalTime : undefined,
        rank: 0, // Will be set after sorting
      })
    })

    // Sort by: solved first, then by time, then by guess count
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

      // Both failed - rank by guess count (more guesses = better)
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

