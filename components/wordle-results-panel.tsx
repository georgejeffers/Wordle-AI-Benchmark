"use client"

import type { WordleRaceResult, WordleGameState, WordleModelResult } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Trophy, Clock, Target } from "lucide-react"
import { useMemo } from "react"

interface WordleResultsPanelProps {
  result: WordleRaceResult
  userGameState: WordleGameState | null
}

export function WordleResultsPanel({ result, userGameState }: WordleResultsPanelProps) {
  // Calculate user ranking if participating
  const userResult: WordleModelResult | null = useMemo(() => {
    if (!userGameState) return null

    const allResults: WordleModelResult[] = [...result.modelResults]
    
    // Create user result
    const userResultData: WordleModelResult = {
      modelId: "user",
      modelName: "You",
      solved: userGameState.solved,
      guessCount: userGameState.solved ? userGameState.solvedAtGuess! : 6,
      timeToSolveMs: userGameState.timeToSolveMs,
      rank: 0, // Will be calculated
    }

    // Add user to results
    allResults.push(userResultData)

    // Sort by: solved first, then by guess count, then by time
    allResults.sort((a, b) => {
      // Solved models rank higher
      if (a.solved !== b.solved) {
        return a.solved ? -1 : 1
      }

      // Among solved models, fewer guesses wins
      if (a.solved && b.solved) {
        if (a.guessCount !== b.guessCount) {
          return a.guessCount - b.guessCount
        }
        // Same guess count, faster time wins
        const timeA = a.timeToSolveMs || Infinity
        const timeB = b.timeToSolveMs || Infinity
        return timeA - timeB
      }

      // Both failed - rank by guess count (more guesses = better)
      return b.guessCount - a.guessCount
    })

    // Assign ranks
    allResults.forEach((r, index) => {
      r.rank = index + 1
    })

    return userResultData
  }, [userGameState, result.modelResults])

  const winner = result.modelResults.find((r) => r.rank === 1)
  const displayWinner = userResult?.rank === 1 ? userResult : winner

  return (
    <div className="space-y-4">
      {/* Winner announcement */}
      {displayWinner && (
        <Card className={`bg-gradient-to-r ${userResult?.rank === 1 ? 'from-primary/20 to-primary/30 border-primary/50' : 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/50'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <Trophy className={`w-8 h-8 ${userResult?.rank === 1 ? 'text-primary' : 'text-yellow-500'}`} />
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Winner</div>
                <div className="text-2xl font-bold text-foreground">{displayWinner.modelName}</div>
                {displayWinner.solved && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Solved in {displayWinner.guessCount} guess{displayWinner.guessCount !== 1 ? "es" : ""}
                    {displayWinner.timeToSolveMs && displayWinner.timeToSolveMs > 0 && ` in ${(displayWinner.timeToSolveMs / 1000).toFixed(1)}s`}
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
            {/* Combine AI results and user result, sorted by rank */}
            {[...result.modelResults, ...(userResult ? [userResult] : [])]
              .sort((a, b) => a.rank - b.rank)
              .map((modelResult) => {
                const isUser = modelResult.modelId === "user"
                return (
                  <div
                    key={modelResult.modelId}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      modelResult.rank === 1
                        ? isUser
                          ? "bg-primary/10 border-2 border-primary/30"
                          : "bg-yellow-500/10 border-2 border-yellow-500/30"
                        : isUser
                        ? "bg-primary/5 border border-primary/20"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`text-lg font-bold w-6 ${isUser ? 'text-primary' : 'text-muted-foreground'}`}>
                        {modelResult.rank}
                      </div>
                      <div>
                        <div className={`font-medium ${isUser ? 'text-primary' : 'text-foreground'}`}>
                          {modelResult.modelName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {modelResult.solved ? (
                            <>
                              Solved in {modelResult.guessCount} guess{modelResult.guessCount !== 1 ? "es" : ""}
                              {modelResult.timeToSolveMs && modelResult.timeToSolveMs > 0 && (
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
                )
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

