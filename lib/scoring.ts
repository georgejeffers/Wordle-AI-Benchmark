// Scoring logic for Crossword Sprint

import type { Clue, ClueAttempt, ModelScore, CaseRule } from "./types"

/**
 * Normalize an answer according to the clue's rules
 */
export function normalizeAnswer(
  raw: string,
  mode: "json" | "plain",
  caseRule: CaseRule = "lower",
  allowHyphen = false,
): string {
  let word = raw.trim()

  // Extract from JSON if needed
  if (mode === "json") {
    try {
      const obj = JSON.parse(raw)
      word = obj.answer ?? ""
    } catch {
      return "" // Invalid JSON
    }
  }

  // Remove all punctuation and spaces, except hyphens if allowed
  if (!allowHyphen) {
    word = word.replace(/[-\s\p{P}]/gu, "")
  } else {
    // Bun doesn't support character class intersection (&&), so we use a workaround:
    // Match anything that's not a word character and not a hyphen
    word = word.replace(/[^\w-]/gu, "")
  }

  // Apply case rule
  switch (caseRule) {
    case "lower":
      word = word.toLowerCase()
      break
    case "upper":
      word = word.toUpperCase()
      break
    case "title":
      word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      break
    case "as-is":
      // Keep original case
      break
  }

  return word
}

/**
 * Validate format compliance (JSON schema, length, etc.)
 */
export function validateFormat(output: string, clue: Clue, mode: "json" | "plain"): boolean {
  try {
    if (mode === "json") {
      const obj = JSON.parse(output)
      if (!obj.answer || typeof obj.answer !== "string") {
        return false
      }
    }

    // Check length constraint
    const normalized = normalizeAnswer(output, mode, clue.caseRule ?? "lower", clue.allowHyphen ?? false)

    if (normalized.length !== clue.length) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Check correctness against ground truth
 */
export function checkCorrectness(normalized: string, groundTruth: string, caseRule: CaseRule = "lower"): boolean {
  // Normalize ground truth the same way
  const normalizedTruth = normalizeAnswer(groundTruth, "plain", caseRule, false)
  return normalized === normalizedTruth
}

/**
 * Score a single clue attempt (0-100)
 */
export function scoreClue(params: {
  formatOk: boolean
  correct: boolean
  modelLatMs: number
  minLatMs: number
  p95LatMs: number
}): number {
  const { formatOk, correct, modelLatMs, minLatMs, p95LatMs } = params

  // Hard penalty for format violation or incorrect answer
  if (!formatOk || !correct) {
    return 0
  }

  // Correctness base: 70 points
  const accuracyScore = 70

  // Speed bonus: 30 points (normalized)
  const denom = Math.max(1, p95LatMs - minLatMs)
  const lnorm = Math.max(0, Math.min(100, (100 * (p95LatMs - modelLatMs)) / denom))
  const speedScore = 30 * (lnorm / 100)

  let total = accuracyScore + speedScore

  // Optional: Speed bonus for sub-250ms (extra 2 points)
  if (modelLatMs < 250) {
    total += 2
  }

  // Cap at 100
  return Math.min(100, total)
}

/**
 * Calculate latency percentile for a set of attempts
 */
export function calculatePercentile(latencies: number[], percentile: number): number {
  if (latencies.length === 0) return 0

  const sorted = [...latencies].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

/**
 * Calculate latency statistics for a clue across all models
 */
export function calculateClueStats(attempts: ClueAttempt[]): {
  minLatMs: number
  p95LatMs: number
} {
  const latencies = attempts.map((a) => a.e2eMs)

  return {
    minLatMs: Math.min(...latencies),
    p95LatMs: calculatePercentile(latencies, 95),
  }
}

/**
 * Score all attempts for a clue and return updated attempts with scores
 */
export function scoreClueAttempts(attempts: ClueAttempt[], clue: Clue, mode: "json" | "plain"): ClueAttempt[] {
  // Calculate stats across all attempts
  const { minLatMs, p95LatMs } = calculateClueStats(attempts)

  return attempts.map((attempt) => {
    const clueScore = scoreClue({
      formatOk: attempt.formatOk,
      correct: attempt.correct,
      modelLatMs: attempt.e2eMs,
      minLatMs,
      p95LatMs,
    })

    return {
      ...attempt,
      clueScore,
    }
  })
}

/**
 * Calculate final model scores with tie-breakers
 */
export function calculateModelScores(
  attempts: ClueAttempt[],
  modelIds: string[],
  modelNames: Map<string, string>,
): ModelScore[] {
  const scores: ModelScore[] = modelIds.map((modelId) => {
    const modelAttempts = attempts.filter((a) => a.modelId === modelId)
    const correctAttempts = modelAttempts.filter((a) => a.correct)

    const totalCorrect = correctAttempts.length
    const totalAttempts = modelAttempts.length
    const accuracyPct = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0
    const avgScore =
      modelAttempts.length > 0 ? modelAttempts.reduce((sum, a) => sum + a.clueScore, 0) / modelAttempts.length : 0

    // Calculate median E2E
    const e2eLatencies = correctAttempts.map((a) => a.e2eMs).sort((a, b) => a - b)
    const medianE2EMs = e2eLatencies.length > 0 ? e2eLatencies[Math.floor(e2eLatencies.length / 2)] : 0

    // Calculate median TTFT
    const ttftLatencies = correctAttempts
      .filter((a) => a.ttftMs !== undefined)
      .map((a) => a.ttftMs!)
      .sort((a, b) => a - b)
    const medianTTFTMs = ttftLatencies.length > 0 ? ttftLatencies[Math.floor(ttftLatencies.length / 2)] : undefined

    // Calculate variance for tie-breaking
    const mean = e2eLatencies.reduce((sum, val) => sum + val, 0) / e2eLatencies.length
    const e2eVariance =
      e2eLatencies.length > 0
        ? e2eLatencies.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / e2eLatencies.length
        : 0

    return {
      modelId,
      modelName: modelNames.get(modelId) || modelId,
      totalCorrect,
      totalAttempts,
      accuracyPct,
      avgScore,
      medianE2EMs,
      medianTTFTMs,
      e2eVariance,
      rank: 0, // Will be set after sorting
    }
  })

  // Sort by avgScore (primary), then tie-breakers
  scores.sort((a, b) => {
    // Primary: average score
    if (Math.abs(a.avgScore - b.avgScore) > 0.01) {
      return b.avgScore - a.avgScore
    }
    // Tie-breaker 1: more correct answers
    if (a.totalCorrect !== b.totalCorrect) {
      return b.totalCorrect - a.totalCorrect
    }
    // Tie-breaker 2: lower median E2E
    if (a.medianE2EMs !== b.medianE2EMs) {
      return a.medianE2EMs - b.medianE2EMs
    }
    // Tie-breaker 3: lower variance (more stable)
    return a.e2eVariance - b.e2eVariance
  })

  // Assign ranks
  scores.forEach((score, index) => {
    score.rank = index + 1
  })

  return scores
}

/**
 * Calculate median of an array
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}
