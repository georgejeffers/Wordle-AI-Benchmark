// AI SDK integration layer for running model inference via OpenRouter

import type { ModelConfig, Clue, ClueAttempt } from "./types"
import { generatePrompt } from "./prompts"
import { normalizeAnswer, validateFormat, checkCorrectness } from "./scoring"
import { NO_TEMPERATURE_MODELS } from "./constants"

export interface RunClueParams {
  raceId: string
  roundId: string
  clue: Clue
  model: ModelConfig
  mode: "json" | "plain"
  maxTokens?: number
  timeoutMs?: number
  onModelStart?: (modelId: string, clueId: string) => void
  onModelProgress?: (modelId: string, clueId: string, partialText: string) => void
}

export interface RunClueResult {
  attempt: ClueAttempt
  error?: string
}

// OpenAI models that need the Responses API for reasoning
const OPENAI_REASONING_MODELS = new Set([
  "o1",
  "o3-mini",
  "gpt-5",
  "gpt-5.1",
  "gpt-5.2",
])

function isOpenAIReasoningModel(modelId: string): boolean {
  // Check if any of the base model IDs match
  for (const id of OPENAI_REASONING_MODELS) {
    if (modelId === id || modelId.startsWith(id + "-")) return true
  }
  return false
}

async function getProviderAndModel(modelString: string, modelId: string, enableThinking?: boolean) {
  const [{ createOpenAI }, { streamText }] = await Promise.all([
    import("@ai-sdk/openai"),
    import("ai"),
  ])

  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  })

  // Only use .responses() for OpenAI reasoning models when thinking is enabled
  if (isOpenAIReasoningModel(modelId) && enableThinking) {
    console.log(`[bench] Using openrouter.responses() for reasoning model ${modelId}`)
    return { streamText, model: openrouter.responses(modelString) }
  }

  return { streamText, model: openrouter(modelString) }
}

/**
 * Helper to extract text from a value object (response structures)
 */
function extractTextFromValue(value: any): string | null {
  if (!value || typeof value !== "object") return null

  if (value.text && typeof value.text === "string" && value.text.length > 0) {
    return value.text
  }

  if (value.part && value.part.text && typeof value.part.text === "string") {
    return value.part.text
  }

  if (value.item && value.item.content) {
    if (Array.isArray(value.item.content)) {
      for (const content of value.item.content) {
        if (content.text && typeof content.text === "string") {
          return content.text
        }
      }
    } else if (value.item.content.text && typeof value.item.content.text === "string") {
      return value.item.content.text
    }
  }

  if (value.response && value.response.output) {
    for (const output of value.response.output) {
      if (output.content) {
        if (Array.isArray(output.content)) {
          for (const content of output.content) {
            if (content.text && typeof content.text === "string") {
              return content.text
            }
          }
        } else if (output.content.text && typeof output.content.text === "string") {
          return output.content.text
        }
      }
    }
  }

  if (value.candidates && Array.isArray(value.candidates)) {
    for (const candidate of value.candidates) {
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text && typeof part.text === "string") {
            return part.text
          }
        }
      }
    }
  }

  const searchDepth = (obj: any, depth = 0): string | null => {
    if (depth > 5 || !obj || typeof obj !== "object") return null

    if (obj.text && typeof obj.text === "string" && obj.text.length > 0) {
      return obj.text
    }

    for (const key in obj) {
      if (key === "text" && typeof obj[key] === "string" && obj[key].length > 0) {
        return obj[key]
      }
      const found = searchDepth(obj[key], depth + 1)
      if (found) return found
    }

    return null
  }

  return searchDepth(value)
}

/**
 * Extract text from various error formats when validation fails
 */
function extractTextFromError(error: any): string | null {
  if (!error) return null

  if (error && typeof error === "object") {
    if (error.value && error.value.text && typeof error.value.text === "string" && error.value.text.length > 0) {
      return error.value.text
    }

    if (error.cause) {
      const causeText = extractTextFromValue(error.cause)
      if (causeText) return causeText
    }
    if (error.value) {
      const valueText = extractTextFromValue(error.value)
      if (valueText) return valueText
    }

    if (error.message && typeof error.message === "string") {
      const textMatch = error.message.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      if (textMatch && textMatch[1]) {
        const extracted = textMatch[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\")
        if (extracted && extracted.length > 0) {
          return extracted
        }
      }

      const valueMatch = error.message.match(/Value:\s*(\{[\s\S]{0,5000}\})/)
      if (valueMatch && valueMatch[1]) {
        try {
          const parsed = JSON.parse(valueMatch[1])
          const found = extractTextFromValue(parsed)
          if (found) return found
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  const errorSources: string[] = []

  if (error instanceof Error) {
    errorSources.push(error.stack || "", error.message || "", String(error))
  }

  try {
    errorSources.push(JSON.stringify(error))
  } catch (e) {}

  if (error && typeof error === "object") {
    if (error.cause) {
      try { errorSources.push(JSON.stringify(error.cause)) } catch (e) {}
    }
    if (error.value) {
      try { errorSources.push(JSON.stringify(error.value)) } catch (e) {}
    }
  }

  const errorStr = errorSources.filter(Boolean).join(" ")

  try {
    const parsed = JSON.parse(errorStr)
    if (parsed && typeof parsed === "object") {
      const findText = (obj: any): string | null => {
        if (typeof obj === "string" && obj.includes("answer")) return obj
        if (obj && typeof obj === "object") {
          if (obj.text && typeof obj.text === "string") return obj.text
          if (obj.content && obj.content.parts) {
            for (const part of obj.content.parts) {
              if (part.text) return part.text
            }
          }
          if (obj.candidates && Array.isArray(obj.candidates)) {
            for (const candidate of obj.candidates) {
              const found = findText(candidate)
              if (found) return found
            }
          }
          if (obj.response && obj.response.output) {
            for (const output of obj.response.output) {
              if (output.content) {
                for (const content of output.content) {
                  if (content.text) return content.text
                }
              }
            }
          }
          for (const key in obj) {
            const found = findText(obj[key])
            if (found) return found
          }
        }
        return null
      }
      const found = findText(parsed)
      if (found) return found
    }
  } catch (e) {}

  const textPattern1 = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g
  let match
  const candidates: string[] = []
  while ((match = textPattern1.exec(errorStr)) !== null) {
    const candidate = match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\")
    candidates.push(candidate)
  }

  const jsonPattern = /\{"answer"\s*:\s*"([^"]+)"\}/g
  const jsonMatches: string[] = []
  while ((match = jsonPattern.exec(errorStr)) !== null) {
    if (match[0]) jsonMatches.push(match[0])
  }

  const candidatePattern = /"parts"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/g
  const candidateMatches: string[] = []
  while ((match = candidatePattern.exec(errorStr)) !== null) {
    if (match[1]) candidateMatches.push(match[1].replace(/\\"/g, '"'))
  }

  const deltaPattern = /"delta"\s*:\s*"((?:[^"\\]|\\.)*)"/g
  const deltaMatches: string[] = []
  while ((match = deltaPattern.exec(errorStr)) !== null) {
    const delta = match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\")
    if (delta && delta.length > 0) deltaMatches.push(delta)
  }

  const allCandidates = [...candidates, ...jsonMatches, ...candidateMatches, ...deltaMatches]
  if (allCandidates.length === 0) return null

  const validCandidates = allCandidates.filter((c) => {
    const trimmed = c.trim()
    return trimmed.startsWith("{") || trimmed.includes("answer") || (trimmed.length > 3 && /^[a-z]+$/i.test(trimmed))
  })

  if (validCandidates.length === 0) return null

  const best = validCandidates.reduce((longest, current) => {
    const currentClean = current.trim()
    const longestClean = longest.trim()
    if (currentClean.startsWith("{") && !longestClean.startsWith("{")) return current
    if (longestClean.startsWith("{") && !currentClean.startsWith("{")) return longest
    return currentClean.length > longestClean.length ? current : longest
  }, validCandidates[0])

  return best.trim() || null
}

/**
 * Run a single model on a single clue with timing and validation
 */
export async function runModelOnClue(params: RunClueParams): Promise<RunClueResult> {
  const { raceId, roundId, clue, model, mode, maxTokens = 16, timeoutMs = 4000, onModelStart, onModelProgress } = params

  if (onModelStart) {
    onModelStart(model.id, clue.id)
  }

  const tRequest = performance.now()
  let tFirst: number | undefined
  let tLast: number
  let text = ""
  let error: string | undefined
  let timedOut = false

  try {
    console.log(`[bench] ${model.id} -> clue ${clue.id}`)

    const prompt = generatePrompt(clue, mode)
    let timeoutId: NodeJS.Timeout | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Timeout")), timeoutMs)
    })

    const { streamText: streamTextFn, model: modelInstance } = await getProviderAndModel(model.modelString, model.id, model.enableThinking)

    let result: any
    let streamError: any

    try {
      const streamTextOptions: any = {
        model: modelInstance,
        prompt,
      }

      // Set temperature/topP unless it's a model that doesn't support them
      if (!NO_TEMPERATURE_MODELS.has(model.id)) {
        if (model.temperature !== undefined) {
          streamTextOptions.temperature = model.temperature
        }
        if (model.topP !== undefined) {
          streamTextOptions.topP = model.topP
        }
      }

      if (maxTokens) {
        streamTextOptions.maxTokens = maxTokens
      }

      // Add reasoning options for OpenAI reasoning models via providerOptions
      if (model.enableThinking && isOpenAIReasoningModel(model.id)) {
        const openaiOptions: any = {
          reasoningSummary: 'detailed',
        }
        if (model.reasoningEffort) {
          openaiOptions.reasoningEffort = model.reasoningEffort
        }
        streamTextOptions.providerOptions = {
          openai: openaiOptions,
        }
      }

      const streamPromise = Promise.resolve(streamTextFn(streamTextOptions))
      result = await Promise.race([streamPromise, timeoutPromise])

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      console.log(`[bench] streamText returned for ${model.id}`)
    } catch (err) {
      streamError = err

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      if (streamError instanceof Error && streamError.name === "AI_TypeValidationError") {
        console.warn(`[bench] Type validation error for ${model.id}, attempting to recover...`)
        const extractedText = extractTextFromError(streamError)
        if (extractedText) {
          text = extractedText
          console.log(`[bench] Extracted text from validation error: "${text}"`)
          result = { text: Promise.resolve(text), usage: Promise.resolve(undefined) }
          streamError = null
        }
      }

      if (streamError && !text) {
        const extractedText = extractTextFromError(streamError)
        if (extractedText) {
          text = extractedText
          console.log(`[bench] Extracted text from network error: "${text}"`)
          result = { text: Promise.resolve(text), usage: Promise.resolve(undefined) }
          streamError = null
        }
      }

      if (streamError) {
        if (streamError instanceof Error && streamError.message === "Timeout") {
          // Timeout handled below
        }
        if (!text) {
          console.error(`[bench] streamText FAILED for ${model.id}:`, streamError)
          throw streamError
        }
      }
    }

    // Try to read from stream if result exists and we don't have text yet
    if (result && !text) {
      try {
        if (result.fullStream) {
          const accumulatedText: string[] = []
          let reasoningText = ""

          try {
            for await (const chunk of result.fullStream) {
              if (chunk.type === "reasoning") {
                const delta = (chunk as any).text || ""
                reasoningText += delta
                if (onModelProgress && reasoningText) {
                  onModelProgress(model.id, clue.id, reasoningText)
                }
              } else if (chunk.type === "reasoning-delta") {
                const chunkAny = chunk as any
                const delta = chunkAny.text || chunkAny.textDelta || chunkAny.delta || chunkAny.content || chunkAny.reasoning || ""
                reasoningText += delta
                if (onModelProgress && reasoningText) {
                  onModelProgress(model.id, clue.id, reasoningText)
                }
              } else if (chunk.type === "text-delta") {
                if (tFirst === undefined) {
                  tFirst = performance.now()
                }
                const delta = (chunk as any).textDelta || ""
                accumulatedText.push(delta)
                text += delta
              }
            }
            console.log(`[bench] ${model.id} stream complete (${text.length} chars text, ${reasoningText.length} chars reasoning)`)
          } catch (fullStreamError) {
            console.warn(`[bench] fullStream error for ${model.id}:`, fullStreamError)
            if (accumulatedText.length > 0) {
              text = accumulatedText.join("")
            }
          }
        } else if (result.textStream) {
          const accumulatedDeltas: string[] = []
          try {
            for await (const delta of result.textStream) {
              if (tFirst === undefined) {
                tFirst = performance.now()
              }
              if (typeof delta === "string") {
                accumulatedDeltas.push(delta)
                text += delta
                if (onModelProgress) {
                  onModelProgress(model.id, clue.id, text)
                }
              }
            }
          } catch (streamIterError) {
            console.warn(`[bench] Stream iteration error for ${model.id}, attempting recovery...`)
            const extractedText = extractTextFromError(streamIterError)
            if (extractedText) {
              const accumulatedText = accumulatedDeltas.join("")
              if (!accumulatedText || extractedText.length > accumulatedText.length || extractedText.includes("answer")) {
                text = extractedText
                console.log(`[bench] Extracted text from stream iteration error: "${text}"`)
              } else if (accumulatedText) {
                text = accumulatedText
                console.log(`[bench] Using accumulated text from deltas: "${text}"`)
              }
            } else if (accumulatedDeltas.length > 0) {
              text = accumulatedDeltas.join("")
              console.log(`[bench] Using accumulated deltas: "${text}"`)
            }
          }
        }
      } catch (outerError) {
        console.warn(`[bench] Outer stream error for ${model.id}, attempting recovery...`)
        const extractedText = extractTextFromError(outerError)
        if (extractedText && !text) {
          text = extractedText
          console.log(`[bench] Extracted text from outer stream error: "${text}"`)
        }
      }
    }

    // Fallback: Try result.text
    if (!text && result && typeof result === "object" && "text" in result) {
      try {
        const textValue = result.text
        if (textValue instanceof Promise) {
          const awaitedText = await textValue.catch(() => "")
          if (awaitedText && typeof awaitedText === "string" && awaitedText.length > 0) {
            text = awaitedText
            console.log(`[bench] Recovered from result.text Promise: "${text}"`)
          }
        } else if (typeof textValue === "string" && textValue.length > 0) {
          text = textValue
          console.log(`[bench] Recovered from result.text: "${text}"`)
        }
      } catch (e) {}
    }

    tLast = performance.now()

    let usage
    try {
      usage = await result.usage
    } catch (usageError) {
      console.warn(`[bench] Could not get usage for ${model.id}`)
      usage = undefined
    }

    const e2eMs = tLast - tRequest
    const ttftMs = tFirst ? tFirst - tRequest : undefined

    if (!text || text.trim().length === 0) {
      console.warn(`[bench] Model ${model.id} has empty output`)
    } else {
      console.log(`[bench] Model ${model.id} completed in ${e2eMs.toFixed(0)}ms, output: "${text}"`)
    }

    const normalized = normalizeAnswer(text, mode, clue.caseRule ?? "lower", clue.allowHyphen ?? false)
    const formatOk = validateFormat(text, clue, mode)
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
      clueScore: 0,
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
    tLast = performance.now()
    const e2eMs = tLast - tRequest

    if (err instanceof Error && err.message === "Timeout") {
      timedOut = true
      error = "Timeout exceeded"
    } else {
      error = err instanceof Error ? err.message : "Unknown error"
      console.error(`[bench] Model ${model.id} error:`, err)
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
      error,
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
  onAttemptComplete?: (attempt: ClueAttempt) => void,
  onModelStart?: (modelId: string, clueId: string) => void,
  onModelProgress?: (modelId: string, clueId: string, partialText: string) => void,
): Promise<ClueAttempt[]> {
  console.log(`[bench] Running clue ${clue.id} across ${models.length} models`)

  const promises = models.map((model) =>
    runModelOnClue({
      raceId,
      roundId,
      clue,
      model,
      mode,
      maxTokens,
      timeoutMs,
      onModelStart,
      onModelProgress,
    }).then((result) => {
      if (onAttemptComplete) {
        onAttemptComplete(result.attempt)
      }
      return result
    }),
  )

  const results = await Promise.all(promises)

  results.forEach((result: RunClueResult) => {
    if (result.error) {
      console.error(`[bench] Model ${result.attempt.modelId} error on clue ${clue.id}:`, result.error)
    }
  })

  return results.map((r: RunClueResult) => r.attempt)
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
  onAttemptComplete?: (attempt: ClueAttempt) => void,
  onModelStart?: (modelId: string, clueId: string) => void,
  onModelProgress?: (modelId: string, clueId: string, partialText: string) => void,
): Promise<ClueAttempt[]> {
  const allAttempts: ClueAttempt[] = []

  for (const clue of clues) {
    console.log(`[bench] Starting clue: ${clue.clue}`)

    const attempts = await runClueAcrossModels(
      raceId,
      roundId,
      clue,
      models,
      mode,
      maxTokens,
      timeoutMs,
      onAttemptComplete,
      onModelStart,
      onModelProgress,
    )

    allAttempts.push(...attempts)

    if (onClueComplete) {
      onClueComplete(clue.id, attempts)
    }

    console.log(`[bench] Completed clue ${clue.id}`)
  }

  return allAttempts
}
