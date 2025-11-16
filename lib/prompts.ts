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

/**
 * Generate Wordle prompt with previous guesses and feedback
 */
export function generateWordlePrompt(
  targetWord: string,
  previousGuesses: Array<{ word: string; feedback: Array<"correct" | "present" | "absent"> }>,
  customTemplate?: string,
): string {
  // If custom template is provided, use it and append previous guesses
  if (customTemplate) {
    let prompt = customTemplate

    // Append previous guesses section if we have any
    if (previousGuesses.length > 0) {
      // Check if the template already includes previous guesses (simple heuristic)
      const hasPreviousGuesses = prompt.toLowerCase().includes("previous") || 
                                  prompt.toLowerCase().includes("guess")
      
      if (!hasPreviousGuesses) {
        prompt += "\n\nPrevious guesses and feedback:\n"
        previousGuesses.forEach((guess, index) => {
          const feedbackStr = guess.feedback
            .map((f) => {
              if (f === "correct") return "🟩"
              if (f === "present") return "🟨"
              return "⬜"
            })
            .join("")
          prompt += `Guess ${index + 1}: ${guess.word.toUpperCase()} ${feedbackStr}\n`
        })
        prompt += "\n"
      } else {
        // Template already has previous guesses section, inject them
        // Replace placeholder patterns if they exist
        const guessPlaceholder = /{{PREVIOUS_GUESSES}}/i
        if (guessPlaceholder.test(prompt)) {
          let guessesText = ""
          previousGuesses.forEach((guess, index) => {
            const feedbackStr = guess.feedback
              .map((f) => {
                if (f === "correct") return "🟩"
                if (f === "present") return "🟨"
                return "⬜"
              })
              .join("")
            guessesText += `Guess ${index + 1}: ${guess.word.toUpperCase()} ${feedbackStr}\n`
          })
          prompt = prompt.replace(guessPlaceholder, guessesText)
        } else {
          // Append at the end if no placeholder
          prompt += "\n\nPrevious guesses:\n"
          previousGuesses.forEach((guess, index) => {
            const feedbackStr = guess.feedback
              .map((f) => {
                if (f === "correct") return "🟩"
                if (f === "present") return "🟨"
                return "⬜"
              })
              .join("")
            prompt += `Guess ${index + 1}: ${guess.word.toUpperCase()} ${feedbackStr}\n`
          })
        }
      }
    }

    return prompt
  }

  // Default prompt generation
  let prompt = `You are playing Wordle. Guess a 5-letter English word.

Rules:
- You have up to 6 guesses total
- After each guess, you'll get feedback:
  * Green (correct): letter is in the word and in the correct position
  * Yellow (present): letter is in the word but in a different position
  * Gray (absent): letter is not in the word at all
- Output ONLY a single 5-letter lowercase word, nothing else
- No punctuation, no explanation, just the word

`

  if (previousGuesses.length > 0) {
    prompt += "Previous guesses and feedback:\n"
    previousGuesses.forEach((guess, index) => {
      const feedbackStr = guess.feedback
        .map((f) => {
          if (f === "correct") return "🟩"
          if (f === "present") return "🟨"
          return "⬜"
        })
        .join("")
      prompt += `Guess ${index + 1}: ${guess.word.toUpperCase()} ${feedbackStr}\n`
    })
    prompt += "\n"
  }

  prompt += "Your next guess (output only the 5-letter word):"

  return prompt
}
