// AI SDK integration layer for running model inference

import { streamText } from "ai"
import type { ModelConfig, Clue, ClueAttempt } from "./types"
import { generatePrompt } from "./prompts"
import { normalizeAnswer, validateFormat, checkCorrectness } from "./scoring"

export interface RunClueParams {
  raceId: string
  roundId: string
  clue: Clue
  model: ModelConfig
  mode: "json" | "plain"
  maxTokens?: number
  timeoutMs?: number
}

export interface RunClueResult {
  attempt: ClueAttempt
  error?: string
}

/**
 * Run a single model on a single clue with timing and validation
 */
export async function runModelOnClue(params: RunClueParams): Promise<RunClueResult> {
  const { raceId, roundId, clue, model, mode, maxTokens = 16, timeoutMs = 4000 } = params

  const tRequest = performance.now()
  let tFirst: number | undefined
  let tLast: number
  let text = ""
  let error: string | undefined
  let timedOut = false

  try {
    console.log(`[v0] Running model ${model.id} on clue ${clue.id}`)
    console.log(`[v0] Model string: ${model.modelString}`)
    console.log(`[v0] Clue: "${clue.clue}" (answer: ${clue.answer}, length: ${clue.length})`)

    // Generate prompt
    const prompt = generatePrompt(clue, mode)
    console.log(`[v0] Generated prompt for ${model.id}:`, prompt.substring(0, 200))

    // Set up timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout")), timeoutMs)
    })

    let result
    try {
      console.log(`[v0] Calling streamText for ${model.id}...`)
      result = await Promise.race([
        streamText({
          model: model.modelString,
          prompt,
          temperature: model.temperature ?? 0.1,
          topP: model.topP ?? 1,
          maxTokens,
        }),
        timeoutPromise,
      ])
      console.log(`[v0] streamText returned for ${model.id}`)
    } catch (streamError) {
      console.error(`[v0] streamText FAILED for ${model.id}:`, streamError)
      if (streamError instanceof Error) {
        console.error(`[v0] Error name: ${streamError.name}`)
        console.error(`[v0] Error message: ${streamError.message}`)
        console.error(`[v0] Error stack:`, streamError.stack)
      }
      throw streamError
    }

    // Stream tokens and track timing
    for await (const delta of result.textStream) {
      if (tFirst === undefined) {
        tFirst = performance.now()
      }
      text += delta
    }

    tLast = performance.now()

    // Get token usage
    const usage = await result.usage

    // Calculate metrics
    const e2eMs = tLast - tRequest
    const ttftMs = tFirst ? tFirst - tRequest : undefined

    console.log(`[v0] Model ${model.id} completed in ${e2eMs.toFixed(0)}ms, output: "${text}"`)

    // Normalize answer
    const normalized = normalizeAnswer(text, mode, clue.caseRule ?? "lower", clue.allowHyphen ?? false)

    // Validate format
    const formatOk = validateFormat(text, clue, mode)

    // Check correctness
    const correct = formatOk && checkCorrectness(normalized, clue.answer, clue.caseRule ?? "lower")

    const attempt: ClueAttempt = {
      raceId,
      roundId,
      clueId: clue.id,
      modelId: model.id,
      tRequest,
      tFirst,
      tLast,
      e2eMs,
      ttftMs,
      output: text,
      normalized,
      formatOk,
      correct,
      clueScore: 0, // Will be calculated after all models run
      tokenUsage: usage
        ? {
            prompt: usage.promptTokens,
            completion: usage.completionTokens,
            total: usage.totalTokens,
          }
        : undefined,
    }

    return { attempt }
  } catch (err) {
    // Handle timeout or other errors
    tLast = performance.now()
    const e2eMs = tLast - tRequest

    if (err instanceof Error && err.message === "Timeout") {
      timedOut = true
      error = "Timeout exceeded"
    } else {
      error = err instanceof Error ? err.message : "Unknown error"
      console.error(`[v0] Model ${model.id} error:`, err)
      if (err instanceof Error) {
        console.error(`[v0] Error stack:`, err.stack)
      }
    }

    const attempt: ClueAttempt = {
      raceId,
      roundId,
      clueId: clue.id,
      modelId: model.id,
      tRequest,
      tFirst,
      tLast,
      e2eMs,
      ttftMs: tFirst ? tFirst - tRequest : undefined,
      output: text || "",
      normalized: "",
      formatOk: false,
      correct: false,
      clueScore: 0,
      error, // Include error in attempt object
    }

    return { attempt, error }
  }
}

/**
 * Run all models on a single clue in parallel
 */
export async function runClueAcrossModels(
  raceId: string,
  roundId: string,
  clue: Clue,
  models: ModelConfig[],
  mode: "json" | "plain" = "json",
  maxTokens?: number,
  timeoutMs?: number,
): Promise<ClueAttempt[]> {
  console.log(`[v0] Running clue ${clue.id} across ${models.length} models`)

  const promises = models.map((model) =>
    runModelOnClue({
      raceId,
      roundId,
      clue,
      model,
      mode,
      maxTokens,
      timeoutMs,
    }),
  )

  const results = await Promise.all(promises)

  // Log any errors
  results.forEach((result) => {
    if (result.error) {
      console.error(`[v0] Model ${result.attempt.modelId} error on clue ${clue.id}:`, result.error)
    }
  })

  return results.map((r) => r.attempt)
}

/**
 * Run all clues in a round sequentially (one clue at a time, all models in parallel)
 */
export async function runRound(
  raceId: string,
  roundId: string,
  clues: Clue[],
  models: ModelConfig[],
  mode: "json" | "plain" = "json",
  maxTokens?: number,
  timeoutMs?: number,
  onClueComplete?: (clueId: string, attempts: ClueAttempt[]) => void,
): Promise<ClueAttempt[]> {
  const allAttempts: ClueAttempt[] = []

  for (const clue of clues) {
    console.log(`[v0] Starting clue: ${clue.clue}`)

    const attempts = await runClueAcrossModels(raceId, roundId, clue, models, mode, maxTokens, timeoutMs)

    allAttempts.push(...attempts)

    if (onClueComplete) {
      onClueComplete(clue.id, attempts)
    }

    console.log(`[v0] Completed clue ${clue.id}`)
  }

  return allAttempts
}
