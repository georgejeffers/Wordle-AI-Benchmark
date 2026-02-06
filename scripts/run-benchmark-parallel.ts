#!/usr/bin/env bun
/**
 * Parallel Benchmark Runner - Runs specified models concurrently
 *
 * Usage: bun scripts/run-benchmark-parallel.ts
 */

import { WordleEngine } from "../lib/wordle-engine"
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

// ── Models to benchmark ──────────────────────────────────────
const MODELS_TO_TEST: ModelConfig[] = [
  {
    id: "claude-opus-4.6",
    name: "Claude Opus 4.6",
    modelString: "anthropic/claude-opus-4.6",
    temperature: 0.1,
    enableThinking: false,
  },
  {
    id: "claude-opus-4.5",
    name: "Claude Opus 4.5",
    modelString: "anthropic/claude-opus-4.5",
    temperature: 0.1,
    enableThinking: false,
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    modelString: "openai/gpt-5.2",
    temperature: 0.1,
    topP: 1,
    enableThinking: false,
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    modelString: "openai/gpt-5-nano",
    temperature: 0.1,
    topP: 1,
    enableThinking: false,
  },
  {
    id: "gpt-5.1-none",
    name: "GPT-5.1 (No Reasoning)",
    modelString: "openai/gpt-5.1",
    temperature: 0.1,
    topP: 1,
    enableThinking: false, // Fixed: was incorrectly true in previous run
  },
]

// ── Load benchmark words ─────────────────────────────────────
const wordsPath = path.join(__dirname, "../data/benchmark-words.json")
const wordsData = JSON.parse(fs.readFileSync(wordsPath, "utf-8"))
const BENCHMARK_WORDS: string[] = wordsData.words

// ── Load existing results ────────────────────────────────────
const resultsPath = path.join(__dirname, "../data/benchmark-results.json")
let existingData: BenchmarkResults = JSON.parse(fs.readFileSync(resultsPath, "utf-8"))

/**
 * Run a single Wordle game
 */
async function runSingleGame(model: ModelConfig, targetWord: string): Promise<BenchmarkGameResult> {
  const config: WordleConfig = {
    id: `bench-${model.id}-${targetWord}-${Date.now()}`,
    name: `${model.name} vs ${targetWord}`,
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
    if (!modelResult) throw new Error("No result")

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
    console.error(`  [ERROR] ${model.id} on "${targetWord}":`, error)
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
 * Calculate stats from games
 */
function calculateModelStats(games: BenchmarkGameResult[]): BenchmarkModelStats {
  const solved = games.filter(g => g.solved)
  const gamesPlayed = games.length
  const gamesSolved = solved.length
  const winRate = gamesPlayed > 0 ? (gamesSolved / gamesPlayed) * 100 : 0
  const avgGuesses = solved.length > 0
    ? solved.reduce((s, g) => s + g.guessCount, 0) / solved.length
    : 6
  const validTimes = solved.filter(g => g.timeMs > 0).map(g => g.timeMs).sort((a, b) => a - b)
  const medianTimeMs = validTimes.length > 0 ? validTimes[Math.floor(validTimes.length / 2)] : 0
  const avgTimeMs = validTimes.length > 0 ? validTimes.reduce((s, t) => s + t, 0) / validTimes.length : 0
  const totalTokens = games.reduce((s, g) => s + g.tokens, 0)
  const totalCost = games.reduce((s, g) => s + g.cost, 0)
  const guessDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  solved.forEach(g => {
    const k = g.guessCount as keyof typeof guessDistribution
    if (k >= 1 && k <= 6) guessDistribution[k]++
  })

  return { winRate, avgGuesses, medianTimeMs, avgTimeMs, totalTokens, totalCost, gamesPlayed, gamesSolved, guessDistribution }
}

/**
 * Composite score
 */
function compositeScore(stats: BenchmarkModelStats): number {
  const accuracyScore = stats.winRate
  const speedScore = stats.medianTimeMs > 0
    ? Math.max(0, Math.min(100, 100 - (Math.log10(stats.medianTimeMs / 1000) / Math.log10(120)) * 100))
    : 0
  const guessScore = stats.gamesSolved > 0 ? ((6 - stats.avgGuesses) / 5) * 100 : 0
  return accuracyScore * 0.4 + speedScore * 0.35 + guessScore * 0.25
}

/**
 * Save results (merges with existing data)
 */
function saveResults(newModelResults: Map<string, BenchmarkModelResult>) {
  // Merge new results into existing
  for (const [modelId, result] of newModelResults) {
    const idx = existingData.models.findIndex(m => m.id === modelId)
    if (idx >= 0) {
      existingData.models[idx] = result
    } else {
      existingData.models.push(result)
    }
  }

  // Rebuild leaderboard
  const leaderboard: BenchmarkLeaderboardEntry[] = existingData.models
    .map(m => ({
      rank: 0,
      modelId: m.id,
      modelName: m.name,
      score: compositeScore(m.stats),
      winRate: m.stats.winRate,
      avgGuesses: m.stats.avgGuesses,
      medianTimeMs: m.stats.medianTimeMs,
      totalCost: m.stats.totalCost,
    }))
    .sort((a, b) => b.score - a.score)

  leaderboard.forEach((e, i) => { e.rank = i + 1 })
  existingData.leaderboard = leaderboard

  // Update metadata
  existingData.metadata.runDate = new Date().toISOString()
  existingData.metadata.totalModels = existingData.models.length
  existingData.metadata.totalGames = existingData.models.reduce((s, m) => s + m.stats.gamesPlayed, 0)
  existingData.metadata.totalCost = existingData.models.reduce((s, m) => s + m.stats.totalCost, 0)

  fs.writeFileSync(resultsPath, JSON.stringify(existingData, null, 2))
}

/**
 * Benchmark a single model across all words (with word-level concurrency)
 */
async function benchmarkModel(
  model: ModelConfig,
  words: string[],
  allResults: Map<string, BenchmarkModelResult>
): Promise<BenchmarkModelResult> {
  const games: BenchmarkGameResult[] = []
  const WORD_CONCURRENCY = 3
  const queue = [...words]
  const active: Promise<void>[] = []
  let done = 0

  while (queue.length > 0 || active.length > 0) {
    while (queue.length > 0 && active.length < WORD_CONCURRENCY) {
      const word = queue.shift()!
      const p = runSingleGame(model, word).then(result => {
        games.push(result)
        done++
        const status = result.solved ? `SOLVED in ${result.guessCount}` : "FAILED"
        process.stdout.write(`  [${model.name}] ${done}/${words.length} "${result.word}": ${status} (${(result.timeMs / 1000).toFixed(1)}s)\n`)

        // Save intermediate after every 5 games
        if (done % 5 === 0) {
          const partial: BenchmarkModelResult = {
            id: model.id,
            name: model.name,
            modelString: model.modelString,
            enableThinking: model.enableThinking,
            stats: calculateModelStats(games),
            games: [...games],
          }
          allResults.set(model.id, partial)
          saveResults(allResults)
        }
      })
      active.push(p)
      p.finally(() => {
        const idx = active.indexOf(p)
        if (idx > -1) active.splice(idx, 1)
      })
    }
    if (active.length > 0) await Promise.race(active)
  }

  const stats = calculateModelStats(games)
  const result: BenchmarkModelResult = {
    id: model.id,
    name: model.name,
    modelString: model.modelString,
    enableThinking: model.enableThinking,
    stats,
    games,
  }

  console.log(`\n  ✓ ${model.name}: ${stats.winRate.toFixed(0)}% win rate, ${stats.avgGuesses.toFixed(2)} avg guesses, ${(stats.medianTimeMs / 1000).toFixed(1)}s median`)
  return result
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(70))
  console.log("  PARALLEL BENCHMARK RUNNER")
  console.log(`  ${MODELS_TO_TEST.length} models × ${BENCHMARK_WORDS.length} words = ${MODELS_TO_TEST.length * BENCHMARK_WORDS.length} games`)
  console.log(`  All models running concurrently, 3 words at a time per model`)
  console.log("=".repeat(70))
  console.log()

  const startTime = Date.now()
  const allResults = new Map<string, BenchmarkModelResult>()

  // Run ALL models in parallel
  const modelPromises = MODELS_TO_TEST.map(model => {
    console.log(`Starting: ${model.name} (${model.modelString})`)
    return benchmarkModel(model, BENCHMARK_WORDS, allResults)
  })

  const results = await Promise.all(modelPromises)

  // Store final results
  results.forEach(r => allResults.set(r.id, r))
  saveResults(allResults)

  const elapsed = (Date.now() - startTime) / 1000 / 60
  console.log("\n" + "=".repeat(70))
  console.log("  BENCHMARK COMPLETE")
  console.log(`  Time: ${elapsed.toFixed(1)} minutes`)
  console.log("=".repeat(70))
  console.log("\nResults:")
  console.log("-".repeat(70))

  results
    .sort((a, b) => b.stats.winRate - a.stats.winRate || a.stats.avgGuesses - b.stats.avgGuesses)
    .forEach((r, i) => {
      const score = compositeScore(r.stats)
      console.log(`  ${i + 1}. ${r.name.padEnd(30)} Win: ${r.stats.winRate.toFixed(0)}% | Guesses: ${r.stats.avgGuesses.toFixed(2)} | Score: ${score.toFixed(1)}`)
    })
}

main().catch(console.error)
