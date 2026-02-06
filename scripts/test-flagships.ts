#!/usr/bin/env bun
/**
 * Quick test script to race the latest flagship models against each other in Wordle.
 * Usage: bun scripts/test-flagships.ts [targetWord]
 */

import { WordleEngine } from "../lib/wordle-engine"
import type { ModelConfig, WordleConfig, WordleGuess, WordleGameState, WordleRaceResult } from "../lib/types"
import { getRandomWord } from "../lib/wordle-words"

// Latest flagship models to test
const FLAGSHIP_MODELS: ModelConfig[] = [
  {
    id: "claude-opus-4.6-thinking",
    name: "Claude Opus 4.6 (Thinking)",
    modelString: "anthropic/claude-opus-4.6",
    temperature: 0.1,
    enableThinking: true,
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    modelString: "openai/gpt-5.2",
    temperature: 0.1,
    topP: 1,
    enableThinking: true,
    reasoningEffort: "medium",
  },
  {
    id: "gemini-3-pro-preview-thinking",
    name: "Gemini 3 Pro Preview (Thinking)",
    modelString: "google/gemini-3-pro-preview",
    temperature: 0.1,
    topP: 1,
    enableThinking: true,
    thinkingLevel: "medium",
  },
  {
    id: "gpt-5.1-high",
    name: "GPT-5.1 (High Reasoning)",
    modelString: "openai/gpt-5.1",
    temperature: 0.1,
    topP: 1,
    enableThinking: true,
    reasoningEffort: "high",
  },
]

async function main() {
  const targetWord = process.argv[2] || getRandomWord()

  console.log("=".repeat(60))
  console.log("  WORDLE AI FLAGSHIP BENCHMARK")
  console.log("=".repeat(60))
  console.log(`  Target word: ${targetWord}`)
  console.log(`  Models: ${FLAGSHIP_MODELS.map(m => m.name).join(", ")}`)
  console.log("=".repeat(60))
  console.log()

  const config: WordleConfig = {
    id: `test-flagships-${Date.now()}`,
    name: "Flagship Benchmark",
    models: FLAGSHIP_MODELS,
    targetWord,
    wordLength: 5,
    maxGuesses: 6,
    createdAt: Date.now(),
  }

  const engine = new WordleEngine(config, {
    onModelStart: (modelId, guessIndex) => {
      const model = FLAGSHIP_MODELS.find(m => m.id === modelId)
      console.log(`  [${model?.name || modelId}] Starting guess #${guessIndex + 1}...`)
    },
    onGuessComplete: (guess: WordleGuess) => {
      const model = FLAGSHIP_MODELS.find(m => m.id === guess.modelId)
      const feedbackStr = guess.feedback.map(f =>
        f === "correct" ? "🟩" : f === "present" ? "🟨" : "⬛"
      ).join("")
      console.log(`  [${model?.name || guess.modelId}] Guess #${guess.guessIndex + 1}: ${guess.word.toUpperCase()} ${feedbackStr} (${guess.e2eMs.toFixed(0)}ms)`)
    },
    onModelComplete: (modelId, gameState) => {
      const model = FLAGSHIP_MODELS.find(m => m.id === modelId)
      if (gameState.solved) {
        console.log(`  [${model?.name || modelId}] SOLVED in ${gameState.solvedAtGuess} guesses!`)
      } else {
        console.log(`  [${model?.name || modelId}] FAILED after ${gameState.guesses.length} guesses`)
      }
      console.log()
    },
    onRaceComplete: (result: WordleRaceResult) => {
      console.log()
      console.log("=".repeat(60))
      console.log("  RESULTS")
      console.log("=".repeat(60))
      console.log()

      result.modelResults.forEach((r, i) => {
        const status = r.solved ? `Solved in ${r.guessCount} guesses` : `Failed (closeness: ${r.closenessScore?.toFixed(1) || "N/A"})`
        const time = r.timeToSolveMs ? `${(r.timeToSolveMs / 1000).toFixed(1)}s` : "N/A"
        const cost = r.totalCost ? `$${r.totalCost.toFixed(6)}` : "N/A"
        console.log(`  #${r.rank} ${r.modelName}`)
        console.log(`     ${status} | Time: ${time} | Cost: ${cost}`)
        console.log()
      })

      if (result.winner) {
        const winnerModel = FLAGSHIP_MODELS.find(m => m.id === result.winner)
        console.log(`  WINNER: ${winnerModel?.name || result.winner}`)
      } else {
        console.log(`  No winner - all models failed!`)
      }
      console.log("=".repeat(60))
    },
  })

  await engine.start()
}

main().catch(console.error)
