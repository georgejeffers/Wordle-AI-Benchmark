// Prompt templates for Crossword Sprint

import type { Clue } from "./types"

/**
 * Generate JSON mode prompt for a clue
 */
export function generateJsonPrompt(clue: Clue): string {
  return `You are playing Crossword Sprint. Return ONLY valid JSON matching this schema:
{"answer": "<single word, lowercase, no spaces or punctuation>"}

Rules:
- Answer must be exactly ${clue.length} letters.
- Use lowercase only.
- Do not include spaces, hyphens, periods, quotes, or extra text.
- If multiple candidates, choose the most common crossword answer.
- If unsure, guess the most likely, but still output valid JSON.

Clue: "${clue.clue}"
Length: ${clue.length}

Return only: {"answer":"<word>"}`
}

/**
 * Generate plain text mode prompt for a clue
 */
export function generatePlainPrompt(clue: Clue): string {
  return `Return only the answer word, lowercase, no punctuation, no extra text.

Clue: "${clue.clue}"
Length: ${clue.length}`
}

/**
 * Generate prompt based on output mode
 */
export function generatePrompt(clue: Clue, mode: "json" | "plain" = "json"): string {
  return mode === "json" ? generateJsonPrompt(clue) : generatePlainPrompt(clue)
}
