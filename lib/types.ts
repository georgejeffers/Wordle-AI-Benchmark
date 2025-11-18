// Core type definitions for Crossword Sprint AI Race

export type CaseRule = "lower" | "upper" | "title" | "as-is"
export type OutputRule = "plain" | "json"
export type RoundType = "crossword" | "wordle"

export interface Clue {
  id: string
  clue: string // e.g. "Capital of France (5)"
  answer: string // "paris"
  length: number // 5
  allowHyphen?: boolean // default false
  caseRule?: CaseRule // default 'lower'
}

export interface Round {
  id: string
  type: RoundType
  name?: string
  outputRule?: OutputRule // default 'json'
  schema?: any // zod/json-schema for JSON mode
  clues: Clue[]
  timeLimitMs?: number // optional cap for a round
  maxTokens?: number // per-answer cap
}

export interface ModelConfig {
  id: string
  name: string
  modelString: string // e.g. "openai/gpt-5", "anthropic/claude-4.5"
  temperature?: number // default 0.1
  topP?: number // default 1
  customPrompt?: string // Custom prompt override for Wordle (optional)
  baseModelId?: string // For custom entries: the original model ID for cost calculation
  enableThinking?: boolean // Enable reasoning/thinking for capable models (optional, defaults based on model)
  thinkingLevel?: "low" | "medium" | "high" // For Google models: thinking level (optional, defaults to high/not specified)
}

export interface CustomEntry {
  id: string
  name: string
  modelId: string
  prompt: string
  createdAt: number
}

export interface RaceConfig {
  id: string
  name: string
  models: ModelConfig[]
  rounds: Round[]
  createdAt: number
}

// Telemetry and results

export interface ClueAttempt {
  raceId: string
  roundId: string
  clueId: string
  modelId: string
  tRequest: number // timestamp when request started
  tFirst?: number // timestamp of first token (TTFT)
  tLast: number // timestamp of last token (E2E)
  e2eMs: number // end-to-end latency
  ttftMs?: number // time to first token
  output: string // raw model output
  normalized?: string // normalized answer
  formatOk: boolean // passed schema/output validation
  correct: boolean // matches ground truth
  clueScore: number // 0-100
  tokenUsage?: {
    prompt: number
    completion: number
    total: number
  }
  error?: string // Add optional error field to track failures
}

export interface ClueResult {
  clueId: string
  attempts: ClueAttempt[]
  minLatMs: number // fastest E2E for this clue
  p95LatMs: number // 95th percentile E2E for this clue
}

export interface RoundResult {
  roundId: string
  clueResults: ClueResult[]
  modelScores: Map<string, number> // modelId -> average round score
}

export interface RaceResult {
  raceId: string
  roundResults: RoundResult[]
  finalScores: ModelScore[]
  winner?: string // modelId
}

export interface ModelScore {
  modelId: string
  modelName: string
  totalCorrect: number
  totalAttempts: number
  accuracyPct: number
  avgScore: number // average clue score
  medianE2EMs: number
  medianTTFTMs?: number
  e2eVariance: number // for tie-breaking
  rank: number
}

// Race state for real-time updates

export type RaceStatus = "pending" | "running" | "completed" | "error"

export interface RaceState {
  raceId: string
  status: RaceStatus
  currentRoundId?: string
  currentClueId?: string
  completedClues: number
  totalClues: number
  startedAt?: number
  completedAt?: number
  progress: number // 0-100
}

// Wordle-specific types

export type WordleFeedback = "correct" | "present" | "absent"

export interface WordleGuess {
  modelId: string
  guessIndex: number // 0-5
  word: string // the guessed word
  feedback: WordleFeedback[] // feedback for each letter position
  tRequest: number
  tFirst?: number
  tLast: number
  e2eMs: number
  ttftMs?: number
  correct: boolean // true if this guess was correct
  tokenUsage?: {
    prompt: number
    completion: number
    total: number
  }
}

export interface WordleGameState {
  modelId: string
  guesses: WordleGuess[]
  solved: boolean
  solvedAtGuess?: number // which guess number solved it (1-6)
  timeToSolveMs?: number // total time from start to solve
  failed: boolean // true if didn't solve in 6 guesses
}

export interface WordleConfig {
  id: string
  name: string
  models: ModelConfig[]
  targetWord: string // the word to solve (not revealed to frontend initially)
  wordLength: number // always 5
  maxGuesses: number // always 6
  createdAt: number
}

export interface WordleState {
  gameId: string
  status: RaceStatus
  startedAt?: number
  completedAt?: number
  modelStates: Map<string, WordleGameState>
}

export interface WordleModelResult {
  modelId: string
  modelName: string
  solved: boolean
  guessCount: number // 1-6, or 6 if failed
  timeToSolveMs?: number // undefined if failed
  rank: number
  closenessScore?: number // For failed attempts: how close they got (based on last guess)
  correctLetters?: number // Number of correct letters in correct positions from last guess
  presentLetters?: number // Number of correct letters in wrong positions from last guess
  totalTokens?: number // Total tokens used across all guesses
  totalCost?: number // Estimated cost in USD (if available)
  didNotFinish?: boolean // true if race ended early and model was still running
}

export interface WordleRaceResult {
  gameId: string
  targetWord: string
  modelResults: WordleModelResult[]
  winner?: string // modelId
}
