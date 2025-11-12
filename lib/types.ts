// Core type definitions for Crossword Sprint AI Race

export type CaseRule = "lower" | "upper" | "title" | "as-is"
export type OutputRule = "plain" | "json"
export type RoundType = "crossword"

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
