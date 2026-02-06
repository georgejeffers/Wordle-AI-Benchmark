import type { NextRequest } from "next/server"
import type { RaceConfig, ModelConfig, Round, RaceState, ClueAttempt, RoundResult, RaceResult } from "@/lib/types"
import { DEFAULT_MODELS, PUBLIC_MAX_MODELS } from "@/lib/constants"
import { RaceEngine } from "@/lib/race-engine"

export const runtime = "nodejs"
export const maxDuration = 300

// In-memory rate limit: IP -> timestamps of recent requests
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10

interface StartRaceRequest {
  name?: string
  models?: string[]
  rounds: Round[]
}

/**
 * POST /api/race/stream
 * Start a race with Server-Sent Events streaming
 */
export async function POST(request: NextRequest) {
  const unrestricted = process.env.UNRESTRICTED === "true"

  // Rate limiting for public deployments
  if (!unrestricted) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const now = Date.now()
    const timestamps = rateLimitMap.get(ip) || []
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
    if (recent.length >= RATE_LIMIT_MAX) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    }
    recent.push(now)
    rateLimitMap.set(ip, recent)
  }

  console.log("[v0] POST /api/race/stream called")

  let body: StartRaceRequest
  try {
    body = await request.json()
    console.log("[v0] Request body parsed:", {
      name: body.name,
      models: body.models,
      roundCount: body.rounds?.length,
    })
  } catch (error) {
    console.error("[v0] Failed to parse request body:", error)
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!body.rounds || body.rounds.length === 0) {
    console.error("[v0] No rounds provided in request")
    return new Response(JSON.stringify({ error: "No rounds provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Select models
  const selectedModelIds = body.models || DEFAULT_MODELS.map((m) => m.id)
  let models: ModelConfig[] = selectedModelIds
    .map((id) => DEFAULT_MODELS.find((m) => m.id === id))
    .filter((m): m is ModelConfig => m !== undefined)

  if (models.length === 0) {
    console.error("[v0] No valid models found")
    return new Response(JSON.stringify({ error: "No valid models" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Enforce model cap for public deployments
  if (!unrestricted && models.length > PUBLIC_MAX_MODELS) {
    models = models.slice(0, PUBLIC_MAX_MODELS)
  }

  console.log(
    "[v0] Selected models:",
    models.map((m) => m.id),
  )

  // Create race config
  const raceConfig: RaceConfig = {
    id: `race-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: body.name || `Race ${new Date().toLocaleString()}`,
    models,
    rounds: body.rounds,
    createdAt: Date.now(),
  }

  console.log("[v0] Starting streamed race:", raceConfig.id)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log("[v0] Stream started, sending config...")
        // Send initial config
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "config", config: raceConfig })}\n\n`))

        console.log("[v0] Creating RaceEngine...")
        const engine = new RaceEngine(raceConfig, {
          onStateChange: (state: RaceState) => {
            try {
              console.log(`[v0] State change: ${state.status}, progress: ${state.progress}%`)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "state", state })}\n\n`))
            } catch (error) {
              console.error("[v0] Failed to send state update:", error)
            }
          },
          onModelStart: (modelId: string, clueId: string) => {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "modelStart", modelId, clueId })}\n\n`))
            } catch (error) {
              console.error("[v0] Failed to send model start:", error)
            }
          },
          onModelProgress: (modelId: string, clueId: string, partialText: string) => {
            try {
              // Limit partial text length to avoid overwhelming the client
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "modelProgress",
                    modelId,
                    clueId,
                    partialText: partialText.substring(0, 50),
                  })}\n\n`,
                ),
              )
            } catch (error) {
              console.error("[v0] Failed to send model progress:", error)
            }
          },
          onAttemptComplete: (attempt: ClueAttempt) => {
            try {
              console.log(`[v0] Attempt complete: ${attempt.modelId} on ${attempt.clueId}`)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "attempt", attempt })}\n\n`))
            } catch (error) {
              console.error("[v0] Failed to send attempt:", error)
            }
          },
          onClueComplete: (clueId: string, attempts: ClueAttempt[]) => {
            try {
              console.log(`[v0] Clue ${clueId} complete, ${attempts.length} attempts`)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "clue", clueId, attempts })}\n\n`))
            } catch (error) {
              console.error("[v0] Failed to send clue update:", error)
            }
          },
          onRoundComplete: (roundResult: RoundResult) => {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "round", roundResult })}\n\n`))
            } catch (error) {
              console.error("[v0] Failed to send round update:", error)
            }
          },
          onRaceComplete: (raceResult: RaceResult) => {
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "complete", result: raceResult })}\n\n`),
              )
            } catch (error) {
              console.error("[v0] Failed to send race complete:", error)
            }
          },
        })

        console.log("[v0] Starting race engine...")
        // Run race
        await engine.start()

        console.log("[v0] Race complete, closing stream")
        // Close stream
        controller.close()
      } catch (error) {
        console.error("[v0] Stream error:", error)
        if (error instanceof Error) {
          console.error("[v0] Error name:", error.name)
          console.error("[v0] Error message:", error.message)
          console.error("[v0] Error stack:", error.stack)
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
          console.error("[v0] Failed to send error to client:", encodeError)
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
