// Constants and default configurations for Crossword Sprint

import type { ModelConfig } from "./types"

export const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: "gpt-5",
    name: "GPT-5",
    modelString: "openai/gpt-5",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    modelString: "openai/gpt-5-mini",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    modelString: "google/gemini-2.5-flash",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    modelString: "google/gemini-2.5-pro",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    modelString: "anthropic/claude-haiku-4-5",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    modelString: "anthropic/claude-sonnet-4-5",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B (Groq)",
    modelString: "groq/llama-3.3-70b-versatile",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    modelString: "openai/gpt-4.1-mini",
    temperature: 0.1,
    topP: 1,
  },
]

export const DEFAULT_MAX_TOKENS = 16
export const DEFAULT_TIMEOUT_MS = 4000
export const DEFAULT_OUTPUT_RULE = "json"
export const SPEED_BONUS_THRESHOLD_MS = 250

// Color scheme for models (for UI visualization)
export const MODEL_COLORS: Record<string, string> = {
  "gpt-5": "#10b981", // emerald
  "gpt-5-mini": "#06b6d4", // cyan
  "gemini-2.5-flash": "#4285f4", // google blue
  "gemini-2.5-pro": "#1a73e8", // darker google blue
  "claude-haiku-4.5": "#a855f7", // purple
  "claude-sonnet-4.5": "#8b5cf6", // violet
  "llama-3.3-70b": "#f97316", // orange
  "gpt-4.1-mini": "#14b8a6", // teal
}
