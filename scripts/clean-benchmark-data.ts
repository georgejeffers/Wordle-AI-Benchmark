#!/usr/bin/env bun
/**
 * Removes models with known bad data from benchmark-results.json
 */
import * as fs from "fs"
import * as path from "path"

const filePath = path.join(__dirname, "../data/benchmark-results.json")
const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))

const BAD_MODEL_IDS = new Set([
  "gpt-5.1-none",       // Config bug: ran with thinking enabled
  "gemini-2.5-pro",     // Cached/fallback responses, 0 tokens
  "gemini-3-pro-preview", // Cached/fallback responses, 0 tokens
])

const removedNames: string[] = []

// Remove from models array
data.models = data.models.filter((m: any) => {
  if (BAD_MODEL_IDS.has(m.id)) {
    removedNames.push(`${m.name} (${m.id}): ${m.stats.gamesPlayed} games, ${m.stats.winRate}% win rate`)
    return false
  }
  return true
})

// Remove from leaderboard
data.leaderboard = data.leaderboard.filter((e: any) => !BAD_MODEL_IDS.has(e.modelId))

// Re-rank leaderboard
data.leaderboard.sort((a: any, b: any) => b.score - a.score)
data.leaderboard.forEach((e: any, i: number) => { e.rank = i + 1 })

// Update metadata
data.metadata.totalModels = data.models.length
data.metadata.totalGames = data.models.reduce((sum: number, m: any) => sum + m.stats.gamesPlayed, 0)

fs.writeFileSync(filePath, JSON.stringify(data, null, 2))

console.log("Removed bad model data:")
removedNames.forEach(n => console.log(`  - ${n}`))
console.log(`\nRemaining: ${data.models.length} models, ${data.metadata.totalGames} games`)
