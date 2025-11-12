"use client"

import { useEffect, useState } from "react"
import { useRaceStream } from "@/lib/hooks/use-race-stream"
import { RaceSetupForm } from "@/components/race-setup-form"
import { RaceLane } from "@/components/race-lane"
import { RacePodium } from "@/components/race-podium"
import { RaceStatsPanel } from "@/components/race-stats-panel"
import { RaceSpeedChart } from "@/components/race-speed-chart"
import { RaceAccuracyChart } from "@/components/race-accuracy-chart"
import { LiveClueDisplay } from "@/components/live-clue-display"
import { RaceTimer } from "@/components/race-timer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RotateCcw, Zap, Download, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock } from "lucide-react"
import { MODEL_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const { config, state, result, clueAttempts, isRunning, error, startRace, reset } = useRaceStream()
  const [examples, setExamples] = useState<any[]>([])
  const [isRaceDetailsExpanded, setIsRaceDetailsExpanded] = useState(false)

  // Load examples
  useEffect(() => {
    fetch("/api/race/examples")
      .then((res) => res.json())
      .then((data) => setExamples(data.examples))
      .catch((err) => console.error("[v0] Failed to load examples:", err))
  }, [])

  const getModelAttempts = (modelId: string) => {
    const attempts = Array.from(clueAttempts.values()).flat()
    return attempts.filter((a) => a.modelId === modelId)
  }

  const getModelColor = (modelId: string) => {
    return MODEL_COLORS[modelId] || "#6366f1"
  }

  const getCurrentClue = () => {
    if (!config || !state?.currentClueId) return undefined
    for (const round of config.rounds) {
      const clue = round.clues.find((c) => c.id === state.currentClueId)
      if (clue) return clue
    }
    return undefined
  }

  const exportResults = () => {
    if (!result) return
    const data = JSON.stringify(result, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `race-${result.raceId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const allAttempts = Array.from(clueAttempts.values()).flat()

  // Get all clues in order from config
  const getAllClues = () => {
    if (!config) return []
    const clues: Array<{ clue: any; index: number }> = []
    let index = 1
    for (const round of config.rounds) {
      for (const clue of round.clues) {
        clues.push({ clue, index: index++ })
      }
    }
    return clues
  }

  // Group attempts by clueId
  const getAttemptsByClueId = (clueId: string) => {
    return allAttempts.filter((a) => a.clueId === clueId)
  }

  const allClues = getAllClues()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Crossword Sprint</h1>
                <p className="text-sm text-muted-foreground">AI Model Race</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {state && <RaceTimer startedAt={state.startedAt} completedAt={state.completedAt} isRunning={isRunning} />}

              {result && (
                <Button onClick={exportResults} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}

              {config && (
                <Button onClick={reset} variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Race
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Setup form (only show if no race is running or completed) */}
        {!config && examples.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <RaceSetupForm onStart={startRace} isRunning={isRunning} examples={examples} />
          </div>
        )}

        {/* Error display */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-destructive font-medium">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {config && state && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card className="bg-card/50 backdrop-blur border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-foreground">{config.name}</CardTitle>
                    <Badge variant={state.status === "running" ? "default" : "secondary"} className="uppercase">
                      {state.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        Progress: {state.completedClues} / {state.totalClues} clues
                      </span>
                      <span>{state.progress}%</span>
                    </div>
                    <Progress value={state.progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <LiveClueDisplay currentClue={getCurrentClue()} attempts={allAttempts} isRunning={isRunning} />
          </div>
        )}

        {/* Race lanes */}
        {config && state && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Live Race</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRaceDetailsExpanded(!isRaceDetailsExpanded)}
                className="flex items-center gap-2"
              >
                {isRaceDetailsExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show Details
                  </>
                )}
              </Button>
            </div>
            {config.models.map((model) => (
              <RaceLane
                key={model.id}
                model={model}
                attempts={getModelAttempts(model.id)}
                totalClues={state.totalClues}
                color={getModelColor(model.id)}
                isRunning={isRunning}
              />
            ))}

            {/* Expandable details section */}
            {isRaceDetailsExpanded && (
              <Card className="bg-card/50 backdrop-blur border-border mt-4">
                <CardHeader>
                  <CardTitle className="text-foreground">Question Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allClues.map(({ clue, index }) => {
                      const clueAttempts = getAttemptsByClueId(clue.id)
                      const hasAttempts = clueAttempts.length > 0

                      return (
                        <div
                          key={clue.id}
                          className="p-4 bg-muted/50 rounded-lg border border-border space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-semibold text-muted-foreground">Question {index}</span>
                                {hasAttempts && (
                                  <Badge variant="secondary" className="text-xs">
                                    {clueAttempts.filter((a) => a.correct).length}/{clueAttempts.length} correct
                                  </Badge>
                                )}
                              </div>
                              <p className="text-base font-medium text-foreground mb-1">{clue.clue}</p>
                              <p className="text-xs text-muted-foreground">
                                Answer: <span className="font-mono">{clue.answer}</span> ({clue.length} letters)
                              </p>
                            </div>
                          </div>

                          {hasAttempts ? (
                            <div className="space-y-2 pt-2 border-t border-border">
                              <p className="text-sm font-medium text-muted-foreground">Model Answers:</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {config.models.map((model) => {
                                  const attempt = clueAttempts.find((a) => a.modelId === model.id)
                                  if (!attempt) return null

                                  return (
                                    <div
                                      key={model.id}
                                      className={cn(
                                        "p-3 rounded-lg border text-sm",
                                        attempt.correct
                                          ? "bg-green-500/10 border-green-500/30"
                                          : "bg-red-500/10 border-red-500/30",
                                      )}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-foreground">{model.name}</span>
                                        {attempt.correct ? (
                                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                        )}
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-xs">
                                          <span className="text-muted-foreground">Answer: </span>
                                          <span className="font-mono text-foreground">
                                            {attempt.normalized || attempt.output}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Clock className="w-3 h-3" />
                                          <span>{attempt.e2eMs.toFixed(0)}ms</span>
                                          <span className="ml-auto">Score: {attempt.clueScore.toFixed(1)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="pt-2 border-t border-border">
                              <p className="text-sm text-muted-foreground italic">No attempts yet...</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-foreground">Race Results</h2>

            {/* Stats panel */}
            <RaceStatsPanel scores={result.finalScores} state={state} />

            {/* Podium */}
            <div>
              <h3 className="text-xl font-bold text-foreground mb-4">Top 3</h3>
              <RacePodium scores={result.finalScores} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RaceAccuracyChart scores={result.finalScores} />
              <RaceSpeedChart scores={result.finalScores} />
            </div>

            {/* Full leaderboard */}
            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Full Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.finalScores.map((score, index) => (
                    <div key={score.modelId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-muted-foreground w-6">{index + 1}</div>
                        <div>
                          <div className="font-medium text-foreground">{score.modelName}</div>
                          <div className="text-xs text-muted-foreground">
                            {score.totalCorrect}/{score.totalAttempts} correct · {score.medianE2EMs.toFixed(0)}ms median
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-foreground">{score.avgScore.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">{score.accuracyPct.toFixed(0)}% accuracy</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
