// Main race orchestration engine

import type { RaceConfig, Round, ClueAttempt, ClueResult, RoundResult, RaceResult, RaceState } from "./types"
import { runRound } from "./ai-runner"
import { scoreClueAttempts, calculateModelScores, calculateClueStats } from "./scoring"

export interface RaceCallbacks {
  onStateChange?: (state: RaceState) => void
  onModelStart?: (modelId: string, clueId: string) => void
  onModelProgress?: (modelId: string, clueId: string, partialText: string) => void
  onAttemptComplete?: (attempt: ClueAttempt) => void
  onClueComplete?: (clueId: string, attempts: ClueAttempt[]) => void
  onRoundComplete?: (roundResult: RoundResult) => void
  onRaceComplete?: (raceResult: RaceResult) => void
}

/**
 * Main race orchestrator
 */
export class RaceEngine {
  private raceConfig: RaceConfig
  private callbacks: RaceCallbacks
  private allAttempts: ClueAttempt[] = []
  private state: RaceState

  constructor(config: RaceConfig, callbacks: RaceCallbacks = {}) {
    this.raceConfig = config
    this.callbacks = callbacks

    const totalClues = config.rounds.reduce((sum, round) => sum + round.clues.length, 0)

    this.state = {
      raceId: config.id,
      status: "pending",
      completedClues: 0,
      totalClues,
      progress: 0,
    }
  }

  /**
   * Start the race
   */
  async start(): Promise<RaceResult> {
    console.log(`[v0] Starting race ${this.raceConfig.id} with ${this.raceConfig.models.length} models`)

    this.updateState({
      status: "running",
      startedAt: Date.now(),
    })

    const roundResults: RoundResult[] = []

    try {
      // Run each round sequentially
      for (const round of this.raceConfig.rounds) {
        console.log(`[v0] Starting round ${round.id}`)

        this.updateState({
          currentRoundId: round.id,
        })

        const roundResult = await this.runRound(round)
        roundResults.push(roundResult)

        if (this.callbacks.onRoundComplete) {
          this.callbacks.onRoundComplete(roundResult)
        }

        console.log(`[v0] Completed round ${round.id}`)
      }

      // Calculate final scores
      const modelNames = new Map(this.raceConfig.models.map((m) => [m.id, m.name]))

      const finalScores = calculateModelScores(
        this.allAttempts,
        this.raceConfig.models.map((m) => m.id),
        modelNames,
      )

      const winner = finalScores[0]?.modelId

      const raceResult: RaceResult = {
        raceId: this.raceConfig.id,
        roundResults,
        finalScores,
        winner,
      }

      this.updateState({
        status: "completed",
        completedAt: Date.now(),
        progress: 100,
      })

      if (this.callbacks.onRaceComplete) {
        this.callbacks.onRaceComplete(raceResult)
      }

      console.log(`[v0] Race completed! Winner: ${finalScores[0]?.modelName}`)

      return raceResult
    } catch (error) {
      console.error("[v0] Race error:", error)
      this.updateState({
        status: "error",
        completedAt: Date.now(),
      })
      throw error
    }
  }

  /**
   * Run a single round
   */
  private async runRound(round: Round): Promise<RoundResult> {
    const mode = round.outputRule ?? "json"
    const maxTokens = round.maxTokens
    const timeoutMs = round.timeLimitMs

    const attempts = await runRound(
      this.raceConfig.id,
      round.id,
      round.clues,
      this.raceConfig.models,
      mode,
      maxTokens,
      timeoutMs,
      (clueId, clueAttempts) => {
        this.handleClueComplete(clueId, clueAttempts, round)
      },
      (attempt) => {
        this.handleAttemptComplete(attempt)
      },
      (modelId, clueId) => {
        if (this.callbacks.onModelStart) {
          this.callbacks.onModelStart(modelId, clueId)
        }
      },
      (modelId, clueId, partialText) => {
        if (this.callbacks.onModelProgress) {
          this.callbacks.onModelProgress(modelId, clueId, partialText)
        }
      },
    )

    // Group attempts by clue
    const clueResultsMap = new Map<string, ClueAttempt[]>()
    attempts.forEach((attempt) => {
      const existing = clueResultsMap.get(attempt.clueId) || []
      existing.push(attempt)
      clueResultsMap.set(attempt.clueId, existing)
    })

    // Score each clue
    const clueResults: ClueResult[] = []
    round.clues.forEach((clue) => {
      const clueAttempts = clueResultsMap.get(clue.id) || []
      const stats = calculateClueStats(clueAttempts)
      const scoredAttempts = scoreClueAttempts(clueAttempts, clue, mode)

      // Update all attempts with scores
      scoredAttempts.forEach((scored) => {
        const original = this.allAttempts.find(
          (a) => a.clueId === scored.clueId && a.modelId === scored.modelId && a.roundId === scored.roundId,
        )
        if (original) {
          original.clueScore = scored.clueScore
        }
      })

      clueResults.push({
        clueId: clue.id,
        attempts: scoredAttempts,
        minLatMs: stats.minLatMs,
        p95LatMs: stats.p95LatMs,
      })
    })

    // Calculate round scores per model
    const modelScores = new Map<string, number>()
    this.raceConfig.models.forEach((model) => {
      const modelAttempts = attempts.filter((a) => a.modelId === model.id)
      const avgScore =
        modelAttempts.length > 0 ? modelAttempts.reduce((sum, a) => sum + a.clueScore, 0) / modelAttempts.length : 0
      modelScores.set(model.id, avgScore)
    })

    return {
      roundId: round.id,
      clueResults,
      modelScores,
    }
  }

  /**
   * Handle individual attempt completion
   */
  private handleAttemptComplete(attempt: ClueAttempt) {
    this.allAttempts.push(attempt)

    // Update state incrementally
    const completedClues = new Set(this.allAttempts.map((a) => a.clueId)).size

    this.updateState({
      completedClues,
      progress: Math.round((completedClues / this.state.totalClues) * 100),
    })

    if (this.callbacks.onAttemptComplete) {
      this.callbacks.onAttemptComplete(attempt)
    }
  }

  /**
   * Handle clue completion
   */
  private handleClueComplete(clueId: string, attempts: ClueAttempt[], round: Round) {
    this.updateState({
      currentClueId: clueId,
    })

    if (this.callbacks.onClueComplete) {
      this.callbacks.onClueComplete(clueId, attempts)
    }
  }

  /**
   * Update state and notify
   */
  private updateState(updates: Partial<RaceState>) {
    this.state = {
      ...this.state,
      ...updates,
    }

    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(this.state)
    }
  }

  /**
   * Get current state
   */
  getState(): RaceState {
    return this.state
  }
}
