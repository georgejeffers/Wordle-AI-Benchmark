"use client"

import type { WordleRaceResult } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Trophy, Clock, Target } from "lucide-react"

interface WordleResultsPanelProps {
  result: WordleRaceResult
}

export function WordleResultsPanel({ result }: WordleResultsPanelProps) {
  const winner = result.modelResults.find((r) => r.rank === 1)

  return (
    <div className="space-y-4">
      {/* Winner announcement */}
      {winner && (
        <Card className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Winner</div>
                <div className="text-2xl font-bold text-foreground">{winner.modelName}</div>
                {winner.solved && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Solved in {winner.guessCount} guess{winner.guessCount !== 1 ? "es" : ""}
                    {winner.timeToSolveMs && ` in ${(winner.timeToSolveMs / 1000).toFixed(1)}s`}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Target word reveal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Target className="w-5 h-5" />
            Target Word
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-center font-mono text-foreground tracking-wider">
            {result.targetWord.toUpperCase()}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {result.modelResults.map((modelResult) => (
              <div
                key={modelResult.modelId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  modelResult.rank === 1
                    ? "bg-yellow-500/10 border-2 border-yellow-500/30"
                    : "bg-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold text-muted-foreground w-6">{modelResult.rank}</div>
                  <div>
                    <div className="font-medium text-foreground">{modelResult.modelName}</div>
                    <div className="text-xs text-muted-foreground">
                      {modelResult.solved ? (
                        <>
                          Solved in {modelResult.guessCount} guess{modelResult.guessCount !== 1 ? "es" : ""}
                          {modelResult.timeToSolveMs && (
                            <>
                              {" · "}
                              <span className="flex items-center gap-1 inline-flex">
                                <Clock className="w-3 h-3" />
                                {(modelResult.timeToSolveMs / 1000).toFixed(1)}s
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        `Failed after ${modelResult.guessCount} guesses`
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  {modelResult.solved ? (
                    <Badge variant="default" className="bg-green-500">
                      Solved
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Failed</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

