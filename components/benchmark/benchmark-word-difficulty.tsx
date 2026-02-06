"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { WordDifficulty } from "@/lib/benchmark-types"
import { Skull, Sparkles } from "lucide-react"

interface BenchmarkWordDifficultyProps {
  hardestWords: WordDifficulty[]
  easiestWords: WordDifficulty[]
}

export function BenchmarkWordDifficulty({
  hardestWords,
  easiestWords,
}: BenchmarkWordDifficultyProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-card/50 backdrop-blur border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground text-base">
            <Skull className="w-5 h-5 text-red-500" />
            Hardest Words
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hardestWords.map((word) => (
            <div key={word.word} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-foreground uppercase tracking-wider">
                  {word.word}
                </span>
                <Badge
                  variant="outline"
                  className="text-red-500 border-red-500/30"
                >
                  {word.solveRate.toFixed(0)}% solved
                </Badge>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{ width: `${word.solveRate}%` }}
                />
              </div>
              {word.hardestFor.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Failed by: {word.hardestFor.slice(0, 3).join(", ")}
                  {word.hardestFor.length > 3 && ` +${word.hardestFor.length - 3} more`}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground text-base">
            <Sparkles className="w-5 h-5 text-green-500" />
            Easiest Words
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {easiestWords.map((word) => (
            <div key={word.word} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-foreground uppercase tracking-wider">
                  {word.word}
                </span>
                <Badge
                  variant="outline"
                  className="text-green-500 border-green-500/30"
                >
                  {word.solveRate.toFixed(0)}% solved
                </Badge>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${word.solveRate}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Avg guesses: {word.avgGuesses.toFixed(2)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
