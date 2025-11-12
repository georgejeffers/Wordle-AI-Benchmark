// Constants and default configurations for Crossword Sprint

import type { ModelConfig } from "./types"

export const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    modelString: "openai/gpt-4o",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    modelString: "openai/gpt-4o-mini",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    modelString: "anthropic/claude-3-5-sonnet-20241022",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    modelString: "anthropic/claude-3-5-haiku-20241022",
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
    id: "grok-beta",
    name: "Grok Beta",
    modelString: "xai/grok-beta",
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
  "gpt-4o": "#10b981", // emerald
  "gpt-4o-mini": "#06b6d4", // cyan
  "claude-3-5-sonnet": "#8b5cf6", // violet
  "claude-3-5-haiku": "#a855f7", // purple
  "llama-3.3-70b": "#f59e0b", // amber
  "grok-beta": "#ef4444", // red
}
