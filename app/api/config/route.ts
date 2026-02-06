import { NextResponse } from "next/server"
import { PUBLIC_MAX_MODELS } from "@/lib/constants"

export function GET() {
  const unrestricted = process.env.UNRESTRICTED === "true"
  return NextResponse.json({
    maxModels: unrestricted ? null : PUBLIC_MAX_MODELS,
  })
}
