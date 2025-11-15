// Wordle utility functions

import type { WordleFeedback } from "./types"
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

