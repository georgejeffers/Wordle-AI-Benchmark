"use client"

import { useEffect, useState } from "react"
import { useRaceStream } from "@/lib/hooks/use-race-stream"
import { useWordleStream } from "@/lib/hooks/use-wordle-stream"
import { RaceSetupForm } from "@/components/race-setup-form"
import { WordleSetupForm } from "@/components/wordle-setup-form"
import { RaceLane } from "@/components/race-lane"
import { WordleRaceLane } from "@/components/wordle-race-lane"
import { UserWordleLane } from "@/components/user-wordle-lane"
import { RacePodium } from "@/components/race-podium"
import { RaceStatsPanel } from "@/components/race-stats-panel"
import { WordleResultsPanel } from "@/components/wordle-results-panel"
import { RaceSpeedChart } from "@/components/race-speed-chart"
import { RaceAccuracyChart } from "@/components/race-accuracy-chart"
import { LiveClueDisplay } from "@/components/live-clue-display"
import { RaceTimer } from "@/components/race-timer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RotateCcw, Zap, Download, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, Info, Grid3x3, Puzzle, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { MODEL_COLORS, DEFAULT_MODELS } from "@/lib/constants"
import Link from "next/link"

type GameMode = "race" | "wordle"

export default function HomePage() {
  const [gameMode, setGameMode] = useState<GameMode>("wordle")
  
  // Race mode hooks
  const raceStream = useRaceStream()
  const { config, state, result, clueAttempts, isRunning, error, startRace, reset, workingModels } = raceStream
  
  // Wordle mode hooks
  const wordleStream = useWordleStream()
  const {
    config: wordleConfig,
    state: wordleState,
    result: wordleResult,
    modelStates: wordleModelStates,
    isRunning: isWordleRunning,
    error: wordleError,
    startWordleRace,
    reset: resetWordle,
    endEarly: endWordleEarly,
    workingModels: wordleWorkingModels,
    includeUser: wordleIncludeUser,
    userGameState: wordleUserGameState,
    targetWord: wordleTargetWord,
    submitUserGuess: wordleSubmitUserGuess,
    currentGuessThinking: wordleCurrentGuessThinking,
  } = wordleStream
  
  const [examples, setExamples] = useState<any[]>([])
  const [isRaceDetailsExpanded, setIsRaceDetailsExpanded] = useState(false)
  const [blurAI, setBlurAI] = useState(true) // Blur AI grids by default when user is playing
  
  // Reset both modes when switching
  const handleModeChange = (mode: GameMode) => {
    if (mode !== gameMode) {
      reset()
      resetWordle()
      setBlurAI(true) // Reset blur state
      setGameMode(mode)
    }
  }
  
  // Reset blur when starting a new wordle race
  useEffect(() => {
    if (wordleIncludeUser && wordleConfig) {
      setBlurAI(true)
    }
  }, [wordleConfig?.id, wordleIncludeUser])
  
  // Auto-unblur when race completes
  useEffect(() => {
    if (wordleState?.status === "completed" && blurAI) {
      setBlurAI(false)
    }
  }, [wordleState?.status, blurAI])

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

  const getAttemptsByClueId = (clueId: string) => {
    return allAttempts.filter((a) => a.clueId === clueId)
  }

  const allAttempts = Array.from(clueAttempts.values()).flat()
  const allClues = getAllClues()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Grid3x3 className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Wordle AI Race</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Race AI models against each other
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/" className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    <span className="hidden sm:inline">Benchmark</span>
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/about" className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    <span className="hidden sm:inline">About</span>
                  </Link>
                </Button>

                {(gameMode === "race" ? state : wordleState) && (
                  <RaceTimer
                    startedAt={(gameMode === "race" ? state : wordleState)?.startedAt}
                    completedAt={(gameMode === "race" ? state : wordleState)?.completedAt}
                    isRunning={gameMode === "race" ? isRunning : isWordleRunning}
                  />
                )}

                {(gameMode === "race" ? result : wordleResult) && (
                  <Button
                    onClick={() => {
                      const data = gameMode === "race" ? result : wordleResult
                      if (!data) return
                      const jsonData = JSON.stringify(data, null, 2)
                      const blob = new Blob([jsonData], { type: "application/json" })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      const id = gameMode === "race" ? (data as any).raceId : (data as any).gameId
                      a.download = `${gameMode}-${id}.json`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                )}

                {(gameMode === "race" ? config : wordleConfig) && (
                  <Button
                    onClick={() => {
                      if (gameMode === "race") reset()
                      else resetWordle()
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <RotateCcw className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">New {gameMode === "race" ? "Race" : "Game"}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8 flex-1">
        {/* Setup form (only show if no race is running or completed) */}
        {gameMode === "race" && !config && examples.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <RaceSetupForm onStart={startRace} isRunning={isRunning} examples={examples} />
          </div>
        )}
        
        {gameMode === "wordle" && !wordleConfig && (
          <div className="max-w-2xl mx-auto">
            <WordleSetupForm
              onStart={startWordleRace}
              isRunning={isWordleRunning}
            />
          </div>
        )}

        {/* Error display */}
        {(gameMode === "race" ? error : wordleError) && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-destructive font-medium">
                Error: {gameMode === "race" ? error : wordleError}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Race Mode UI */}
        {gameMode === "race" && config && state && (
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
        
        {/* Wordle Mode UI */}
        {gameMode === "wordle" && wordleConfig && wordleState && (
          <div className="space-y-6">
            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground">{wordleConfig.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={wordleState.status === "running" ? "default" : "secondary"} className="uppercase">
                      {wordleState.status}
                    </Badge>
                    {wordleState.status === "running" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          endWordleEarly()
                        }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        End Early
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Watch AI models race to solve the same Wordle puzzle. Each board shows one model's guesses in real-time.
                </p>
              </CardContent>
            </Card>
            
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* User lane - shown first if participating */}
                {wordleIncludeUser && wordleUserGameState && (
                  <UserWordleLane
                    gameState={wordleUserGameState}
                    isRunning={isWordleRunning}
                    onSubmitGuess={wordleSubmitUserGuess}
                    targetWord={wordleTargetWord || wordleResult?.targetWord}
                  />
                )}
                
                {/* AI model lanes */}
                {wordleConfig.models
                  .filter((model) => model && model.id && (model.name || model.id)) // Filter out invalid models
                  .map((model) => {
                    const gameState = wordleModelStates.get(model.id) || {
                      modelId: model.id,
                      guesses: [],
                      solved: false,
                      failed: false,
                    }
                    return (
                      <WordleRaceLane
                        key={model.id}
                        model={model}
                        gameState={gameState}
                        isRunning={isWordleRunning}
                        isModelWorking={wordleWorkingModels.has(model.id)}
                        blurred={wordleIncludeUser && blurAI && wordleState?.status === "running" && (!wordleUserGameState?.solved && !wordleUserGameState?.failed)}
                        currentGuessThinking={wordleCurrentGuessThinking.get(model.id) || ""}
                        gameStartedAt={wordleState.startedAt}
                      />
                    )
                  })}
              </div>
              
              {/* Show/Hide AI button overlay - appears over blurred area */}
              {wordleIncludeUser && wordleState?.status === "running" && (!wordleUserGameState?.solved && !wordleUserGameState?.failed) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => setBlurAI(!blurAI)}
                    className="pointer-events-auto bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg z-10"
                  >
                    {blurAI ? "Show AI Guesses" : "Hide AI Guesses"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Race lanes */}
        {gameMode === "race" && config && state && (
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
                        <div key={clue.id} className="space-y-2">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-0.5">
                              {index}
                            </Badge>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{clue.clue}</p>
                              <p className="text-xs text-muted-foreground">
                                Expected answer: <span className="font-mono">{clue.answer}</span> ({clue.length}{" "}
                                letters)
                              </p>
                            </div>
                          </div>

                          {hasAttempts && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ml-8">
                              {clueAttempts.map((attempt) => (
                                <div
                                  key={`${attempt.modelId}-${attempt.clueId}`}
                                  className={cn(
                                    "p-2 rounded border text-xs",
                                    attempt.correct
                                      ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                                      : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
                                  )}
                                >
                                  <div className="flex items-center gap-1 mb-1">
                                    {attempt.correct ? (
                                      <CheckCircle2 className="w-3 h-3" />
                                    ) : (
                                      <XCircle className="w-3 h-3" />
                                    )}
                                    <span className="font-medium">{attempt.modelId}</span>
                                  </div>
                                  <div className="font-mono text-xs mb-1">"{attempt.normalized}"</div>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span className="flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" />
                                      {attempt.e2eMs.toFixed(0)}ms
                                    </span>
                                    <span>Score: {attempt.clueScore.toFixed(1)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {config.models.map((model) => (
              <RaceLane
                key={model.id}
                model={model}
                attempts={getModelAttempts(model.id)}
                totalClues={state.totalClues}
                color={getModelColor(model.id)}
                isRunning={isRunning}
                currentClueId={state.currentClueId}
                isModelWorking={workingModels.has(model.id)}
              />
            ))}
          </div>
        )}

        {/* Wordle Mode Results */}
        {gameMode === "wordle" && wordleResult && (
          <WordleResultsPanel 
            result={wordleResult} 
            userGameState={wordleIncludeUser ? wordleUserGameState : null}
          />
        )}

        {/* Race Mode Results */}
        {gameMode === "race" && result && (
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

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="text-foreground font-medium mb-1">Built by George Jefferson</p>
              <p className="text-muted-foreground text-sm">
                Sponsored by{" "}
                <a href="https://x.com/artfreebrey" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Art Freebrey</a>
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <a href="https://x.com/GeorgeJeffersn" target="_blank" rel="noopener noreferrer">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Follow on X
              </a>
            </Button>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center gap-x-3 gap-y-1 justify-center sm:justify-start">
            <span className="text-muted-foreground text-xs">Related:</span>
            <a href="https://ginger.sh/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Ginger</a>
            <a href="https://artomate.app/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Artomate</a>
            <a href="https://resold.app/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Resold</a>
            <a href="https://vinta.app/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Vinta</a>
            <a href="https://revnu.app/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Revnu</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
