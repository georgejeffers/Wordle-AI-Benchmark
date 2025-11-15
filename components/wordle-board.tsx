"use client"

import type { WordleGameState, WordleFeedback } from "@/lib/types"
import { cn } from "@/lib/utils"

interface WordleBoardProps {
  gameState: WordleGameState
  isRunning: boolean
}

export function WordleBoard({ gameState, isRunning }: WordleBoardProps) {
  const rows = Array(6).fill(null)
  const cols = Array(5).fill(null)

  const getTileColor = (feedback: WordleFeedback | null): string => {
    if (!feedback) {
      return "bg-muted border-border"
    }
    switch (feedback) {
      case "correct":
        return "bg-green-500 text-white border-green-600"
      case "present":
        return "bg-yellow-500 text-white border-yellow-600"
      case "absent":
        return "bg-gray-500 text-white border-gray-600"
    }
  }

  // Ensure guesses are sorted by guessIndex and deduplicated
  const sortedGuesses = [...gameState.guesses]
    .filter((guess, index, self) => 
      index === self.findIndex((g) => g.guessIndex === guess.guessIndex && g.modelId === guess.modelId)
    )
    .sort((a, b) => a.guessIndex - b.guessIndex)

  return (
    <div className="grid grid-rows-6 gap-1.5 p-2">
      {rows.map((_, rowIndex) => {
        const guess = sortedGuesses[rowIndex]
        const isCurrentRow = rowIndex === sortedGuesses.length && isRunning && !gameState.solved && !gameState.failed

        return (
          <div key={rowIndex} className="grid grid-cols-5 gap-1.5">
            {cols.map((_, colIndex) => {
              const feedback = guess?.feedback[colIndex] || null
              const letter = guess?.word[colIndex]?.toUpperCase() || ""

              return (
                <div
                  key={colIndex}
                  className={cn(
                    "w-12 h-12 border-2 rounded flex items-center justify-center font-bold text-lg transition-all duration-300",
                    getTileColor(feedback),
                    isCurrentRow && "border-primary/50 animate-pulse",
                  )}
                >
                  {letter}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

