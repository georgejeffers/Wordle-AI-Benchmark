"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { RaceConfig, RaceState, ClueAttempt, RoundResult, RaceResult } from "@/lib/types"

interface StreamEvent {
  type: "config" | "state" | "modelStart" | "modelProgress" | "attempt" | "clue" | "round" | "complete" | "error"
  config?: RaceConfig
  state?: RaceState
  modelId?: string
  clueId?: string
  partialText?: string
  attempt?: ClueAttempt
  attempts?: ClueAttempt[]
  roundResult?: RoundResult
  result?: RaceResult
  error?: string
}

interface UseRaceStreamResult {
  config: RaceConfig | null
  state: RaceState | null
  result: RaceResult | null
  clueAttempts: Map<string, ClueAttempt[]>
  isRunning: boolean
  error: string | null
  workingModels: Set<string>
  startRace: (name: string, rounds: any[], models?: string[]) => Promise<void>
  reset: () => void
}

/**
 * Hook to manage race streaming
 */
export function useRaceStream(): UseRaceStreamResult {
  const [config, setConfig] = useState<RaceConfig | null>(null)
  const [state, setState] = useState<RaceState | null>(null)
  const [result, setResult] = useState<RaceResult | null>(null)
  const [clueAttempts, setClueAttempts] = useState<Map<string, ClueAttempt[]>>(new Map())
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workingModels, setWorkingModels] = useState<Set<string>>(new Set())
  const abortControllerRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    setConfig(null)
    setState(null)
    setResult(null)
    setClueAttempts(new Map())
    setIsRunning(false)
    setError(null)
    setWorkingModels(new Set())
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const startRace = useCallback(
    async (name: string, rounds: any[], models?: string[]) => {
      reset()
      setIsRunning(true)
      setError(null)

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        const response = await fetch("/api/race/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, rounds, models }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error("No response body")
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              try {
                const event: StreamEvent = JSON.parse(data)

                switch (event.type) {
                  case "config":
                    if (event.config) setConfig(event.config)
                    break
                  case "state":
                    if (event.state) setState(event.state)
                    break
                  case "modelStart":
                    if (event.modelId) {
                      setWorkingModels((prev) => new Set(prev).add(event.modelId!))
                    }
                    break
                  case "modelProgress":
                    break
                  case "attempt":
                    if (event.attempt) {
                      if (event.attempt.modelId) {
                        setWorkingModels((prev) => {
                          const next = new Set(prev)
                          next.delete(event.attempt!.modelId)
                          return next
                        })
                      }

                      setClueAttempts((prev) => {
                        const next = new Map(prev)
                        const clueId = event.attempt!.clueId
                        const existing = next.get(clueId) || []
                        const exists = existing.some((a) => a.modelId === event.attempt!.modelId && a.clueId === clueId)
                        if (!exists) {
                          next.set(clueId, [...existing, event.attempt!])
                        } else {
                          const updated = existing.map((a) =>
                            a.modelId === event.attempt!.modelId && a.clueId === clueId ? event.attempt! : a,
                          )
                          next.set(clueId, updated)
                        }
                        return next
                      })
                    }
                    break
                  case "clue":
                    if (event.clueId && event.attempts) {
                      setClueAttempts((prev) => {
                        const next = new Map(prev)
                        next.set(event.clueId!, event.attempts!)
                        return next
                      })
                    }
                    break
                  case "round":
                    break
                  case "complete":
                    if (event.result) {
                      setResult(event.result)
                      setIsRunning(false)
                      setWorkingModels(new Set())
                    }
                    break
                  case "error":
                    setError(event.error || "Unknown error")
                    setIsRunning(false)
                    setWorkingModels(new Set())
                    break
                }
              } catch (err) {
                console.error("[v0] Failed to parse SSE event:", err)
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.log("[v0] Race aborted")
        } else {
          console.error("[v0] Race stream error:", err)
          setError(err instanceof Error ? err.message : "Unknown error")
        }
        setIsRunning(false)
        setWorkingModels(new Set())
      }
    },
    [reset],
  )

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    config,
    state,
    result,
    clueAttempts,
    isRunning,
    error,
    workingModels,
    startRace,
    reset,
  }
}
