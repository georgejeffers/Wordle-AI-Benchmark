#!/usr/bin/env bun
/**
 * Benchmark Runner - Runs all models against 50 Wordle words and saves results
 *
 * Usage:
 *   bun scripts/run-benchmark.ts           # Run full benchmark
 *   bun scripts/run-benchmark.ts --resume  # Resume from previous results
 *   bun scripts/run-benchmark.ts --quick   # Quick test (5 words, 5 models)
 */

import { WordleEngine } from "../lib/wordle-engine"
import { DEFAULT_MODELS } from "../lib/constants"
import type { ModelConfig, WordleConfig, WordleRaceResult } from "../lib/types"
import type {
  BenchmarkResults,
  BenchmarkModelResult,
  BenchmarkGameResult,
  BenchmarkModelStats,
  BenchmarkLeaderboardEntry,
  BenchmarkMetadata,
} from "../lib/benchmark-types"
import * as fs from "fs"
import * as path from "path"

// Load benchmark words
const wordsPath = path.join(__dirname, "../data/benchmark-words.json")
const wordsData = JSON.parse(fs.readFileSync(wordsPath, "utf-8"))
const BENCHMARK_WORDS: string[] = wordsData.words

/**
 * Run a single Wordle game for one model
 */
async function runSingleGame(model: ModelConfig, targetWord: string): Promise<BenchmarkGameResult> {
  const config: WordleConfig = {
    id: `benchmark-${model.id}-${targetWord}-${Date.now()}`,
    name: `Benchmark: ${model.name} vs ${targetWord}`,
    models: [model],
    targetWord,
    wordLength: 5,
    maxGuesses: 6,
    createdAt: Date.now(),
  }

  const engine = new WordleEngine(config, {})
  const startTime = Date.now()

  try {
    const result: WordleRaceResult = await engine.start()
    const endTime = Date.now()

    const modelResult = result.modelResults[0]
    if (!modelResult) {
      throw new Error("No model result returned")
    }

    const state = engine.getState()
    const gameState = state.modelStates.get(model.id)
    const guesses = gameState?.guesses.map(g => g.word) || []

    return {
      word: targetWord,
      solved: modelResult.solved,
      guessCount: modelResult.guessCount,
      timeMs: endTime - startTime,
      guesses,
      tokens: modelResult.totalTokens || 0,
      cost: modelResult.totalCost || 0,
    }
  } catch (error) {
    console.error(`Error running game for ${model.id} on word "${targetWord}":`, error)
    return {
      word: targetWord,
      solved: false,
      guessCount: 6,
      timeMs: 0,
      guesses: [],
      tokens: 0,
      cost: 0,
    }
  }
}

/**
 * Calculate aggregate stats for a model
 */
function calculateModelStats(games: BenchmarkGameResult[]): BenchmarkModelStats {
  const solvedGames = games.filter(g => g.solved)
  const gamesPlayed = games.length
  const gamesSolved = solvedGames.length

  const winRate = gamesPlayed > 0 ? (gamesSolved / gamesPlayed) * 100 : 0

  const avgGuesses = solvedGames.length > 0
    ? solvedGames.reduce((sum, g) => sum + g.guessCount, 0) / solvedGames.length
    : 6

  const validTimes = solvedGames.filter(g => g.timeMs > 0).map(g => g.timeMs)
  const sortedTimes = validTimes.sort((a, b) => a - b)
  const medianTimeMs = sortedTimes.length > 0
    ? sortedTimes[Math.floor(sortedTimes.length / 2)]
    : 0
  const avgTimeMs = validTimes.length > 0
    ? validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length
    : 0

  const totalTokens = games.reduce((sum, g) => sum + g.tokens, 0)
  const totalCost = games.reduce((sum, g) => sum + g.cost, 0)

  const guessDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  solvedGames.forEach(g => {
    const key = g.guessCount as keyof typeof guessDistribution
    if (key >= 1 && key <= 6) {
      guessDistribution[key]++
    }
  })

  return {
    winRate,
    avgGuesses,
    medianTimeMs,
    avgTimeMs,
    totalTokens,
    totalCost,
    gamesPlayed,
    gamesSolved,
    guessDistribution,
  }
}

/**
 * Calculate composite score for leaderboard ranking
 * Best model = most accurate + fastest + fewest guesses
 * Weights: Accuracy (40%), Speed (35%), Guess Efficiency (25%)
 */
function calculateCompositeScore(stats: BenchmarkModelStats): number {
  const accuracyScore = stats.winRate
  const speedScore = stats.medianTimeMs > 0
    ? Math.max(0, Math.min(100, 100 - (Math.log10(stats.medianTimeMs / 1000) / Math.log10(120)) * 100))
    : 0
  const guessScore = stats.gamesSolved > 0
    ? ((6 - stats.avgGuesses) / 5) * 100
    : 0

  return (accuracyScore * 0.4) + (speedScore * 0.35) + (guessScore * 0.25)
}

/**
 * Create leaderboard from model results
 */
function createLeaderboard(modelResults: BenchmarkModelResult[]): BenchmarkLeaderboardEntry[] {
  const entries: BenchmarkLeaderboardEntry[] = modelResults.map(model => ({
    rank: 0,
    modelId: model.id,
    modelName: model.name,
    score: calculateCompositeScore(model.stats),
    winRate: model.stats.winRate,
    avgGuesses: model.stats.avgGuesses,
    medianTimeMs: model.stats.medianTimeMs,
    totalCost: model.stats.totalCost,
  }))

  entries.sort((a, b) => b.score - a.score)
  entries.forEach((entry, i) => {
    entry.rank = i + 1
  })

  return entries
}

/**
 * Save intermediate results
 */
function saveIntermediateResults(
  modelResults: BenchmarkModelResult[],
  words: string[],
  startTime: number
) {
  const leaderboard = createLeaderboard(modelResults)

  const metadata: BenchmarkMetadata = {
    runDate: new Date().toISOString(),
    wordCount: words.length,
    version: "1.0-partial",
    totalModels: modelResults.length,
    totalGames: modelResults.reduce((sum, m) => sum + m.games.length, 0),
    totalCost: modelResults.reduce((sum, m) => sum + m.stats.totalCost, 0),
    runDurationMs: Date.now() - startTime,
  }

  const results: BenchmarkResults = {
    metadata,
    words,
    models: modelResults,
    leaderboard,
  }

  const outputPath = path.join(__dirname, "../data/benchmark-results.json")
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`  [Intermediate results saved: ${modelResults.length} models]`)
}

/**
 * Run benchmark for a single model across all words
 */
async function benchmarkModel(
  model: ModelConfig,
  words: string[],
  initialGames: BenchmarkGameResult[],
  modelResults: BenchmarkModelResult[],
  allWords: string[],
  startTime: number
): Promise<BenchmarkModelResult> {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`Starting benchmark for: ${model.name}`)
  if (initialGames.length > 0) {
    console.log(`  [Resuming from ${initialGames.length} completed games]`)
  }
  console.log(`${"=".repeat(60)}`)

  const games: BenchmarkGameResult[] = [...initialGames]
  const completedWords = new Set(games.map(g => g.word))
  const remainingWords = words.filter(w => !completedWords.has(w))

  const CONCURRENCY = 2
  const queue = [...remainingWords]
  const activePromises: Promise<void>[] = []
  let completedCount = 0
  const totalToRun = remainingWords.length

  console.log(`  Processing ${totalToRun} words with concurrency ${CONCURRENCY}...`)

  while (queue.length > 0 || activePromises.length > 0) {
    while (queue.length > 0 && activePromises.length < CONCURRENCY) {
      const word = queue.shift()!
      console.log(`  [Starting] Word: "${word}"...`)

      const promise = runSingleGame(model, word).then(async (gameResult) => {
        games.push(gameResult)
        completedCount++

        const status = gameResult.solved ? `SOLVED in ${gameResult.guessCount}` : "FAILED"
        console.log(`    -> [${completedCount}/${totalToRun}] ${gameResult.word}: ${status} (${gameResult.timeMs}ms, ${gameResult.tokens} tokens)`)

        const currentModelResult: BenchmarkModelResult = {
          id: model.id,
          name: model.name,
          modelString: model.modelString,
          enableThinking: model.enableThinking,
          thinkingLevel: model.thinkingLevel,
          reasoningEffort: model.reasoningEffort,
          stats: calculateModelStats(games),
          games: [...games],
        }

        const existingIndex = modelResults.findIndex(m => m.id === model.id)
        if (existingIndex >= 0) {
          modelResults[existingIndex] = currentModelResult
        } else {
          modelResults.push(currentModelResult)
        }

        saveIntermediateResults(modelResults, allWords, startTime)
      })

      activePromises.push(promise)

      promise.finally(() => {
        const idx = activePromises.indexOf(promise)
        if (idx > -1) {
          activePromises.splice(idx, 1)
        }
      })
    }

    if (activePromises.length > 0) {
      await Promise.race(activePromises)
    }
  }

  const stats = calculateModelStats(games)

  console.log(`\n  Summary for ${model.name}:`)
  console.log(`    Win Rate: ${stats.winRate.toFixed(1)}%`)
  console.log(`    Avg Guesses: ${stats.avgGuesses.toFixed(2)}`)
  console.log(`    Median Time: ${stats.medianTimeMs.toFixed(0)}ms`)
  console.log(`    Total Cost: $${stats.totalCost.toFixed(4)}`)

  return {
    id: model.id,
    name: model.name,
    modelString: model.modelString,
    enableThinking: model.enableThinking,
    thinkingLevel: model.thinkingLevel,
    reasoningEffort: model.reasoningEffort,
    stats,
    games,
  }
}

/**
 * Load existing results for resume
 */
function loadExistingResults(): BenchmarkResults | null {
  const outputPath = path.join(__dirname, "../data/benchmark-results.json")
  try {
    if (fs.existsSync(outputPath)) {
      const data = JSON.parse(fs.readFileSync(outputPath, "utf-8"))
      return data as BenchmarkResults
    }
  } catch {
    console.log("No existing results found or error loading them")
  }
  return null
}

/**
 * Main benchmark runner
 */
async function runBenchmark(quickTest = false, resume = false) {
  const testModels = quickTest ? DEFAULT_MODELS.slice(0, 5) : DEFAULT_MODELS
  const testWords = quickTest ? BENCHMARK_WORDS.slice(0, 5) : BENCHMARK_WORDS

  let existingResults: BenchmarkResults | null = null
  const modelResults: BenchmarkModelResult[] = []

  if (resume) {
    existingResults = loadExistingResults()
    if (existingResults && existingResults.models.length > 0) {
      if (existingResults.words.length === testWords.length) {
        modelResults.push(...existingResults.models)
        console.log("\n" + "=".repeat(70))
        console.log("  RESUMING BENCHMARK")
        console.log(`  Found ${modelResults.length} existing model results`)
        console.log("=".repeat(70) + "\n")
      } else {
        console.log("Word count mismatch - starting fresh benchmark")
        existingResults = null
      }
    }
  }

  console.log("\n" + "=".repeat(70))
  console.log("  WORDLE AI BENCHMARK" + (quickTest ? " (QUICK TEST)" : "") + (resume && existingResults ? " (RESUMED)" : ""))
  console.log("  " + testWords.length + " words x " + testModels.length + " models")
  console.log("=".repeat(70) + "\n")

  const startTime = Date.now()

  // Find models that need running
  const remainingModels = testModels.filter(m => {
    const existing = modelResults.find(er => er.id === m.id)
    if (!existing) return true
    if (existing.games.length < testWords.length) return true
    return false
  })

  console.log(`Models to benchmark: ${testModels.length}`)
  console.log(`Already completed: ${testModels.length - remainingModels.length}`)
  console.log(`Remaining: ${remainingModels.length}`)
  console.log()

  for (let i = 0; i < remainingModels.length; i++) {
    const model = remainingModels[i]
    const overallIndex = testModels.findIndex(m => m.id === model.id) + 1
    console.log(`\n[${overallIndex}/${testModels.length}] Benchmarking: ${model.name}`)

    try {
      const existing = modelResults.find(er => er.id === model.id)
      const initialGames = existing ? existing.games : []

      await benchmarkModel(model, testWords, initialGames, modelResults, testWords, startTime)
    } catch (error) {
      console.error(`Failed to benchmark ${model.name}:`, error)
    }
  }

  // Final results
  const leaderboard = createLeaderboard(modelResults)
  const endTime = Date.now()

  const metadata: BenchmarkMetadata = {
    runDate: new Date().toISOString(),
    wordCount: testWords.length,
    version: "1.0",
    totalModels: modelResults.length,
    totalGames: modelResults.reduce((sum, m) => sum + m.games.length, 0),
    totalCost: modelResults.reduce((sum, m) => sum + m.stats.totalCost, 0),
    runDurationMs: endTime - startTime,
  }

  const results: BenchmarkResults = {
    metadata,
    words: testWords,
    models: modelResults,
    leaderboard,
  }

  const outputPath = path.join(__dirname, "../data/benchmark-results.json")
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))

  console.log("\n" + "=".repeat(70))
  console.log("  BENCHMARK COMPLETE")
  console.log("=".repeat(70))
  console.log(`\nResults saved to: ${outputPath}`)
  console.log(`Total time: ${((endTime - startTime) / 1000 / 60).toFixed(1)} minutes`)
  console.log(`Total cost: $${metadata.totalCost.toFixed(4)}`)
  console.log()

  console.log("LEADERBOARD:")
  console.log("-".repeat(70))
  leaderboard.slice(0, 10).forEach((entry, i) => {
    console.log(`  ${i + 1}. ${entry.modelName.padEnd(35)} Score: ${entry.score.toFixed(1)} | Win: ${entry.winRate.toFixed(1)}%`)
  })
}

// Parse args
const args = process.argv.slice(2)
const isQuickTest = args.includes("--quick") || args.includes("-q")
const isResume = args.includes("--resume") || args.includes("-r")

if (isQuickTest) {
  console.log("\n*** QUICK TEST MODE - Running limited benchmark ***\n")
}

if (isResume) {
  console.log("\n*** RESUME MODE - Continuing from previous results ***\n")
}

runBenchmark(isQuickTest, isResume).catch(console.error)
