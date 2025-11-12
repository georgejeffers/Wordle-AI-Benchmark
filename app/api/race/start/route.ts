import { type NextRequest, NextResponse } from "next/server"
import type { RaceConfig, ModelConfig, Round } from "@/lib/types"
import { DEFAULT_MODELS } from "@/lib/constants"
import { RaceEngine } from "@/lib/race-engine"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes max

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
  try {
    const body: StartRaceRequest = await request.json()

    // Validate request
    if (!body.rounds || body.rounds.length === 0) {
      return NextResponse.json({ error: "At least one round is required" }, { status: 400 })
    }

    // Select models
    const selectedModelIds = body.models || DEFAULT_MODELS.map((m) => m.id)
    const models: ModelConfig[] = selectedModelIds
      .map((id) => DEFAULT_MODELS.find((m) => m.id === id))
      .filter((m): m is ModelConfig => m !== undefined)

    if (models.length === 0) {
      return NextResponse.json({ error: "No valid models selected" }, { status: 400 })
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
