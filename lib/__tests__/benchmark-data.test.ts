import { describe, it, expect } from "vitest"
import {
  loadBenchmarkResults,
  filterValidModels,
  calculateWordDifficulty,
  computeBenchmarkAnalysis,
  calculateCompositeScore,
  buildLeaderboard,
  getModelColor,
} from "../benchmark-data"
import type { BenchmarkModelResult, BenchmarkModelStats } from "../benchmark-types"

// Helper to create a mock model
function makeMockModel(
  overrides: Partial<BenchmarkModelResult> & { id: string; name: string }
): BenchmarkModelResult {
  const defaultStats: BenchmarkModelStats = {
    winRate: 80,
    avgGuesses: 3.5,
    medianTimeMs: 5000,
    avgTimeMs: 5000,
    totalTokens: 1000,
    totalCost: 0.01,
    gamesPlayed: 10,
    gamesSolved: 8,
    guessDistribution: { 1: 0, 2: 1, 3: 3, 4: 3, 5: 1, 6: 0 },
  }

  const { stats: statsOverrides, games, ...rest } = overrides

  return {
    modelString: "test/model",
    stats: { ...defaultStats, ...statsOverrides },
    games: games ?? [],
    ...rest,
  }
}

describe("loadBenchmarkResults", () => {
  it("loads benchmark data with correct structure", () => {
    const data = loadBenchmarkResults()
    expect(data).toBeDefined()
    expect(data.metadata).toBeDefined()
    expect(data.words).toBeDefined()
    expect(Array.isArray(data.words)).toBe(true)
    expect(data.models).toBeDefined()
    expect(Array.isArray(data.models)).toBe(true)
    expect(data.leaderboard).toBeDefined()
  })

  it("has expected metadata fields", () => {
    const data = loadBenchmarkResults()
    expect(data.metadata.wordCount).toBe(50)
    expect(data.metadata.totalModels).toBeGreaterThan(0)
    expect(data.metadata.totalGames).toBeGreaterThan(0)
  })

  it("has 50 benchmark words", () => {
    const data = loadBenchmarkResults()
    expect(data.words).toHaveLength(50)
    expect(data.words).toContain("apple")
    expect(data.words).toContain("zebra")
  })
})

describe("getModelColor", () => {
  it("returns correct color for known model", () => {
    const color = getModelColor("gpt-5")
    expect(color).toBe("#10b981")
  })

  it("returns fallback for unknown model", () => {
    const color = getModelColor("unknown-model-xyz")
    expect(color).toBe("#6b7280")
  })
})

describe("filterValidModels", () => {
  it("filters out models with 0 win rate", () => {
    const models = [
      makeMockModel({ id: "a", name: "A", stats: { winRate: 50 } as any }),
      makeMockModel({ id: "b", name: "B", stats: { winRate: 0, gamesPlayed: 10, gamesSolved: 0 } as any }),
    ]
    const filtered = filterValidModels(models)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe("a")
  })

  it("filters out models with 0 games played", () => {
    const models = [
      makeMockModel({ id: "a", name: "A" }),
      makeMockModel({ id: "b", name: "B", stats: { gamesPlayed: 0, winRate: 0 } as any }),
    ]
    const filtered = filterValidModels(models)
    expect(filtered).toHaveLength(1)
  })
})

describe("calculateCompositeScore", () => {
  it("returns higher score for better win rate", () => {
    const high = calculateCompositeScore({ winRate: 100, avgGuesses: 4, medianTimeMs: 5000, gamesSolved: 50 })
    const low = calculateCompositeScore({ winRate: 50, avgGuesses: 4, medianTimeMs: 5000, gamesSolved: 25 })
    expect(high).toBeGreaterThan(low)
  })

  it("returns higher score for fewer guesses", () => {
    const few = calculateCompositeScore({ winRate: 80, avgGuesses: 2, medianTimeMs: 5000, gamesSolved: 40 })
    const many = calculateCompositeScore({ winRate: 80, avgGuesses: 5, medianTimeMs: 5000, gamesSolved: 40 })
    expect(few).toBeGreaterThan(many)
  })

  it("returns 0 guess score when no games solved", () => {
    const score = calculateCompositeScore({ winRate: 0, avgGuesses: 6, medianTimeMs: 0, gamesSolved: 0 })
    expect(score).toBe(0)
  })

  it("returns higher score for faster speed", () => {
    const fast = calculateCompositeScore({ winRate: 80, avgGuesses: 4, medianTimeMs: 2000, gamesSolved: 40 })
    const slow = calculateCompositeScore({ winRate: 80, avgGuesses: 4, medianTimeMs: 60000, gamesSolved: 40 })
    expect(fast).toBeGreaterThan(slow)
  })

  it("score is between 0 and 100", () => {
    const perfect = calculateCompositeScore({ winRate: 100, avgGuesses: 1, medianTimeMs: 1000, gamesSolved: 50 })
    expect(perfect).toBeLessThanOrEqual(100)
    expect(perfect).toBeGreaterThan(0)
  })
})

describe("buildLeaderboard", () => {
  it("sorts by score descending", () => {
    const models = [
      makeMockModel({ id: "a", name: "A", stats: { winRate: 50, avgGuesses: 4, medianTimeMs: 5000, gamesSolved: 5 } as any }),
      makeMockModel({ id: "b", name: "B", stats: { winRate: 90, avgGuesses: 3, medianTimeMs: 5000, gamesSolved: 9 } as any }),
    ]
    const lb = buildLeaderboard(models)
    expect(lb[0].modelId).toBe("b")
    expect(lb[0].rank).toBe(1)
    expect(lb[1].rank).toBe(2)
  })

  it("assigns consecutive ranks", () => {
    const models = [
      makeMockModel({ id: "a", name: "A" }),
      makeMockModel({ id: "b", name: "B" }),
      makeMockModel({ id: "c", name: "C" }),
    ]
    const lb = buildLeaderboard(models)
    expect(lb.map(e => e.rank)).toEqual([1, 2, 3])
  })
})

describe("calculateWordDifficulty", () => {
  it("calculates solve rate per word", () => {
    const models: BenchmarkModelResult[] = [
      makeMockModel({
        id: "a",
        name: "A",
        games: [
          { word: "apple", solved: true, guessCount: 3, timeMs: 1000, guesses: ["crane", "apple"], tokens: 100, cost: 0 },
          { word: "brain", solved: false, guessCount: 6, timeMs: 1000, guesses: [], tokens: 100, cost: 0 },
        ],
      }),
      makeMockModel({
        id: "b",
        name: "B",
        games: [
          { word: "apple", solved: true, guessCount: 4, timeMs: 1000, guesses: ["slate", "apple"], tokens: 100, cost: 0 },
          { word: "brain", solved: true, guessCount: 3, timeMs: 1000, guesses: ["brain"], tokens: 100, cost: 0 },
        ],
      }),
    ]

    const difficulty = calculateWordDifficulty(models, ["apple", "brain"])
    const apple = difficulty.find(d => d.word === "apple")!
    const brain = difficulty.find(d => d.word === "brain")!

    expect(apple.solveRate).toBe(100)
    expect(brain.solveRate).toBe(50)
    expect(brain.hardestFor).toContain("A")
  })
})

describe("computeBenchmarkAnalysis", () => {
  it("works with real benchmark data", () => {
    const data = loadBenchmarkResults()
    const analysis = computeBenchmarkAnalysis(data)

    expect(analysis.hardestWords).toHaveLength(5)
    expect(analysis.easiestWords).toHaveLength(5)
    expect(analysis.modelComparisons.mostAccurate.winRate).toBeGreaterThan(0)
    expect(analysis.modelComparisons.fastest.avgTimeMs).toBeGreaterThan(0)
  })
})
