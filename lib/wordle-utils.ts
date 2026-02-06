// Wordle utility functions

import type { WordleFeedback, WordleModelResult } from "./types"
import { normalizeAnswer } from "./scoring"
import { isValidWord } from "./wordle-words"

/**
 * Compute Wordle feedback for a guess against a target word
 * Returns an array of feedback for each letter position
 */
export function computeWordleFeedback(guess: string, target: string): WordleFeedback[] {
  const normalizedGuess = guess.toLowerCase().trim()
  const normalizedTarget = target.toLowerCase().trim()

  if (normalizedGuess.length !== 5 || normalizedTarget.length !== 5) {
    // Invalid input, return all absent
    return Array(5).fill("absent" as WordleFeedback)
  }

  const feedback: WordleFeedback[] = Array(5).fill("absent")
  const targetLetters = normalizedTarget.split("")
  const guessLetters = normalizedGuess.split("")
  const usedTargetIndices = new Set<number>()
  const usedGuessIndices = new Set<number>()

  // First pass: mark correct positions (green)
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      feedback[i] = "correct"
      usedTargetIndices.add(i)
      usedGuessIndices.add(i)
    }
  }

  // Second pass: mark present letters (yellow)
  for (let i = 0; i < 5; i++) {
    if (usedGuessIndices.has(i)) continue // Already marked as correct

    const guessLetter = guessLetters[i]
    // Find first unused occurrence in target
    for (let j = 0; j < 5; j++) {
      if (usedTargetIndices.has(j)) continue
      if (targetLetters[j] === guessLetter) {
        feedback[i] = "present"
        usedTargetIndices.add(j)
        break
      }
    }
  }

  return feedback
}

/**
 * Validate and normalize a Wordle guess
 */
export function normalizeWordleGuess(raw: string): string | null {
  const normalized = normalizeAnswer(raw, "plain", "lower", false)
  if (normalized.length !== 5) {
    return null
  }
  // Check if it's a valid word (optional - could allow any 5-letter string)
  // For now, we'll be lenient and allow any 5-letter lowercase string
  if (!/^[a-z]{5}$/.test(normalized)) {
    return null
  }
  return normalized
}

/**
 * Extract word from model output for Wordle
 */
export function extractWordleGuess(output: string): string | null {
  // Try to extract a 5-letter word from the output
  const normalized = normalizeAnswer(output, "plain", "lower", false)
  
  // Look for exactly 5 letters
  const match = normalized.match(/[a-z]{5}/)
  if (match) {
    return match[0]
  }
  
  // If normalized is exactly 5 chars, use it
  if (normalized.length === 5 && /^[a-z]{5}$/.test(normalized)) {
    return normalized
  }
  
  return null
}

/**
 * Calculate closeness score from Wordle feedback
 * Returns an object with correctCount, presentCount, and totalScore
 * Higher score = closer to the solution
 */
export function calculateClosenessScore(feedback: WordleFeedback[]): {
  correctCount: number
  presentCount: number
  totalScore: number
} {
  let correctCount = 0
  let presentCount = 0

  feedback.forEach((f) => {
    if (f === "correct") {
      correctCount++
    } else if (f === "present") {
      presentCount++
    }
  })

  // Weight correct letters more heavily (3 points each) than present (1 point each)
  // This ensures that having letters in the right position is more valuable
  const totalScore = correctCount * 3 + presentCount

  return {
    correctCount,
    presentCount,
    totalScore,
  }
}

/**
 * Estimate cost per token for a model (rough approximation in USD per 1M tokens)
 * These are approximate values and should be updated with actual pricing
 */
function getEstimatedCostPerMillionTokens(modelId: string): { input: number; output: number } {
  // Rough cost estimates per 1M tokens (input/output)
  // These are approximations and should be updated with actual pricing
  const costMap: Record<string, { input: number; output: number }> = {
    "gpt-5": { input: 2.5, output: 10 },
    "gpt-5-mini": { input: 0.15, output: 0.6 },
    "gpt-5-nano": { input: 0.05, output: 0.2 },
    "gpt-5.1": { input: 2.5, output: 10 },
    "gpt-5.1-high": { input: 2.5, output: 10 },
    "gpt-5.1-medium": { input: 2.5, output: 10 },
    "gpt-5.1-low": { input: 2.5, output: 10 },
    "gpt-5.1-none": { input: 2.5, output: 10 },
    "gpt-5.2": { input: 1.75, output: 14 },
    "gpt-4.1-mini": { input: 0.15, output: 0.6 },
    "gemini-2.5-flash": { input: 0.075, output: 0.3 },
    "gemini-2.5-pro": { input: 1.25, output: 5 },
    "claude-opus-4.6": { input: 5, output: 25 },
    "claude-opus-4.6-thinking": { input: 5, output: 25 },
    "claude-opus-4.5": { input: 5, output: 25 },
    "claude-opus-4.5-thinking": { input: 5, output: 25 },
    "claude-opus-4": { input: 15, output: 75 },
    "claude-opus-4-thinking": { input: 15, output: 75 },
    "claude-sonnet-4": { input: 3, output: 15 },
    "claude-sonnet-4-thinking": { input: 3, output: 15 },
    "claude-sonnet-4.5": { input: 3, output: 15 },
    "claude-haiku-4.5": { input: 0.25, output: 1.25 },
    "llama-3.3-70b": { input: 0.59, output: 0.79 }, // Groq pricing
    "kimi-k2-0905": { input: 0.59, output: 0.79 }, // Groq pricing
    "qwen3-32b": { input: 0.59, output: 0.79 }, // Groq pricing
    "grok-4-fast": { input: 0.1, output: 0.1 },
  }

  return costMap[modelId] || { input: 1, output: 1 } // Default fallback
}

/**
 * Calculate estimated cost in USD from token usage
 */
export function calculateEstimatedCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const costs = getEstimatedCostPerMillionTokens(modelId)
  const inputCost = (promptTokens / 1_000_000) * costs.input
  const outputCost = (completionTokens / 1_000_000) * costs.output
  return inputCost + outputCost
}

/**
 * Rank and sort WordleModelResults in-place.
 * Solved models rank higher, then by guess count, then by time.
 * Failed models ranked by closeness score.
 * Mutates the array and assigns rank fields. Returns the same array.
 */
export function rankWordleResults(results: WordleModelResult[]): WordleModelResult[] {
  results.sort((a, b) => {
    if (a.solved !== b.solved) return a.solved ? -1 : 1

    if (a.solved && b.solved) {
      if (a.guessCount !== b.guessCount) return a.guessCount - b.guessCount
      const timeA = a.timeToSolveMs ?? Infinity
      const timeB = b.timeToSolveMs ?? Infinity
      return timeA - timeB
    }

    // Both failed
    const closenessA = a.closenessScore ?? 0
    const closenessB = b.closenessScore ?? 0
    if (closenessA !== closenessB) return closenessB - closenessA
    return b.guessCount - a.guessCount
  })

  results.forEach((r, i) => { r.rank = i + 1 })
  return results
}

