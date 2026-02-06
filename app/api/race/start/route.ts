import { type NextRequest, NextResponse } from "next/server"
import type { RaceConfig, ModelConfig, Round } from "@/lib/types"
import { DEFAULT_MODELS, PUBLIC_MAX_MODELS } from "@/lib/constants"
import { RaceEngine } from "@/lib/race-engine"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes max

// In-memory rate limit: IP -> timestamps of recent requests
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10

interface StartRaceRequest {
  name?: string
  models?: string[] // Model IDs to use, defaults to all
  rounds: Round[]
}

/**
 * POST /api/race/start
 * Start a new AI race
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
      return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 })
    }
    recent.push(now)
    rateLimitMap.set(ip, recent)
  }

  try {
    const body: StartRaceRequest = await request.json()

    // Validate request
    if (!body.rounds || body.rounds.length === 0) {
      return NextResponse.json({ error: "At least one round is required" }, { status: 400 })
    }

    // Select models
    const selectedModelIds = body.models || DEFAULT_MODELS.map((m) => m.id)
    let models: ModelConfig[] = selectedModelIds
      .map((id) => DEFAULT_MODELS.find((m) => m.id === id))
      .filter((m): m is ModelConfig => m !== undefined)

    if (models.length === 0) {
      return NextResponse.json({ error: "No valid models selected" }, { status: 400 })
    }

    // Enforce model cap for public deployments
    if (!unrestricted && models.length > PUBLIC_MAX_MODELS) {
      models = models.slice(0, PUBLIC_MAX_MODELS)
    }

    // Create race config
    const raceConfig: RaceConfig = {
      id: `race-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: body.name || `Race ${new Date().toLocaleString()}`,
      models,
      rounds: body.rounds,
      createdAt: Date.now(),
    }

    console.log(`[v0] Starting race ${raceConfig.id}`)

    // Run the race
    const engine = new RaceEngine(raceConfig)
    const result = await engine.start()

    return NextResponse.json({
      success: true,
      raceId: raceConfig.id,
      result,
    })
  } catch (error) {
    console.error("[v0] Race API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
