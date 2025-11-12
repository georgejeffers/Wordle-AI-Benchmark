// AI SDK integration layer for running model inference

import type { ModelConfig, Clue, ClueAttempt } from "./types"
import { generatePrompt } from "./prompts"
import { normalizeAnswer, validateFormat, checkCorrectness } from "./scoring"

// Lazy load AI SDK to avoid Bun regex compatibility issues
// Use require() for runtime loading to bypass Next.js bundling analysis
function getProviderAndModel(modelString: string) {
  const parts = modelString.split("/")
  const providerName = parts[0]
  const modelName = parts.slice(1).join("/") // Handle nested paths like deepinfra/meta-llama/...
  
  // Use require() instead of import() to avoid Next.js analyzing the code
  // @ts-ignore - require() is needed to bypass Next.js static analysis
  if (providerName === "openai") {
    // @ts-ignore
    const { createOpenAI } = require("@ai-sdk/openai")
    // @ts-ignore
    const { streamText } = require("ai")
    const openai = createOpenAI()
    return { streamText, model: openai(modelName) }
  } else if (providerName === "anthropic") {
    // @ts-ignore
    const { createAnthropic } = require("@ai-sdk/anthropic")
    // @ts-ignore
    const { streamText } = require("ai")
    const anthropic = createAnthropic()
    return { streamText, model: anthropic(modelName) }
  } else if (providerName === "groq") {
    // @ts-ignore
    const { createGroq } = require("@ai-sdk/groq")
    // @ts-ignore
    const { streamText } = require("ai")
    const groq = createGroq()
    return { streamText, model: groq(modelName) }
  } else if (providerName === "xai") {
    // @ts-ignore
    const { createXai } = require("@ai-sdk/xai")
    // @ts-ignore
    const { streamText } = require("ai")
    const xai = createXai()
    return { streamText, model: xai(modelName) }
  } else if (providerName === "google") {
    // @ts-ignore
    const { createGoogleGenerativeAI } = require("@ai-sdk/google")
    // @ts-ignore
    const { streamText } = require("ai")
    const google = createGoogleGenerativeAI()
    return { streamText, model: google(modelName) }
  } else if (providerName === "mistral") {
    // @ts-ignore
    const { createMistral } = require("@ai-sdk/mistral")
    // @ts-ignore
    const { streamText } = require("ai")
    const mistral = createMistral()
    return { streamText, model: mistral(modelName) }
  } else if (providerName === "deepinfra") {
    // DeepInfra uses OpenAI-compatible API
    // @ts-ignore
    const { createOpenAICompatible } = require("@ai-sdk/openai-compatible")
    // @ts-ignore
    const { streamText } = require("ai")
    const deepinfra = createOpenAICompatible({
      baseURL: "https://api.deepinfra.com/v1/openai",
      apiKey: process.env.DEEPINFRA_API_KEY || process.env.OPENAI_API_KEY,
    })
    return { streamText, model: deepinfra(modelName) }
  }
  throw new Error(`Unknown provider for model: ${modelString}`)
}

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

    // Set up timeout with proper error handling
    let timeoutId: NodeJS.Timeout | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Timeout")), timeoutMs)
    })

    let result
    let streamPromise: Promise<any> | undefined
    try {
      console.log(`[v0] Calling streamText for ${model.id}...`)
      const { streamText: streamTextFn, model: modelInstance } = getProviderAndModel(model.modelString)
      
      // Determine provider from model string
      const providerName = model.modelString.split("/")[0]
      
      const streamTextOptions: any = {
        model: modelInstance,
        prompt,
      }
      
      // Anthropic models don't allow both temperature and topP
      // Use only temperature for Anthropic, both for others
      if (providerName === "anthropic") {
        streamTextOptions.temperature = model.temperature ?? 0.1
        // Don't set topP for Anthropic models
      } else {
        streamTextOptions.temperature = model.temperature ?? 0.1
        streamTextOptions.topP = model.topP ?? 1
      }
      
      if (maxTokens !== undefined) {
        streamTextOptions.maxTokens = maxTokens
      }
      
      streamPromise = streamTextFn(streamTextOptions)
      
      result = await Promise.race([
        streamPromise,
        timeoutPromise,
      ])
      
      // Clear timeout if we got a result
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      console.log(`[v0] streamText returned for ${model.id}`)
    } catch (streamError) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      // If timeout occurred, suppress the original promise rejection
      if (streamError instanceof Error && streamError.message === "Timeout") {
        // Cancel the original promise to prevent unhandled rejection
        if (streamPromise) {
          streamPromise.catch(() => {
            // Silently catch the rejection from the cancelled promise
          })
        }
      }
      
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
            prompt: ("promptTokens" in usage ? (usage.promptTokens as number) : 0) || 0,
            completion: ("completionTokens" in usage ? (usage.completionTokens as number) : 0) || 0,
            total: ("totalTokens" in usage ? (usage.totalTokens as number) : 0) || 0,
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
