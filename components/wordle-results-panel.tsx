"use client"

import type { WordleRaceResult, WordleGameState, WordleModelResult } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Trophy, Clock, Target, ArrowUpDown, Zap, DollarSign, Coins, TrendingUp } from "lucide-react"
import { useMemo, useState } from "react"
import { calculateClosenessScore, calculateEstimatedCost } from "@/lib/wordle-utils"

type SortOption = "rank" | "time" | "tokens" | "cost"

interface Achievement {
  type: "fastest" | "cheapest" | "fewestTokens" | "mostExpensive"
  modelId: string
}

interface WordleResultsPanelProps {
  result: WordleRaceResult
  userGameState: WordleGameState | null
}

export function WordleResultsPanel({ result, userGameState }: WordleResultsPanelProps) {
  const [sortBy, setSortBy] = useState<SortOption>("rank")

  // Calculate user ranking if participating
  const { userResult, allResults, achievements } = useMemo(() => {
    const allResultsList: WordleModelResult[] = [...result.modelResults]
    let userResultData: WordleModelResult | null = null

    if (userGameState) {
      // Determine if user didn't finish (not solved, not failed, but race is complete)
      const didNotFinish = !userGameState.solved && !userGameState.failed && userGameState.guesses.length < 6
      
      // Calculate closeness for failed attempts
      let closenessScore: number | undefined
      let correctLetters: number | undefined
      let presentLetters: number | undefined

      if (!userGameState.solved && userGameState.guesses.length > 0) {
        // Get the last guess to determine closeness
        const lastGuess = userGameState.guesses[userGameState.guesses.length - 1]
        const closeness = calculateClosenessScore(lastGuess.feedback)
        closenessScore = closeness.totalScore
        correctLetters = closeness.correctCount
        presentLetters = closeness.presentCount
      }

      // Calculate total tokens and cost for user
      let totalTokens = 0
      let totalCost = 0
      let totalPromptTokens = 0
      let totalCompletionTokens = 0

      userGameState.guesses.forEach((guess) => {
        if (guess.tokenUsage) {
          totalTokens += guess.tokenUsage.total
          totalPromptTokens += guess.tokenUsage.prompt
          totalCompletionTokens += guess.tokenUsage.completion
        }
      })

      if (totalPromptTokens > 0 || totalCompletionTokens > 0) {
        totalCost = calculateEstimatedCost("user", totalPromptTokens, totalCompletionTokens)
      }
      
      // Create user result
      userResultData = {
        modelId: "user",
        modelName: "You",
        solved: userGameState.solved,
        guessCount: userGameState.solved ? userGameState.solvedAtGuess! : userGameState.guesses.length,
        timeToSolveMs: userGameState.timeToSolveMs,
        closenessScore,
        correctLetters,
        presentLetters,
        totalTokens: totalTokens > 0 ? totalTokens : undefined,
        totalCost: totalCost > 0 ? totalCost : undefined,
        rank: 0, // Will be calculated
      }
      
      // Store didNotFinish flag for display purposes
      ;(userResultData as any).didNotFinish = didNotFinish

      // Add user to results
      allResultsList.push(userResultData)
    }

    // Sort by: solved first, then by time, then by guess count
    // For failed attempts: rank by closeness score (higher = closer)
    allResultsList.sort((a, b) => {
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

      // Both failed - rank by closeness score (higher = better), then by guess count
      const closenessA = a.closenessScore ?? 0
      const closenessB = b.closenessScore ?? 0
      if (closenessA !== closenessB) {
        return closenessB - closenessA // Higher closeness score ranks higher
      }
      // Same closeness, more guesses = better (they tried harder)
      return b.guessCount - a.guessCount
    })

    // Assign ranks
    allResultsList.forEach((r, index) => {
      r.rank = index + 1
    })

    // Calculate achievements (only for solved attempts)
    const solvedResults = allResultsList.filter((r) => r.solved && r.timeToSolveMs !== undefined)
    const resultsWithTokens = allResultsList.filter((r) => r.totalTokens !== undefined)
    const resultsWithCost = allResultsList.filter((r) => r.totalCost !== undefined)

    const achievements: Achievement[] = []
    
    if (solvedResults.length > 0) {
      const fastest = solvedResults.reduce((prev, curr) => 
        (curr.timeToSolveMs || Infinity) < (prev.timeToSolveMs || Infinity) ? curr : prev
      )
      achievements.push({ type: "fastest", modelId: fastest.modelId })
    }

    if (resultsWithCost.length > 0) {
      const cheapest = resultsWithCost.reduce((prev, curr) => 
        (curr.totalCost || Infinity) < (prev.totalCost || Infinity) ? curr : prev
      )
      achievements.push({ type: "cheapest", modelId: cheapest.modelId })

      const mostExpensive = resultsWithCost.reduce((prev, curr) => 
        (curr.totalCost || 0) > (prev.totalCost || 0) ? curr : prev
      )
      achievements.push({ type: "mostExpensive", modelId: mostExpensive.modelId })
    }

    if (resultsWithTokens.length > 0) {
      const fewestTokens = resultsWithTokens.reduce((prev, curr) => 
        (curr.totalTokens || Infinity) < (prev.totalTokens || Infinity) ? curr : prev
      )
      achievements.push({ type: "fewestTokens", modelId: fewestTokens.modelId })
    }

    return { userResult: userResultData, allResults: allResultsList, achievements }
  }, [userGameState, result.modelResults])

  // Sort results based on selected sort option
  const sortedResults = useMemo(() => {
    const results = [...allResults]
    
    if (sortBy === "rank") {
      return results.sort((a, b) => a.rank - b.rank)
    } else if (sortBy === "time") {
      return results.sort((a, b) => {
        const timeA = a.timeToSolveMs ?? Infinity
        const timeB = b.timeToSolveMs ?? Infinity
        return timeA - timeB
      })
    } else if (sortBy === "tokens") {
      return results.sort((a, b) => {
        const tokensA = a.totalTokens ?? Infinity
        const tokensB = b.totalTokens ?? Infinity
        return tokensA - tokensB
      })
    } else if (sortBy === "cost") {
      return results.sort((a, b) => {
        const costA = a.totalCost ?? Infinity
        const costB = b.totalCost ?? Infinity
        return costA - costB
      })
    }
    
    return results
  }, [allResults, sortBy])

  const winner = result.modelResults.find((r) => r.rank === 1)
  const displayWinner = userResult?.rank === 1 ? userResult : winner

  const getAchievementBadge = (modelId: string) => {
    const achievement = achievements.find((a) => a.modelId === modelId)
    if (!achievement) return null

    const badges = {
      fastest: { label: "Fastest", icon: Zap, color: "bg-blue-500" },
      cheapest: { label: "Cheapest", icon: DollarSign, color: "bg-green-500" },
      fewestTokens: { label: "Fewest Tokens", icon: Coins, color: "bg-purple-500" },
      mostExpensive: { label: "Most Expensive", icon: TrendingUp, color: "bg-red-500" },
    }

    const badge = badges[achievement.type]
    const Icon = badge.icon

    return (
      <Badge className={`${badge.color} text-white ml-2`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </Badge>
    )
  }

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
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Results</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={sortBy === "rank" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("rank")}
                className="h-8"
              >
                <ArrowUpDown className="w-3 h-3 mr-1" />
                Rank
              </Button>
              <Button
                variant={sortBy === "time" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("time")}
                className="h-8"
              >
                <Clock className="w-3 h-3 mr-1" />
                Time
              </Button>
              <Button
                variant={sortBy === "tokens" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("tokens")}
                className="h-8"
              >
                <Coins className="w-3 h-3 mr-1" />
                Tokens
              </Button>
              <Button
                variant={sortBy === "cost" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("cost")}
                className="h-8"
              >
                <DollarSign className="w-3 h-3 mr-1" />
                Cost
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedResults.map((modelResult) => {
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
                      <div className={`font-medium flex items-center ${isUser ? 'text-primary' : 'text-foreground'}`}>
                        {modelResult.modelName}
                        {getAchievementBadge(modelResult.modelId)}
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
                            {modelResult.totalTokens && (
                              <>
                                {" · "}
                                <span className="flex items-center gap-1 inline-flex">
                                  <Coins className="w-3 h-3" />
                                  {modelResult.totalTokens.toLocaleString()} tokens
                                </span>
                              </>
                            )}
                            {modelResult.totalCost && (
                              <>
                                {" · "}
                                <span className="flex items-center gap-1 inline-flex">
                                  <DollarSign className="w-3 h-3" />
                                  ${modelResult.totalCost.toFixed(4)}
                                </span>
                              </>
                            )}
                          </>
                        ) : modelResult.didNotFinish ? (
                          <>
                            Did not finish
                            {modelResult.guessCount > 0 && (
                              <>
                                {" · "}
                                {modelResult.guessCount} guess{modelResult.guessCount !== 1 ? "es" : ""}
                              </>
                            )}
                            {modelResult.timeToSolveMs !== undefined && modelResult.timeToSolveMs > 0 && (
                              <>
                                {" · "}
                                <span className="flex items-center gap-1 inline-flex">
                                  <Clock className="w-3 h-3" />
                                  {(modelResult.timeToSolveMs / 1000).toFixed(1)}s
                                </span>
                              </>
                            )}
                            {modelResult.closenessScore !== undefined && modelResult.closenessScore > 0 && (
                              <>
                                {" · "}
                                <span className="text-muted-foreground/80">
                                  {modelResult.correctLetters || 0} correct, {modelResult.presentLetters || 0} present
                                </span>
                              </>
                            )}
                            {modelResult.totalTokens && (
                              <>
                                {" · "}
                                <span className="flex items-center gap-1 inline-flex">
                                  <Coins className="w-3 h-3" />
                                  {modelResult.totalTokens.toLocaleString()} tokens
                                </span>
                              </>
                            )}
                            {modelResult.totalCost && (
                              <>
                                {" · "}
                                <span className="flex items-center gap-1 inline-flex">
                                  <DollarSign className="w-3 h-3" />
                                  ${modelResult.totalCost.toFixed(4)}
                                </span>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            Failed after {modelResult.guessCount} guesses
                            {modelResult.closenessScore !== undefined && modelResult.closenessScore > 0 && (
                              <>
                                {" · "}
                                <span className="text-muted-foreground/80">
                                  {modelResult.correctLetters || 0} correct, {modelResult.presentLetters || 0} present
                                </span>
                              </>
                            )}
                            {modelResult.totalTokens && (
                              <>
                                {" · "}
                                <span className="flex items-center gap-1 inline-flex">
                                  <Coins className="w-3 h-3" />
                                  {modelResult.totalTokens.toLocaleString()} tokens
                                </span>
                              </>
                            )}
                            {modelResult.totalCost && (
                              <>
                                {" · "}
                                <span className="flex items-center gap-1 inline-flex">
                                  <DollarSign className="w-3 h-3" />
                                  ${modelResult.totalCost.toFixed(4)}
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    {modelResult.solved ? (
                      <Badge variant="default" className="bg-green-500">
                        Solved
                      </Badge>
                    ) : modelResult.didNotFinish ? (
                      <Badge variant="outline" className="border-orange-500 text-orange-500">
                        Did Not Finish
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

