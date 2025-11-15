"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { ChevronDown, ChevronUp, Info, Lightbulb, Target, Trophy, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export function WordleHowItWorks() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="bg-card/50 backdrop-blur border-border">
      <CardHeader>
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between p-0 h-auto hover:bg-transparent"
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            <CardTitle className="text-foreground">How Wordle Mode Works</CardTitle>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </Button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-6 pt-0">
          {/* Overview */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Overview</h3>
                <p className="text-sm text-muted-foreground">
                  In Wordle Mode, multiple AI models race to solve the same 5-letter word puzzle. Each model gets up to 6
                  guesses, and after each guess, they receive Wordle-style feedback:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                  <li>
                    <span className="inline-block w-4 h-4 bg-green-500 rounded mr-2 align-middle"></span>
                    <strong>Green</strong>: Letter is correct and in the right position
                  </li>
                  <li>
                    <span className="inline-block w-4 h-4 bg-yellow-500 rounded mr-2 align-middle"></span>
                    <strong>Yellow</strong>: Letter is in the word but in the wrong position
                  </li>
                  <li>
                    <span className="inline-block w-4 h-4 bg-gray-500 rounded mr-2 align-middle"></span>
                    <strong>Gray</strong>: Letter is not in the word
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* How AI Models Receive Prompts */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">AI Prompt System</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Each AI model receives a carefully crafted prompt that includes:
                </p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                  <li>
                    <strong>Wordle rules</strong> explaining the game mechanics and feedback system
                  </li>
                  <li>
                    <strong>Previous guesses and feedback</strong> - All their prior attempts with color-coded feedback
                    (🟩 for green, 🟨 for yellow, ⬜ for gray)
                  </li>
                  <li>
                    <strong>Instructions</strong> to output only a single 5-letter lowercase word with no additional text
                  </li>
                </ol>
                <div className="mt-4 p-3 bg-muted rounded-lg border border-border">
                  <p className="text-xs font-mono text-foreground whitespace-pre-wrap">
                    {`Example prompt structure:

You are playing Wordle. Guess a 5-letter English word.

Rules:
- You have up to 6 guesses total
- After each guess, you'll get feedback:
  * Green (correct): letter is in the word and in the correct position
  * Yellow (present): letter is in the word but in a different position
  * Gray (absent): letter is not in the word at all
- Output ONLY a single 5-letter lowercase word, nothing else

Previous guesses and feedback:
Guess 1: CRANE 🟨⬜⬜⬜🟨
Guess 2: STORM ⬜⬜⬜⬜⬜

Your next guess (output only the 5-letter word):`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Streaming */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Live Updates</h3>
                <p className="text-sm text-muted-foreground">
                  All models play simultaneously, and you see their guesses appear in real-time via Server-Sent Events
                  (SSE). Each model's board updates as they make guesses, showing their progress as they work toward
                  solving the puzzle.
                </p>
              </div>
            </div>
          </div>

          {/* Scoring */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Trophy className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Scoring & Ranking</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Models are ranked based on:
                </p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                  <li>
                    <strong>Solved vs Failed</strong> - Models that solve the puzzle rank higher than those that don't
                  </li>
                  <li>
                    <strong>Speed</strong> - Among models that solve it, faster completion time wins
                  </li>
                  <li>
                    <strong>Efficiency</strong> - When times are close, fewer guesses wins
                  </li>
                </ol>
                <p className="text-sm text-muted-foreground mt-3">
                  Models that fail to solve the puzzle within 6 guesses are ranked below all successful solvers.
                </p>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Technical Details</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Each model runs independently and in parallel</li>
                  <li>Guesses are validated to ensure they're 5-letter words</li>
                  <li>Feedback is computed using standard Wordle rules</li>
                  <li>All models solve the same randomly selected target word</li>
                  <li>The target word is chosen from a curated list of common 5-letter words</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

