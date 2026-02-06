// Constants and default configurations for Crossword Sprint

import type { ModelConfig } from "./types"

export const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: "o1",
    name: "OpenAI o1 (Reasoning)",
    modelString: "openai/o1",
    enableThinking: true, // Reasoning model
    // Note: o1 doesn't support temperature/topP
  },
  {
    id: "o3-mini",
    name: "OpenAI o3-mini (Reasoning)",
    modelString: "openai/o3-mini",
    enableThinking: true, // Reasoning model
    // Note: o3-mini doesn't support temperature/topP
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    modelString: "openai/gpt-5",
    temperature: 0.1,
    topP: 1,
    enableThinking: false,
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    modelString: "openai/gpt-5-mini",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    modelString: "openai/gpt-5-nano",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    modelString: "openai/gpt-5.1",
    temperature: 0.1,
    topP: 1,
    enableThinking: false,
  },
  {
    id: "gpt-5.1-high",
    name: "GPT-5.1 (High Reasoning)",
    modelString: "openai/gpt-5.1",
    temperature: 0.1,
    topP: 1,
    enableThinking: true,
    reasoningEffort: "high",
  },
  {
    id: "gpt-5.1-medium",
    name: "GPT-5.1 (Medium Reasoning)",
    modelString: "openai/gpt-5.1",
    temperature: 0.1,
    topP: 1,
    enableThinking: true,
    reasoningEffort: "medium",
  },
  {
    id: "gpt-5.1-low",
    name: "GPT-5.1 (Low Reasoning)",
    modelString: "openai/gpt-5.1",
    temperature: 0.1,
    topP: 1,
    enableThinking: true,
    reasoningEffort: "low",
  },
  {
    id: "gpt-5.1-none",
    name: "GPT-5.1 (No Reasoning)",
    modelString: "openai/gpt-5.1",
    temperature: 0.1,
    topP: 1,
    enableThinking: false,
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    modelString: "openai/gpt-5.2",
    temperature: 0.1,
    topP: 1,
    enableThinking: false,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    modelString: "google/gemini-2.5-flash",
    temperature: 0.1,
    topP: 1,
    enableThinking: false,
  },
  {
    id: "gemini-2.5-flash-thinking",
    name: "Gemini 2.5 Flash (Thinking)",
    modelString: "google/gemini-2.5-flash",
    temperature: 0.1,
    topP: 1,
    enableThinking: true,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    modelString: "google/gemini-2.5-pro",
    temperature: 0.1,
    topP: 1,
    enableThinking: false,
  },
  {
    id: "gemini-2.5-pro-thinking",
    name: "Gemini 2.5 Pro (Thinking)",
    modelString: "google/gemini-2.5-pro",
    temperature: 0.1,
    topP: 1,
    enableThinking: true,
  },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro Preview",
    modelString: "google/gemini-3-pro-preview",
    temperature: 0.1,
    topP: 1,
    enableThinking: false,
  },
  {
    id: "gemini-3-pro-preview-thinking",
    name: "Gemini 3 Pro Preview (Thinking)",
    modelString: "google/gemini-3-pro-preview",
    temperature: 0.1,
    topP: 1,
    enableThinking: true,
    reasoningEffort: "medium",
  },
  {
    id: "gemini-3-pro-preview-thinking-low",
    name: "Gemini 3 Pro Preview (Thinking Low)",
    modelString: "google/gemini-3-pro-preview",
    temperature: 0.1,
    topP: 1,
    enableThinking: true,
    reasoningEffort: "low",
  },
  {
    id: "claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    modelString: "anthropic/claude-haiku-4.5",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    modelString: "anthropic/claude-sonnet-4.5",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "claude-opus-4.6",
    name: "Claude Opus 4.6",
    modelString: "anthropic/claude-opus-4.6",
    temperature: 0.1,
    enableThinking: false,
  },
  {
    id: "claude-opus-4.6-thinking",
    name: "Claude Opus 4.6 (Thinking)",
    modelString: "anthropic/claude-opus-4.6",
    temperature: 0.1,
    enableThinking: true,
  },
  {
    id: "claude-opus-4.5",
    name: "Claude Opus 4.5",
    modelString: "anthropic/claude-opus-4.5",
    temperature: 0.1,
    enableThinking: false,
  },
  {
    id: "claude-opus-4.5-thinking",
    name: "Claude Opus 4.5 (Thinking)",
    modelString: "anthropic/claude-opus-4.5",
    temperature: 0.1,
    enableThinking: true,
  },
  {
    id: "claude-opus-4",
    name: "Claude Opus 4",
    modelString: "anthropic/claude-opus-4",
    temperature: 0.1,
    enableThinking: false,
  },
  {
    id: "claude-opus-4-thinking",
    name: "Claude Opus 4 (Thinking)",
    modelString: "anthropic/claude-opus-4",
    temperature: 0.1,
    enableThinking: true,
  },
  {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    modelString: "anthropic/claude-sonnet-4",
    temperature: 0.1,
    enableThinking: false,
  },
  {
    id: "claude-sonnet-4-thinking",
    name: "Claude Sonnet 4 (Thinking)",
    modelString: "anthropic/claude-sonnet-4",
    temperature: 0.1,
    enableThinking: true,
  },
  {
    id: "claude-3-7-sonnet",
    name: "Claude 3.7 Sonnet",
    modelString: "anthropic/claude-3.7-sonnet",
    temperature: 0.1,
    enableThinking: false,
  },
  {
    id: "claude-3-7-sonnet-thinking",
    name: "Claude 3.7 Sonnet (Thinking)",
    modelString: "anthropic/claude-3.7-sonnet",
    temperature: 0.1,
    enableThinking: true,
  },
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    modelString: "meta-llama/llama-3.3-70b-instruct",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "kimi-k2-0905",
    name: "Kimi K2 0905",
    modelString: "moonshotai/kimi-k2-0905",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "qwen3-32b",
    name: "Qwen3-32B",
    modelString: "qwen/qwen3-32b",
    temperature: 0.1,
    topP: 1,
    enableThinking: false,
  },
  {
    id: "qwen3-32b-thinking",
    name: "Qwen3-32B (Thinking)",
    modelString: "qwen/qwen3-32b",
    temperature: 0.1,
    topP: 1,
    enableThinking: true,
  },
  {
    id: "qwen-qwq-32b",
    name: "Qwen QWQ-32B",
    modelString: "qwen/qwq-32b",
    temperature: 0.1,
    topP: 1,
    enableThinking: false,
  },
  {
    id: "qwen-qwq-32b-thinking",
    name: "Qwen QWQ-32B (Thinking)",
    modelString: "qwen/qwq-32b",
    temperature: 0.1,
    topP: 1,
    enableThinking: true,
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1 Distill Llama 70B",
    modelString: "deepseek/deepseek-r1-distill-llama-70b",
    temperature: 0.1,
    topP: 1,
    enableThinking: false,
  },
  {
    id: "deepseek-r1-distill-llama-70b-thinking",
    name: "DeepSeek R1 Distill Llama 70B (Thinking)",
    modelString: "deepseek/deepseek-r1-distill-llama-70b",
    temperature: 0.1,
    topP: 1,
    enableThinking: true,
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    modelString: "openai/gpt-4.1-mini",
    temperature: 0.1,
    topP: 1,
  },
  {
    id: "grok-4-fast",
    name: "Grok 4 Fast",
    modelString: "x-ai/grok-4-fast",
    temperature: 0.1,
    topP: 1,
  },
]

export const PUBLIC_MAX_MODELS = 3

export const DEFAULT_MAX_TOKENS = 16
export const DEFAULT_TIMEOUT_MS = 4000
export const DEFAULT_OUTPUT_RULE = "json"
export const SPEED_BONUS_THRESHOLD_MS = 250

// Color scheme for models (for UI visualization)
export const MODEL_COLORS: Record<string, string> = {
  "o1": "#ff6b6b", // bright red (reasoning model)
  "o3-mini": "#ff8787", // lighter red (reasoning model)
  "gpt-5": "#10b981", // emerald
  "gpt-5-mini": "#06b6d4", // cyan
  "gpt-5-nano": "#22d3ee", // lighter cyan
  "gpt-5.1": "#059669", // darker emerald
  "gpt-5.1-high": "#047857", // darkest emerald (high reasoning)
  "gpt-5.1-medium": "#059669", // darker emerald (medium reasoning)
  "gpt-5.1-low": "#10b981", // emerald (low reasoning)
  "gpt-5.1-none": "#34d399", // lighter emerald (no reasoning)
  "gpt-5.2": "#0d9488", // teal-emerald
  "gemini-2.5-flash": "#4285f4", // google blue
  "gemini-2.5-flash-thinking": "#5a96ff", // lighter google blue (with thinking)
  "gemini-2.5-pro": "#1a73e8", // darker google blue
  "gemini-2.5-pro-thinking": "#3d8bff", // lighter darker google blue (with thinking)
  "gemini-3-pro-preview": "#0d47a1", // deep google blue
  "gemini-3-pro-preview-thinking": "#1565c0", // medium google blue (with thinking)
  "gemini-3-pro-preview-thinking-low": "#1976d2", // lighter google blue (with low thinking)
  "claude-haiku-4.5": "#a855f7", // purple
  "claude-sonnet-4.5": "#8b5cf6", // violet
  "claude-opus-4.6": "#7e22ce", // deep purple (latest)
  "claude-opus-4.6-thinking": "#9333ea", // purple (with thinking)
  "claude-opus-4.5": "#8b22ce", // rich purple
  "claude-opus-4.5-thinking": "#a033ea", // lighter purple (with thinking)
  "claude-opus-4": "#9333ea", // darker purple
  "claude-opus-4-thinking": "#a855f7", // purple (with thinking)
  "claude-sonnet-4": "#7c3aed", // indigo
  "claude-sonnet-4-thinking": "#8b5cf6", // violet (with thinking)
  "claude-3-7-sonnet": "#6d28d9", // deep purple
  "claude-3-7-sonnet-thinking": "#7c3aed", // indigo (with thinking)
  "llama-3.3-70b": "#f97316", // orange
  "kimi-k2-0905": "#ea580c", // darker orange
  "qwen3-32b": "#dc2626", // red-orange
  "qwen3-32b-thinking": "#ef4444", // brighter red-orange (with thinking)
  "qwen-qwq-32b": "#b91c1c", // dark red
  "qwen-qwq-32b-thinking": "#dc2626", // red-orange (with thinking)
  "deepseek-r1-distill-llama-70b": "#991b1b", // darker red
  "deepseek-r1-distill-llama-70b-thinking": "#b91c1c", // dark red (with thinking)
  "gpt-4.1-mini": "#14b8a6", // teal
  "grok-4-fast": "#00d4aa", // grok green/teal
}

// Models that don't support temperature/topP (reasoning-only models)
export const NO_TEMPERATURE_MODELS = new Set([
  "o1",
  "o1-preview",
  "o1-mini",
  "o3-mini",
])
