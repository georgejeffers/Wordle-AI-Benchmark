import { describe, it, expect } from "vitest"
import { generateWordlePrompt, generateJsonPrompt, generatePlainPrompt } from "../prompts"

describe("generateWordlePrompt", () => {
  it("generates initial prompt without previous guesses", () => {
    const prompt = generateWordlePrompt("crane", [])
    expect(prompt).toContain("Wordle")
    expect(prompt).toContain("5-letter")
    expect(prompt).not.toContain("Previous guesses")
    expect(prompt).not.toContain("crane") // target word should NOT be in prompt
  })

  it("includes previous guesses with feedback", () => {
    const previousGuesses = [
      { word: "slate", feedback: ["absent", "absent", "absent", "absent", "correct"] as ("correct" | "present" | "absent")[] },
    ]
    const prompt = generateWordlePrompt("crane", previousGuesses)
    expect(prompt).toContain("SLATE")
    expect(prompt).toContain("Previous guesses")
    expect(prompt).not.toContain("crane")
  })

  it("warns against repeating previous guesses", () => {
    const previousGuesses = [
      { word: "slate", feedback: ["absent", "absent", "absent", "absent", "correct"] as ("correct" | "present" | "absent")[] },
      { word: "trace", feedback: ["absent", "correct", "correct", "absent", "correct"] as ("correct" | "present" | "absent")[] },
    ]
    const prompt = generateWordlePrompt("crane", previousGuesses)
    expect(prompt).toContain("SLATE")
    expect(prompt).toContain("TRACE")
    expect(prompt).toContain("Do NOT guess")
  })

  it("uses custom template when provided", () => {
    const customTemplate = "You are a word expert. Guess a 5-letter word."
    const prompt = generateWordlePrompt("crane", [], customTemplate)
    expect(prompt).toContain("word expert")
  })

  it("appends previous guesses to custom template", () => {
    const customTemplate = "Solve this Wordle puzzle."
    const previousGuesses = [
      { word: "slate", feedback: ["absent", "absent", "absent", "absent", "correct"] as ("correct" | "present" | "absent")[] },
    ]
    const prompt = generateWordlePrompt("crane", previousGuesses, customTemplate)
    expect(prompt).toContain("Solve this Wordle puzzle")
    expect(prompt).toContain("SLATE")
  })

  it("replaces {{PREVIOUS_GUESSES}} placeholder in custom template", () => {
    const customTemplate = "Guess a word.\n{{PREVIOUS_GUESSES}}\nYour guess:"
    const previousGuesses = [
      { word: "slate", feedback: ["absent", "absent", "absent", "absent", "correct"] as ("correct" | "present" | "absent")[] },
    ]
    const prompt = generateWordlePrompt("crane", previousGuesses, customTemplate)
    expect(prompt).toContain("SLATE")
    expect(prompt).not.toContain("{{PREVIOUS_GUESSES}}")
  })
})

describe("generateJsonPrompt", () => {
  it("includes clue text and length", () => {
    const clue = { id: "1", clue: "Capital of France (5)", answer: "paris", length: 5 }
    const prompt = generateJsonPrompt(clue)
    expect(prompt).toContain("Capital of France (5)")
    expect(prompt).toContain("5 letters")
    expect(prompt).toContain('{"answer":"<word>"}')
  })
})

describe("generatePlainPrompt", () => {
  it("includes clue text and length", () => {
    const clue = { id: "1", clue: "Capital of France (5)", answer: "paris", length: 5 }
    const prompt = generatePlainPrompt(clue)
    expect(prompt).toContain("Capital of France (5)")
    expect(prompt).toContain("5")
  })
})
