// AI SDK integration layer for running model inference

import type { ModelConfig, Clue, ClueAttempt } from "./types"
import { generatePrompt } from "./prompts"
import { normalizeAnswer, validateFormat, checkCorrectness } from "./scoring"
import { REASONING_MODELS, THINKING_CAPABLE_MODELS, ANTHROPIC_REASONING_MODELS, GROQ_REASONING_MODELS } from "./constants"

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

async function getProviderAndModel(modelString: string, modelId: string) {
  const parts = modelString.split("/")
  const providerName = parts[0]
  const modelName = parts.slice(1).join("/")

  // Use dynamic import() instead of require()
  if (providerName === "openai") {
    const [{ createOpenAI }, { streamText }] = await Promise.all([import("@ai-sdk/openai"), import("ai")])
    const openai = createOpenAI()
    
    // For reasoning models like gpt-5, o1, o3-mini, use .responses() instead of direct call
    if (REASONING_MODELS.has(modelId)) {
      console.log(`[v0] Using openai.responses() for reasoning model ${modelId}`)
      return { streamText, model: openai.responses(modelName) }
    }
    
    return { streamText, model: openai(modelName) }
  } else if (providerName === "anthropic") {
    const [{ createAnthropic }, { streamText }] = await Promise.all([import("@ai-sdk/anthropic"), import("ai")])
    const anthropic = createAnthropic()
    return { streamText, model: anthropic(modelName) }
  } else if (providerName === "groq") {
    const [{ createGroq }, { streamText }] = await Promise.all([import("@ai-sdk/groq"), import("ai")])
    const groq = createGroq()
    return { streamText, model: groq(modelName) }
  } else if (providerName === "xai") {
    const [{ createXai }, { streamText }] = await Promise.all([import("@ai-sdk/xai"), import("ai")])
    const xai = createXai()
    return { streamText, model: xai(modelName) }
  } else if (providerName === "google") {
    const [{ createGoogleGenerativeAI }, { streamText }] = await Promise.all([import("@ai-sdk/google"), import("ai")])
    const google = createGoogleGenerativeAI()
    return { streamText, model: google(modelName) }
  } else if (providerName === "mistral") {
    const [{ createMistral }, { streamText }] = await Promise.all([import("@ai-sdk/mistral"), import("ai")])
    const mistral = createMistral()
    return { streamText, model: mistral(modelName) }
  } else if (providerName === "deepinfra") {
    const [{ createOpenAICompatible }, { streamText }] = await Promise.all([
      import("@ai-sdk/openai-compatible"),
      import("ai"),
    ])
    const deepinfra = createOpenAICompatible({
      name: "deepinfra",
      baseURL: "https://api.deepinfra.com/v1/openai",
      apiKey: process.env.DEEPINFRA_API_KEY || process.env.OPENAI_API_KEY,
    })
    return { streamText, model: deepinfra(modelName) }
  }
  throw new Error(`Unknown provider for model: ${modelString}`)
}

/**
 * Helper to extract text from a value object (response structures)
 */
function extractTextFromValue(value: any): string | null {
  if (!value || typeof value !== "object") return null

  // Check for text field directly (most common case)
  if (value.text && typeof value.text === "string" && value.text.length > 0) {
    return value.text
  }

  // Check for part.text structure (OpenAI response format)
  if (value.part && value.part.text && typeof value.part.text === "string") {
    return value.part.text
  }

  // Check for item.content structure (OpenAI response format)
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

  // Check for response.output structure (OpenAI format)
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

  // Check for candidates structure (Gemini format)
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

  // Recursively search nested objects (but limit depth to avoid infinite loops)
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

  // Try to extract from error.cause or error.value first (AI SDK often puts response here)
  if (error && typeof error === "object") {
    // Check error.value.text directly first (most common case)
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

    // Also check error.message for embedded JSON
    if (error.message && typeof error.message === "string") {
      // Look for "text":"..." pattern directly in error message (more reliable than parsing nested JSON)
      const textMatch = error.message.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      if (textMatch && textMatch[1]) {
        const extracted = textMatch[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\")
        if (extracted && extracted.length > 0) {
          return extracted
        }
      }

      // Also try to parse Value: {...} pattern if above didn't work
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

  // Combine all error string sources for regex matching
  const errorSources: string[] = []

  if (error instanceof Error) {
    errorSources.push(error.stack || "", error.message || "", String(error))
  }

  // Try to stringify the error object itself
  try {
    errorSources.push(JSON.stringify(error))
  } catch (e) {
    // Ignore JSON.stringify errors
  }

  // Also stringify cause and value for regex matching
  if (error && typeof error === "object") {
    if (error.cause) {
      try {
        errorSources.push(JSON.stringify(error.cause))
      } catch (e) {}
    }
    if (error.value) {
      try {
        errorSources.push(JSON.stringify(error.value))
      } catch (e) {}
    }
  }

  const errorStr = errorSources.filter(Boolean).join(" ")

  // Try to parse as JSON first and extract directly
  try {
    const parsed = JSON.parse(errorStr)
    if (parsed && typeof parsed === "object") {
      // Look for text in various nested structures
      const findText = (obj: any): string | null => {
        if (typeof obj === "string" && obj.includes("answer")) {
          return obj
        }
        if (obj && typeof obj === "object") {
          if (obj.text && typeof obj.text === "string") {
            return obj.text
          }
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
          // Recursively search
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
  } catch (e) {
    // Not valid JSON, continue with regex patterns
  }

  // Pattern 1: Look for "text":"..." with escaped quotes (OpenAI/GPT format)
  // Matches: "text":"{\"answer\":\"paris\"}"
  const textPattern1 = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g
  let match
  const candidates: string[] = []
  while ((match = textPattern1.exec(errorStr)) !== null) {
    const candidate = match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\")
    candidates.push(candidate)
  }

  // Pattern 2: Look for complete JSON object {"answer":"..."}
  const jsonPattern = /\{"answer"\s*:\s*"([^"]+)"\}/g
  const jsonMatches: string[] = []
  while ((match = jsonPattern.exec(errorStr)) !== null) {
    if (match[0]) {
      jsonMatches.push(match[0])
    }
  }

  // Pattern 3: Look for text in candidates array (Gemini format)
  // Matches: {"candidates":[{"content":{"parts":[{"text":"..."}]}}]}
  const candidatePattern = /"parts"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/g
  const candidateMatches: string[] = []
  while ((match = candidatePattern.exec(errorStr)) !== null) {
    if (match[1]) {
      candidateMatches.push(match[1].replace(/\\"/g, '"'))
    }
  }

  // Pattern 4: Look for delta text in OpenAI response format
  // Matches: "delta":"paris" or "delta":"{\"answer\":\"paris\"}"
  const deltaPattern = /"delta"\s*:\s*"((?:[^"\\]|\\.)*)"/g
  const deltaMatches: string[] = []
  while ((match = deltaPattern.exec(errorStr)) !== null) {
    const delta = match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\")
    if (delta && delta.length > 0) {
      deltaMatches.push(delta)
    }
  }

  // Combine all candidates
  const allCandidates = [...candidates, ...jsonMatches, ...candidateMatches, ...deltaMatches]

  if (allCandidates.length === 0) return null

  // Find the longest candidate that looks like valid JSON or contains "answer"
  const validCandidates = allCandidates.filter((c) => {
    const trimmed = c.trim()
    return trimmed.startsWith("{") || trimmed.includes("answer") || (trimmed.length > 3 && /^[a-z]+$/i.test(trimmed))
  })

  if (validCandidates.length === 0) return null

  // Return the longest valid candidate
  const best = validCandidates.reduce((longest, current) => {
    const currentClean = current.trim()
    const longestClean = longest.trim()

    // Prefer JSON objects
    if (currentClean.startsWith("{") && !longestClean.startsWith("{")) {
      return current
    }
    if (longestClean.startsWith("{") && !currentClean.startsWith("{")) {
      return longest
    }

    // Otherwise prefer longer
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
    console.log(`[v0] Running model ${model.id} on clue ${clue.id}`)
    console.log(`[v0] Model string: ${model.modelString}`)
    console.log(`[v0] Clue: "${clue.clue}" (answer: ${clue.answer}, length: ${clue.length})`)

    // Generate prompt
    const prompt = generatePrompt(clue, mode)
    console.log(`[v0] Generated prompt for ${model.id}:`, prompt.substring(0, 200))

    // Set up timeout
    let timeoutId: NodeJS.Timeout | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Timeout")), timeoutMs)
    })

    const { streamText: streamTextFn, model: modelInstance } = await getProviderAndModel(model.modelString, model.id)
    const parts = model.modelString.split("/")
    const providerName = parts[0]

    let result: any
    let streamError: any

    try {
      console.log(`[v0] Calling streamText for ${model.id}...`)

      const streamTextOptions: any = {
        model: modelInstance,
        prompt,
      }

      // Check if this is a reasoning model or thinking is explicitly enabled
      const isReasoningModel = REASONING_MODELS.has(model.id)
      const isThinkingEnabled = model.enableThinking === true || isReasoningModel

      if (!isReasoningModel) {
        // Anthropic models don't allow both temperature and topP
        if (providerName === "anthropic") {
          streamTextOptions.temperature = model.temperature ?? 0.1
          // Don't set topP for Anthropic models
        } else {
          if (model.temperature !== undefined) {
            streamTextOptions.temperature = model.temperature
          }
          if (model.topP !== undefined) {
            streamTextOptions.topP = model.topP
          }
        }
      } else {
        console.log(`[v0] Skipping temperature/topP for reasoning model ${model.id}`)
      }

      if (maxTokens) {
        streamTextOptions.maxTokens = maxTokens
      }

      // Add providerOptions for reasoning/thinking models
      if (isThinkingEnabled) {
        if (providerName === "openai" && isReasoningModel) {
          const openaiOptions: any = {
            reasoningSummary: 'detailed', // Get comprehensive reasoning
          }
          
          // For GPT-5.1 models, set reasoningEffort if specified
          if (model.modelString.includes("gpt-5.1") && model.reasoningEffort) {
            openaiOptions.reasoningEffort = model.reasoningEffort
            console.log(`[v0] Set reasoningEffort to ${model.reasoningEffort} for ${model.id}`)
          }
          
          streamTextOptions.providerOptions = {
            openai: openaiOptions,
          }
          console.log(`[v0] Enabled detailed reasoning for ${model.id}`)
        } else if (providerName === "google" && THINKING_CAPABLE_MODELS.has(model.id)) {
          const thinkingConfig: any = {
            includeThoughts: true, // Include thoughts in response
          }
          
          // For gemini-3-pro-preview, always use thinkingLevel (new API)
          // For older models (2.5-flash, 2.5-pro), use thinkingBudget
          const isGemini3Pro = model.modelString.includes("gemini-3-pro-preview")
          
          if (isGemini3Pro) {
            // Gemini 3 Pro Preview uses thinkingLevel
            thinkingConfig.thinkingLevel = model.thinkingLevel || "medium" // Default to medium if not specified
            console.log(`[v0] Enabled thinking (level: ${thinkingConfig.thinkingLevel}) for ${model.id}`)
          } else {
            // Older Gemini models use thinkingBudget
            thinkingConfig.thinkingBudget = 1024 // Low budget for Wordle (sufficient for simple reasoning)
            console.log(`[v0] Enabled thinking (budget: 1024) for ${model.id}`)
          }
          
          streamTextOptions.providerOptions = {
            google: {
              thinkingConfig,
            },
          }
        } else if (providerName === "anthropic" && ANTHROPIC_REASONING_MODELS.has(model.id)) {
          streamTextOptions.providerOptions = {
            anthropic: {
              thinking: {
                type: 'enabled',
                budgetTokens: 2000, // Low budget for Wordle (sufficient for simple reasoning)
              },
            },
          }
          console.log(`[v0] Enabled thinking (budget: 2000) for ${model.id}`)
        } else if (providerName === "groq" && GROQ_REASONING_MODELS.has(model.id)) {
          streamTextOptions.providerOptions = {
            groq: {
              reasoningFormat: 'parsed', // Expose reasoning in parsed format
              reasoningEffort: 'default', // Enable reasoning (for qwen models)
            },
          }
          console.log(`[v0] Enabled reasoning (format: parsed, effort: default) for ${model.id}`)
        }
      } else {
        // Explicitly disable thinking/reasoning when enableThinking is false
        if (providerName === "google" && THINKING_CAPABLE_MODELS.has(model.id)) {
          streamTextOptions.providerOptions = {
            google: {
              thinkingConfig: {
                thinkingBudget: 0, // Disable thinking
                includeThoughts: false, // Don't include thoughts
              },
            },
          }
          console.log(`[v0] Disabled thinking for ${model.id}`)
        } else if (providerName === "anthropic" && ANTHROPIC_REASONING_MODELS.has(model.id)) {
          streamTextOptions.providerOptions = {
            anthropic: {
              thinking: {
                type: 'disabled',
              },
            },
          }
          console.log(`[v0] Disabled thinking for ${model.id}`)
        } else if (providerName === "groq" && GROQ_REASONING_MODELS.has(model.id)) {
          streamTextOptions.providerOptions = {
            groq: {
              reasoningFormat: 'hidden', // Hide reasoning
              reasoningEffort: 'none', // Disable reasoning
            },
          }
          console.log(`[v0] Disabled reasoning for ${model.id}`)
        }
      }

      // streamText returns synchronously, but streaming happens async
      // Wrap in a promise to handle timeout and errors
      const streamPromise = Promise.resolve(streamTextFn(streamTextOptions))

      result = await Promise.race([streamPromise, timeoutPromise])

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      console.log(`[v0] streamText returned for ${model.id}`)
      
      // Debug: Check what properties are available
      console.log(`[v0] Result properties:`, Object.keys(result))
      console.log(`[v0] Has reasoning property:`, 'reasoning' in result)
      console.log(`[v0] Has reasoningText property:`, 'reasoningText' in result)
      console.log(`[v0] Has fullStream:`, 'fullStream' in result)
    } catch (err) {
      streamError = err

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // For type validation errors, try to extract text from error and continue
      if (streamError instanceof Error && streamError.name === "AI_TypeValidationError") {
        console.warn(`[v0] Type validation error for ${model.id}, attempting to recover...`)

        // Extract text from error message
        const extractedText = extractTextFromError(streamError)
        if (extractedText) {
          text = extractedText
          console.log(`[v0] ✅ Extracted text from validation error: "${text}"`)
          // Create a mock result object so we can continue
          result = { text: Promise.resolve(text), usage: Promise.resolve(undefined) }
          streamError = null
        }
      }

      // For network errors (like Anthropic "Failed to fetch"), try to extract from error
      if (streamError && !text) {
        const extractedText = extractTextFromError(streamError)
        if (extractedText) {
          text = extractedText
          console.log(`[v0] ✅ Extracted text from network error: "${text}"`)
          result = { text: Promise.resolve(text), usage: Promise.resolve(undefined) }
          streamError = null
        }
      }

      if (streamError) {
        if (streamError instanceof Error && streamError.message === "Timeout") {
          // Timeout handled below
        }
        // Only throw if we couldn't recover
        if (!text) {
          console.error(`[v0] streamText FAILED for ${model.id}:`, streamError)
          throw streamError
        }
      }
    }

    // Try to read from stream if result exists and we don't have text yet
    if (result && !text) {
      try {
        // Try fullStream first (AI SDK 5.0+) - contains both reasoning and text
        if (result.fullStream) {
          console.log(`[v0] Consuming fullStream for ${model.id}`)
          const accumulatedText: string[] = []
          let reasoningText = ""
          
          try {
            for await (const chunk of result.fullStream) {
              // Handle reasoning chunks (type: 'reasoning', has 'text' property)
              if (chunk.type === "reasoning") {
                const delta = (chunk as any).text || ""
                reasoningText += delta
                // Send reasoning as progress
                if (onModelProgress && reasoningText) {
                  onModelProgress(model.id, clue.id, reasoningText)
                }
              }
              // Also handle reasoning-delta for backwards compatibility
              else if (chunk.type === "reasoning-delta") {
                const chunkAny = chunk as any
                // Try all possible property names for reasoning content
                const delta = chunkAny.text || chunkAny.textDelta || chunkAny.delta || chunkAny.content || chunkAny.reasoning || ""
                
                reasoningText += delta
                // Send reasoning as progress
                if (onModelProgress && reasoningText) {
                  onModelProgress(model.id, clue.id, reasoningText)
                }
              }
              // Handle text deltas
              else if (chunk.type === "text-delta") {
                if (tFirst === undefined) {
                  tFirst = performance.now()
                }
                const delta = (chunk as any).textDelta || ""
                accumulatedText.push(delta)
                text += delta
              }
            }
            console.log(`[v0] fullStream complete for ${model.id}. Text: "${text}", Reasoning: ${reasoningText.length} chars`)
          } catch (fullStreamError) {
            console.warn(`[v0] fullStream error for ${model.id}:`, fullStreamError)
            // If we accumulated some text, use it
            if (accumulatedText.length > 0) {
              text = accumulatedText.join("")
            }
          }
        }
        // Fallback to textStream if fullStream not available
        else if (result.textStream) {
          console.log(`[v0] Consuming textStream for ${model.id}`)
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
            // Even if iteration fails, we might have accumulated some text
            console.warn(`[v0] Stream iteration error for ${model.id}, attempting recovery...`)

            // Extract text from stream iteration error - this often contains the complete response
            const extractedText = extractTextFromError(streamIterError)
            if (extractedText) {
              // Use extracted text if it's more complete than what we accumulated
              const accumulatedText = accumulatedDeltas.join("")
              if (
                !accumulatedText ||
                extractedText.length > accumulatedText.length ||
                extractedText.includes("answer")
              ) {
                text = extractedText
                console.log(`[v0] ✅ Extracted text from stream iteration error: "${text}"`)
              } else if (accumulatedText) {
                // Keep accumulated text if it's better
                text = accumulatedText
                console.log(`[v0] ✅ Using accumulated text from deltas: "${text}"`)
              }
            } else if (accumulatedDeltas.length > 0) {
              // Fallback to accumulated deltas
              text = accumulatedDeltas.join("")
              console.log(`[v0] ✅ Using accumulated deltas: "${text}"`)
            }
          }
        }
      } catch (outerError) {
        // Catch any other errors during stream access
        console.warn(`[v0] Outer stream error for ${model.id}, attempting recovery...`)
        const extractedText = extractTextFromError(outerError)
        if (extractedText && !text) {
          text = extractedText
          console.log(`[v0] ✅ Extracted text from outer stream error: "${text}"`)
        }
      }
    }

    // Fallback: Try result.text if we still don't have text
    if (!text && result && typeof result === "object" && "text" in result) {
      try {
        const textValue = result.text
        if (textValue instanceof Promise) {
          const awaitedText = await textValue.catch(() => "")
          if (awaitedText && typeof awaitedText === "string" && awaitedText.length > 0) {
            text = awaitedText
            console.log(`[v0] ✅ Recovered from result.text Promise: "${text}"`)
          }
        } else if (typeof textValue === "string" && textValue.length > 0) {
          text = textValue
          console.log(`[v0] ✅ Recovered from result.text: "${text}"`)
        }
      } catch (e) {
        // Ignore recovery errors
      }
    }

    tLast = performance.now()

    let usage
    try {
      usage = await result.usage
    } catch (usageError) {
      console.warn(`[v0] Could not get usage for ${model.id}`)
      usage = undefined
    }

    // Calculate metrics
    const e2eMs = tLast - tRequest
    const ttftMs = tFirst ? tFirst - tRequest : undefined

    if (!text || text.trim().length === 0) {
      console.warn(`[v0] ⚠️ Model ${model.id} has empty output`)
    } else {
      console.log(`[v0] ✅ Model ${model.id} completed in ${e2eMs.toFixed(0)}ms, output: "${text}"`)
    }

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

  // Log any errors
  results.forEach((result: RunClueResult) => {
    if (result.error) {
      console.error(`[v0] Model ${result.attempt.modelId} error on clue ${clue.id}:`, result.error)
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
    console.log(`[v0] Starting clue: ${clue.clue}`)

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

    console.log(`[v0] Completed clue ${clue.id}`)
  }

  return allAttempts
}

