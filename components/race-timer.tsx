"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

interface RaceTimerProps {
  startedAt?: number
  completedAt?: number
  isRunning: boolean
}

export function RaceTimer({ startedAt, completedAt, isRunning }: RaceTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) return

    const updateElapsed = () => {
      const endTime = completedAt || Date.now()
      setElapsed(endTime - startedAt)
    }

    updateElapsed()

    if (isRunning) {
      const interval = setInterval(updateElapsed, 100)
      return () => clearInterval(interval)
    }
  }, [startedAt, completedAt, isRunning])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    const remainingMs = Math.floor((ms % 1000) / 10)

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}.${remainingMs.toString().padStart(2, "0")}`
    }
    return `${remainingSeconds}.${remainingMs.toString().padStart(2, "0")}s`
  }

  if (!startedAt) return null

  return (
    <div className="flex items-center gap-2 text-sm font-mono">
      <Clock className="w-4 h-4 text-muted-foreground" />
      <span className={isRunning ? "text-primary font-bold" : "text-foreground"}>{formatTime(elapsed)}</span>
    </div>
  )
}
