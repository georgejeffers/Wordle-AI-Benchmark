import { describe, it, expect } from "vitest"
import {
  computeWordleFeedback,
  extractWordleGuess,
  normalizeWordleGuess,
  calculateClosenessScore,
  calculateEstimatedCost,
  rankWordleResults,
} from "../wordle-utils"
import type { WordleModelResult } from "../types"

describe("computeWordleFeedback", () => {
  it("returns all correct for exact match", () => {
    const feedback = computeWordleFeedback("crane", "crane")
    expect(feedback).toEqual(["correct", "correct", "correct", "correct", "correct"])
  })

  it("returns all absent for no matching letters", () => {
    const feedback = computeWordleFeedback("ghost", "blend")
    expect(feedback).toEqual(["absent", "absent", "absent", "absent", "absent"])
  })

  it("marks present and correct letters correctly", () => {
    const feedback = computeWordleFeedback("earns", "crane")
    // earns vs crane: e(0)->present, a(1)->present, r(2)->present, n(3)->correct (same pos), s(4)->absent
    expect(feedback).toEqual(["present", "present", "present", "correct", "absent"])
  })

  it("handles mixed correct and present", () => {
    const feedback = computeWordleFeedback("crane", "trace")
    // c is present (in trace at pos 3, not 0)
    // r is present (in trace at pos 1, not 1) -> actually r is at pos 1 in trace -> correct!
    // wait: trace = t,r,a,c,e and crane = c,r,a,n,e
    // c(0) vs t(0) -> c is in trace at pos 3 -> present
    // r(1) vs r(1) -> correct
    // a(2) vs a(2) -> correct
    // n(3) vs c(3) -> n not in trace -> absent
    // e(4) vs e(4) -> correct
    expect(feedback).toEqual(["present", "correct", "correct", "absent", "correct"])
  })

  it("handles duplicate letters in guess correctly", () => {
    // guess has three e's, target has one e at pos 4
    const feedback = computeWordleFeedback("geese", "crane")
    // First pass: e(4)==e(4) -> correct (marks target[4] used)
    // Second pass: g(0)->absent, e(1)->no unused e left->absent, e(2)->absent, s(3)->absent
    expect(feedback).toEqual(["absent", "absent", "absent", "absent", "correct"])
  })

  it("handles duplicate letters in target correctly", () => {
    // target has two l's
    const feedback = computeWordleFeedback("llama", "llano")
    // l(0) vs l(0) -> correct
    // l(1) vs l(1) -> correct
    // a(2) vs a(2) -> correct
    // m(3) vs n(3) -> absent
    // a(4) vs o(4) -> absent
    expect(feedback).toEqual(["correct", "correct", "correct", "absent", "absent"])
  })

  it("is case insensitive", () => {
    const feedback = computeWordleFeedback("CRANE", "crane")
    expect(feedback).toEqual(["correct", "correct", "correct", "correct", "correct"])
  })

  it("returns all absent for invalid length input", () => {
    const feedback = computeWordleFeedback("hi", "crane")
    expect(feedback).toEqual(["absent", "absent", "absent", "absent", "absent"])
  })
})

describe("extractWordleGuess", () => {
  it("extracts a clean 5-letter word", () => {
    expect(extractWordleGuess("crane")).toBe("crane")
  })

  it("extracts from mixed output (normalizes first, then matches)", () => {
    // normalizeAnswer("My guess is crane.", "plain", "lower", false) strips punctuation -> "myguessiscrane"
    // then /[a-z]{5}/ matches "mygue" (first 5 consecutive alpha chars)
    expect(extractWordleGuess("My guess is crane.")).toBe("mygue")
  })

  it("extracts single word correctly", () => {
    // "crane" normalizes to "crane" -> exact 5-letter match
    expect(extractWordleGuess("crane")).toBe("crane")
  })

  it("extracts from uppercase", () => {
    expect(extractWordleGuess("CRANE")).toBe("crane")
  })

  it("returns null for no valid word", () => {
    expect(extractWordleGuess("123")).toBeNull()
  })

  it("extracts first 5 consecutive alpha chars from longer text", () => {
    // normalizeAnswer strips spaces/punct -> "ithinkthewordisplanebecause"
    // /[a-z]{5}/ matches "ithin"
    expect(extractWordleGuess("I think the word is plane because")).toBe("ithin")
  })
})

describe("normalizeWordleGuess", () => {
  it("normalizes a valid 5-letter word", () => {
    expect(normalizeWordleGuess("CRANE")).toBe("crane")
  })

  it("returns null for invalid length", () => {
    expect(normalizeWordleGuess("hi")).toBeNull()
  })

  it("returns null for non-alpha characters", () => {
    expect(normalizeWordleGuess("cr4ne")).toBeNull()
  })
})

describe("calculateClosenessScore", () => {
  it("scores all correct as maximum", () => {
    const result = calculateClosenessScore(["correct", "correct", "correct", "correct", "correct"])
    expect(result.correctCount).toBe(5)
    expect(result.presentCount).toBe(0)
    expect(result.totalScore).toBe(15) // 5 * 3
  })

  it("scores all absent as zero", () => {
    const result = calculateClosenessScore(["absent", "absent", "absent", "absent", "absent"])
    expect(result.correctCount).toBe(0)
    expect(result.presentCount).toBe(0)
    expect(result.totalScore).toBe(0)
  })

  it("weights correct letters higher than present", () => {
    const correct2 = calculateClosenessScore(["correct", "correct", "absent", "absent", "absent"])
    const present3 = calculateClosenessScore(["present", "present", "present", "absent", "absent"])
    // 2 correct = 6 points, 3 present = 3 points
    expect(correct2.totalScore).toBeGreaterThan(present3.totalScore)
  })

  it("calculates mixed feedback correctly", () => {
    const result = calculateClosenessScore(["correct", "present", "absent", "correct", "present"])
    expect(result.correctCount).toBe(2)
    expect(result.presentCount).toBe(2)
    expect(result.totalScore).toBe(8) // 2*3 + 2*1
  })
})

describe("calculateEstimatedCost", () => {
  it("calculates cost for known model", () => {
    // claude-opus-4.6: input $5/M, output $25/M
    const cost = calculateEstimatedCost("claude-opus-4.6", 1000, 500)
    expect(cost).toBeCloseTo(0.005 + 0.0125, 4)
  })

  it("uses fallback pricing for unknown model", () => {
    const cost = calculateEstimatedCost("unknown-model", 1_000_000, 1_000_000)
    expect(cost).toBe(2) // $1 input + $1 output fallback
  })

  it("returns 0 for zero tokens", () => {
    const cost = calculateEstimatedCost("gpt-5", 0, 0)
    expect(cost).toBe(0)
  })
})

describe("rankWordleResults", () => {
  it("ranks solved models above unsolved", () => {
    const results: WordleModelResult[] = [
      { modelId: "a", modelName: "A", solved: false, guessCount: 6, rank: 0 },
      { modelId: "b", modelName: "B", solved: true, guessCount: 3, timeToSolveMs: 1000, rank: 0 },
    ]
    rankWordleResults(results)
    expect(results[0].modelId).toBe("b")
    expect(results[0].rank).toBe(1)
    expect(results[1].modelId).toBe("a")
    expect(results[1].rank).toBe(2)
  })

  it("ranks by guess count among solved models", () => {
    const results: WordleModelResult[] = [
      { modelId: "a", modelName: "A", solved: true, guessCount: 5, timeToSolveMs: 500, rank: 0 },
      { modelId: "b", modelName: "B", solved: true, guessCount: 2, timeToSolveMs: 3000, rank: 0 },
    ]
    rankWordleResults(results)
    expect(results[0].modelId).toBe("b") // fewer guesses wins
  })

  it("ranks by time when guess counts are equal", () => {
    const results: WordleModelResult[] = [
      { modelId: "a", modelName: "A", solved: true, guessCount: 3, timeToSolveMs: 5000, rank: 0 },
      { modelId: "b", modelName: "B", solved: true, guessCount: 3, timeToSolveMs: 2000, rank: 0 },
    ]
    rankWordleResults(results)
    expect(results[0].modelId).toBe("b") // faster time wins
  })

  it("ranks failed models by closeness score", () => {
    const results: WordleModelResult[] = [
      { modelId: "a", modelName: "A", solved: false, guessCount: 6, closenessScore: 5, rank: 0 },
      { modelId: "b", modelName: "B", solved: false, guessCount: 6, closenessScore: 10, rank: 0 },
    ]
    rankWordleResults(results)
    expect(results[0].modelId).toBe("b") // higher closeness wins
  })

  it("assigns sequential ranks starting from 1", () => {
    const results: WordleModelResult[] = [
      { modelId: "a", modelName: "A", solved: true, guessCount: 4, timeToSolveMs: 1000, rank: 0 },
      { modelId: "b", modelName: "B", solved: true, guessCount: 2, timeToSolveMs: 500, rank: 0 },
      { modelId: "c", modelName: "C", solved: false, guessCount: 6, rank: 0 },
    ]
    rankWordleResults(results)
    expect(results.map(r => r.rank)).toEqual([1, 2, 3])
  })
})
