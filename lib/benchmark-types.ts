// Benchmark data structures for Wordle AI benchmarking

export interface BenchmarkGameResult {
  word: string
  solved: boolean
  guessCount: number // 1-6
  timeMs: number
  guesses: string[] // The actual guesses made
  tokens: number
  cost: number // USD estimate
}

export interface BenchmarkModelStats {
  winRate: number // 0-100
  avgGuesses: number // average guesses for solved games
  medianTimeMs: number
  avgTimeMs: number
  totalTokens: number
  totalCost: number
  gamesPlayed: number
  gamesSolved: number
  // Distribution of guesses (1-6) for solved games
  guessDistribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
    6: number
  }
}

export interface BenchmarkModelResult {
  id: string
  name: string
  modelString: string
  enableThinking?: boolean
  thinkingLevel?: string
  reasoningEffort?: string
  stats: BenchmarkModelStats
  games: BenchmarkGameResult[]
}

export interface BenchmarkLeaderboardEntry {
  rank: number
  modelId: string
  modelName: string
  score: number // Composite score for ranking
  winRate: number
  avgGuesses: number
  medianTimeMs: number
  totalCost: number
}

export interface BenchmarkMetadata {
  runDate: string // ISO date
  wordCount: number
  version: string
  totalModels: number
  totalGames: number
  totalCost: number
  runDurationMs: number
}

export interface BenchmarkResults {
  metadata: BenchmarkMetadata
  words: string[]
  models: BenchmarkModelResult[]
  leaderboard: BenchmarkLeaderboardEntry[]
}

// Word difficulty analysis
export interface WordDifficulty {
  word: string
  solveRate: number // % of models that solved it
  avgGuesses: number // across all models that solved
  hardestFor: string[] // model names that failed
}

export interface BenchmarkAnalysis {
  hardestWords: WordDifficulty[]
  easiestWords: WordDifficulty[]
  modelComparisons: {
    fastest: { modelId: string; modelName: string; avgTimeMs: number }
    cheapest: { modelId: string; modelName: string; totalCost: number }
    mostAccurate: { modelId: string; modelName: string; winRate: number }
    mostEfficient: { modelId: string; modelName: string; avgGuesses: number }
  }
}

export type BenchmarkTab = "overview" | "winrate" | "guesses" | "speed" | "cost" | "combined"
