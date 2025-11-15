import type { NextRequest } from "next/server"
import type { ModelConfig, WordleConfig, WordleState, WordleGuess, WordleGameState, WordleRaceResult } from "@/lib/types"
import { DEFAULT_MODELS } from "@/lib/constants"
import { WordleEngine } from "@/lib/wordle-engine"
import { getRandomWord } from "@/lib/wordle-words"

export const runtime = "nodejs"
export const maxDuration = 300

interface StartWordleRequest {
  name?: string
  models?: string[]
  targetWord?: string // Optional - for testing/reproducibility
}

/**
 * POST /api/wordle/stream
 * Start a Wordle race with Server-Sent Events streaming
 */
export async function POST(request: NextRequest) {
  console.log("[wordle] POST /api/wordle/stream called")

  let body: StartWordleRequest
  try {
    body = await request.json()
    console.log("[wordle] Request body parsed:", {
      name: body.name,
      models: body.models,
      hasTargetWord: !!body.targetWord,
    })
  } catch (error) {
    console.error("[wordle] Failed to parse request body:", error)
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Select models
  const selectedModelIds = body.models || DEFAULT_MODELS.map((m) => m.id)
  const models: ModelConfig[] = selectedModelIds
    .map((id) => DEFAULT_MODELS.find((m) => m.id === id))
    .filter((m): m is ModelConfig => m !== undefined)

  if (models.length === 0) {
    console.error("[wordle] No valid models found")
    return new Response(JSON.stringify({ error: "No valid models" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  console.log("[wordle] Selected models:", models.map((m) => m.id))

  // Select target word
  const targetWord = body.targetWord || getRandomWord()
  console.log("[wordle] Target word:", targetWord)

  // Create Wordle config (don't send target word to client initially)
  const wordleConfig: WordleConfig = {
    id: `wordle-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: body.name || `Wordle Race ${new Date().toLocaleString()}`,
    models,
    targetWord,
    wordLength: 5,
    maxGuesses: 6,
    createdAt: Date.now(),
  }

  console.log("[wordle] Starting streamed Wordle race:", wordleConfig.id)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log("[wordle] Stream started, sending config...")
        // Send config without target word
        const clientConfig = {
          id: wordleConfig.id,
          name: wordleConfig.name,
          models: wordleConfig.models,
          wordLength: wordleConfig.wordLength,
          maxGuesses: wordleConfig.maxGuesses,
          createdAt: wordleConfig.createdAt,
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "config", config: clientConfig })}\n\n`))

        console.log("[wordle] Creating WordleEngine...")
        const engine = new WordleEngine(wordleConfig, {
          onStateChange: (state: WordleState) => {
            try {
              // Convert Map to object for JSON serialization
              const stateForClient = {
                gameId: state.gameId,
                status: state.status,
                startedAt: state.startedAt,
                completedAt: state.completedAt,
                modelStates: Object.fromEntries(
                  Array.from(state.modelStates.entries()).map(([id, gameState]) => [
                    id,
                    {
                      ...gameState,
                      guesses: gameState.guesses, // Already serializable
                    },
                  ]),
                ),
              }
              console.log(`[wordle] State change: ${state.status}`)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "state", state: stateForClient })}\n\n`))
            } catch (error) {
              console.error("[wordle] Failed to send state update:", error)
            }
          },
          onModelStart: (modelId: string, guessIndex: number) => {
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "modelStart", modelId, guessIndex })}\n\n`),
              )
            } catch (error) {
              console.error("[wordle] Failed to send model start:", error)
            }
          },
          onGuessComplete: (guess: WordleGuess) => {
            try {
              console.log(`[wordle] Guess complete: ${guess.modelId} - ${guess.word}`)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "guess", guess })}\n\n`))
            } catch (error) {
              console.error("[wordle] Failed to send guess:", error)
            }
          },
          onModelComplete: (modelId: string, gameState: WordleGameState) => {
            try {
              console.log(`[wordle] Model complete: ${modelId}, solved: ${gameState.solved}`)
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "modelComplete", modelId, gameState })}\n\n`),
              )
            } catch (error) {
              console.error("[wordle] Failed to send model complete:", error)
            }
          },
          onRaceComplete: (result: WordleRaceResult) => {
            try {
              console.log("[wordle] Race complete, sending result")
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete", result })}\n\n`))
            } catch (error) {
              console.error("[wordle] Failed to send race complete:", error)
            }
          },
        })

        console.log("[wordle] Starting Wordle engine...")
        // Run race
        await engine.start()

        console.log("[wordle] Race complete, closing stream")
        // Close stream
        controller.close()
      } catch (error) {
        console.error("[wordle] Stream error:", error)
        if (error instanceof Error) {
          console.error("[wordle] Error name:", error.name)
          console.error("[wordle] Error message:", error.message)
          console.error("[wordle] Error stack:", error.stack)
        }
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Unknown error",
                details: error instanceof Error ? error.stack : undefined,
              })}\n\n`,
            ),
          )
        } catch (encodeError) {
          console.error("[wordle] Failed to send error to client:", encodeError)
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

