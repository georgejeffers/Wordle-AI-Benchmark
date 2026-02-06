import type {
  BenchmarkResults,
  BenchmarkModelResult,
  BenchmarkAnalysis,
  WordDifficulty,
  BenchmarkLeaderboardEntry,
} from "./benchmark-types"
import { MODEL_COLORS } from "./constants"
import benchmarkResultsJson from "@/data/benchmark-results.json"

/**
 * Load benchmark results from static JSON
 */
export function loadBenchmarkResults(): BenchmarkResults {
  return benchmarkResultsJson as BenchmarkResults
}

/**
 * Get model color from MODEL_COLORS with fallback
 */
export function getModelColor(modelId: string): string {
  return MODEL_COLORS[modelId] || "#6b7280" // gray fallback
}

/**
 * Filter out models with 0% win rate or no games played
 */
export function filterValidModels(models: BenchmarkModelResult[]): BenchmarkModelResult[] {
  return models.filter(
    (m) => m.stats.gamesPlayed > 0 && m.stats.winRate > 0
  )
}

/**
 * Calculate word difficulty based on solve rates across all models
 */
export function calculateWordDifficulty(
  models: BenchmarkModelResult[],
  words: string[]
): WordDifficulty[] {
  const validModels = filterValidModels(models)

  return words.map((word) => {
    const attempts = validModels
      .map((model) => {
        const game = model.games.find((g) => g.word === word)
        return { model, game }
      })
      .filter(({ game }) => game !== undefined)

    const solved = attempts.filter(({ game }) => game!.solved)
    const failed = attempts.filter(({ game }) => !game!.solved)

    const solveRate =
      attempts.length > 0 ? (solved.length / attempts.length) * 100 : 0

    const avgGuesses =
      solved.length > 0
        ? solved.reduce((sum, { game }) => sum + game!.guessCount, 0) /
          solved.length
        : 6

    return {
      word,
      solveRate,
      avgGuesses,
      hardestFor: failed.map(({ model }) => model.name),
    }
  })
}

/**
 * Compute benchmark analysis (superlatives)
 */
export function computeBenchmarkAnalysis(
  results: BenchmarkResults
): BenchmarkAnalysis {
  const validModels = filterValidModels(results.models)
  const wordDifficulty = calculateWordDifficulty(results.models, results.words)

  // Sort by solve rate
  const sortedByDifficulty = [...wordDifficulty].sort(
    (a, b) => a.solveRate - b.solveRate
  )

  const hardestWords = sortedByDifficulty.slice(0, 5)
  const easiestWords = sortedByDifficulty.slice(-5).reverse()

  // Find superlatives
  const fastest = validModels.reduce((best, m) =>
    m.stats.medianTimeMs < best.stats.medianTimeMs ? m : best
  )

  const cheapest = validModels.reduce((best, m) =>
    m.stats.totalCost < best.stats.totalCost ? m : best
  )

  const mostAccurate = validModels.reduce((best, m) =>
    m.stats.winRate > best.stats.winRate ? m : best
  )

  const solvedModels = validModels.filter((m) => m.stats.gamesSolved > 0)
  const mostEfficient =
    solvedModels.length > 0
      ? solvedModels.reduce((best, m) =>
          m.stats.avgGuesses < best.stats.avgGuesses ? m : best
        )
      : validModels[0]

  return {
    hardestWords,
    easiestWords,
    modelComparisons: {
      fastest: {
        modelId: fastest.id,
        modelName: fastest.name,
        avgTimeMs: fastest.stats.avgTimeMs,
      },
      cheapest: {
        modelId: cheapest.id,
        modelName: cheapest.name,
        totalCost: cheapest.stats.totalCost,
      },
      mostAccurate: {
        modelId: mostAccurate.id,
        modelName: mostAccurate.name,
        winRate: mostAccurate.stats.winRate,
      },
      mostEfficient: {
        modelId: mostEfficient.id,
        modelName: mostEfficient.name,
        avgGuesses: mostEfficient.stats.avgGuesses,
      },
    },
  }
}

/**
 * Calculate composite score for ranking
 * Best model = most accurate + fastest + fewest guesses
 * Weights: Accuracy (40%), Speed (35%), Guess Efficiency (25%)
 */
export function calculateCompositeScore(
  stats: { winRate: number; avgGuesses: number; medianTimeMs: number; gamesSolved: number }
): number {
  // Accuracy: win rate already 0-100
  const accuracyScore = stats.winRate

  // Speed: faster is better. Use log scale so reasoning models aren't crushed.
  // 1s = 100, 10s = 66, 30s = 44, 60s = 33, 120s = 22
  const speedScore =
    stats.medianTimeMs > 0
      ? Math.max(0, Math.min(100, 100 - (Math.log10(stats.medianTimeMs / 1000) / Math.log10(120)) * 100))
      : 0

  // Guess efficiency: fewer guesses is better (1 = 100, 6 = 0)
  const guessScore =
    stats.gamesSolved > 0
      ? ((6 - stats.avgGuesses) / 5) * 100
      : 0

  return accuracyScore * 0.4 + speedScore * 0.35 + guessScore * 0.25
}

/**
 * Build sorted leaderboard from model results
 */
export function buildLeaderboard(
  models: BenchmarkModelResult[]
): BenchmarkLeaderboardEntry[] {
  const entries: BenchmarkLeaderboardEntry[] = models.map((model) => ({
    rank: 0,
    modelId: model.id,
    modelName: model.name,
    score: calculateCompositeScore({
      winRate: model.stats.winRate ?? 0,
      avgGuesses: model.stats.avgGuesses ?? 6,
      medianTimeMs: model.stats.medianTimeMs ?? 0,
      gamesSolved: model.stats.gamesSolved ?? 0,
    }),
    winRate: model.stats.winRate ?? 0,
    avgGuesses: model.stats.avgGuesses ?? 6,
    medianTimeMs: model.stats.medianTimeMs ?? 0,
    totalCost: model.stats.totalCost ?? 0,
  }))

  entries.sort((a, b) => b.score - a.score)
  entries.forEach((entry, i) => {
    entry.rank = i + 1
  })

  return entries
}
