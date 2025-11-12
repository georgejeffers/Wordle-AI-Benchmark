import type { NextRequest } from "next/server"
import type { RaceConfig, ModelConfig, Round, RaceState, ClueAttempt, RoundResult, RaceResult } from "@/lib/types"
import { DEFAULT_MODELS } from "@/lib/constants"
import { RaceEngine } from "@/lib/race-engine"

export const runtime = "nodejs"
export const maxDuration = 300

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
  const models: ModelConfig[] = selectedModelIds
    .map((id) => DEFAULT_MODELS.find((m) => m.id === id))
    .filter((m): m is ModelConfig => m !== undefined)

  if (models.length === 0) {
    console.error("[v0] No valid models found")
    return new Response(JSON.stringify({ error: "No valid models" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
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
        // Create engine with callbacks
        const engine = new RaceEngine(raceConfig, {
          onStateChange: (state: RaceState) => {
            try {
              console.log(`[v0] State change: ${state.status}, progress: ${state.progress}%`)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "state", state })}\n\n`))
            } catch (error) {
              console.error("[v0] Failed to send state update:", error)
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
