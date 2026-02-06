import { describe, it, expect } from "vitest"
import {
  normalizeAnswer,
  validateFormat,
  checkCorrectness,
  scoreClue,
  calculatePercentile,
  calculateMedian,
} from "../scoring"

describe("normalizeAnswer", () => {
  it("extracts answer from valid JSON", () => {
    expect(normalizeAnswer('{"answer":"paris"}', "json", "lower", false)).toBe("paris")
  })

  it("returns empty string for invalid JSON", () => {
    expect(normalizeAnswer("not json", "json", "lower", false)).toBe("")
  })

  it("normalizes plain text to lowercase", () => {
    expect(normalizeAnswer("PARIS", "plain", "lower", false)).toBe("paris")
  })

  it("normalizes to uppercase", () => {
    expect(normalizeAnswer("paris", "plain", "upper", false)).toBe("PARIS")
  })

  it("normalizes to title case", () => {
    expect(normalizeAnswer("paris", "plain", "title", false)).toBe("Paris")
  })

  it("preserves case with as-is rule", () => {
    expect(normalizeAnswer("PaRiS", "plain", "as-is", false)).toBe("PaRiS")
  })

  it("strips punctuation", () => {
    expect(normalizeAnswer("par.is!", "plain", "lower", false)).toBe("paris")
  })

  it("preserves hyphens when allowed", () => {
    expect(normalizeAnswer("re-do", "plain", "lower", true)).toBe("re-do")
  })

  it("strips hyphens when not allowed", () => {
    expect(normalizeAnswer("re-do", "plain", "lower", false)).toBe("redo")
  })
})

describe("validateFormat", () => {
  const clue = { id: "1", clue: "Test", answer: "paris", length: 5 }

  it("validates correct JSON format", () => {
    expect(validateFormat('{"answer":"paris"}', clue, "json")).toBe(true)
  })

  it("rejects JSON without answer field", () => {
    expect(validateFormat('{"word":"paris"}', clue, "json")).toBe(false)
  })

  it("rejects wrong length answer", () => {
    expect(validateFormat('{"answer":"hi"}', clue, "json")).toBe(false)
  })

  it("validates correct plain format", () => {
    expect(validateFormat("paris", clue, "plain")).toBe(true)
  })

  it("rejects wrong length plain answer", () => {
    expect(validateFormat("hi", clue, "plain")).toBe(false)
  })
})

describe("checkCorrectness", () => {
  it("returns true for exact match", () => {
    expect(checkCorrectness("paris", "paris", "lower")).toBe(true)
  })

  it("returns false for wrong answer", () => {
    expect(checkCorrectness("london", "paris", "lower")).toBe(false)
  })

  it("normalizes ground truth before comparison", () => {
    expect(checkCorrectness("paris", "PARIS", "lower")).toBe(true)
  })
})

describe("scoreClue", () => {
  it("returns 0 for incorrect answer", () => {
    expect(scoreClue({ formatOk: true, correct: false, modelLatMs: 100, minLatMs: 50, p95LatMs: 500 })).toBe(0)
  })

  it("returns 0 for format violation", () => {
    expect(scoreClue({ formatOk: false, correct: true, modelLatMs: 100, minLatMs: 50, p95LatMs: 500 })).toBe(0)
  })

  it("gives full speed bonus for fastest model", () => {
    const score = scoreClue({ formatOk: true, correct: true, modelLatMs: 50, minLatMs: 50, p95LatMs: 500 })
    // 70 accuracy + 30 speed + 2 sub-250ms bonus = 100 (capped)
    expect(score).toBe(100)
  })

  it("gives no speed bonus for slowest model", () => {
    const score = scoreClue({ formatOk: true, correct: true, modelLatMs: 500, minLatMs: 50, p95LatMs: 500 })
    // 70 accuracy + 0 speed = 70
    expect(score).toBe(70)
  })

  it("gives sub-250ms bonus", () => {
    const score = scoreClue({ formatOk: true, correct: true, modelLatMs: 200, minLatMs: 100, p95LatMs: 1000 })
    // Should include the 2-point sub-250ms bonus
    expect(score).toBeGreaterThan(70)
  })
})

describe("calculatePercentile", () => {
  it("returns 0 for empty array", () => {
    expect(calculatePercentile([], 95)).toBe(0)
  })

  it("calculates 95th percentile", () => {
    const latencies = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
    const p95 = calculatePercentile(latencies, 95)
    expect(p95).toBe(1000)
  })

  it("calculates 50th percentile (median)", () => {
    const latencies = [1, 2, 3, 4, 5]
    const p50 = calculatePercentile(latencies, 50)
    expect(p50).toBe(3)
  })
})

describe("calculateMedian", () => {
  it("returns 0 for empty array", () => {
    expect(calculateMedian([])).toBe(0)
  })

  it("returns middle value for odd-length array", () => {
    expect(calculateMedian([1, 3, 5])).toBe(3)
  })

  it("returns average of middle two for even-length array", () => {
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5)
  })

  it("handles unsorted input", () => {
    expect(calculateMedian([5, 1, 3])).toBe(3)
  })
})
