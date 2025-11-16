"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DEFAULT_MODELS } from "@/lib/constants"
import { PlayCircle, Loader2 } from "lucide-react"

interface WordleSetupFormProps {
  onStart: (name: string, models: string[], targetWord?: string, includeUser?: boolean) => void
  isRunning: boolean
}

export function WordleSetupForm({ onStart, isRunning }: WordleSetupFormProps) {
  const [selectedModels, setSelectedModels] = useState<string[]>(DEFAULT_MODELS.map((m) => m.id))
  const [wordMode, setWordMode] = useState<"random" | "custom">("random")
  const [customWord, setCustomWord] = useState("")
  const [wordError, setWordError] = useState("")
  const [includeUser, setIncludeUser] = useState(false)

  const handleStart = () => {
    // Validate custom word if selected
    if (wordMode === "custom") {
      const trimmed = customWord.trim().toLowerCase()
      if (!trimmed) {
        setWordError("Please enter a word")
        return
      }
      if (trimmed.length !== 5) {
        setWordError("Word must be exactly 5 letters")
        return
      }
      if (!/^[a-z]{5}$/.test(trimmed)) {
        setWordError("Word must contain only letters")
        return
      }
      setWordError("")
      onStart("Wordle Race", selectedModels, trimmed, includeUser)
    } else {
      onStart("Wordle Race", selectedModels, undefined, includeUser)
    }
  }

  const handleCustomWordChange = (value: string) => {
    const trimmed = value.trim().toLowerCase().slice(0, 5)
    setCustomWord(trimmed)
    if (wordError && trimmed.length === 5 && /^[a-z]{5}$/.test(trimmed)) {
      setWordError("")
    }
  }

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) => (prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]))
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Setup Wordle Race</CardTitle>
        <CardDescription className="text-muted-foreground">
          Watch AI models race to solve the same Wordle puzzle
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Word selection */}
        <div className="space-y-3">
          <Label className="text-foreground">Target Word</Label>
          <div className="space-y-3">
            {/* Random word option */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="word-mode"
                value="random"
                checked={wordMode === "random"}
                onChange={() => {
                  setWordMode("random")
                  setWordError("")
                }}
                disabled={isRunning}
                className="w-4 h-4 text-primary"
              />
              <span className="text-foreground">Use random word from list</span>
            </label>

            {/* Custom word option */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="word-mode"
                value="custom"
                checked={wordMode === "custom"}
                onChange={() => {
                  setWordMode("custom")
                  setWordError("")
                }}
                disabled={isRunning}
                className="w-4 h-4 text-primary"
              />
              <span className="text-foreground">Set custom word</span>
            </label>

            {/* Custom word input */}
            {wordMode === "custom" && (
              <div className="ml-6 space-y-2">
                <Input
                  id="custom-word"
                  placeholder="Enter 5-letter word"
                  value={customWord}
                  onChange={(e) => handleCustomWordChange(e.target.value)}
                  disabled={isRunning}
                  className={`bg-muted text-foreground ${wordError ? "border-destructive" : ""}`}
                  maxLength={5}
                />
                {wordError && (
                  <p className="text-sm text-destructive">{wordError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter a 5-letter word for the AI models to solve
                </p>
              </div>
            )}
          </div>
        </div>

        {/* User participation */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeUser}
              onChange={(e) => setIncludeUser(e.target.checked)}
              disabled={isRunning}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-foreground">Join as player and race against AI</span>
          </label>
          {includeUser && (
            <p className="text-xs text-muted-foreground ml-6">
              You'll be able to make your own guesses and see how you rank against the AI models
            </p>
          )}
        </div>

        {/* Model selection */}
        <div className="space-y-2">
          <Label className="text-foreground">
            Select Models ({selectedModels.length}/{DEFAULT_MODELS.length})
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {DEFAULT_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => toggleModel(model.id)}
                disabled={isRunning}
                className={`p-2 rounded-lg border text-sm transition-all ${
                  selectedModels.includes(model.id)
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                }`}
              >
                {model.name}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <Button
          onClick={handleStart}
          disabled={isRunning || selectedModels.length === 0 || (wordMode === "custom" && !customWord.trim())}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Race Running...
            </>
          ) : (
            <>
              <PlayCircle className="w-5 h-5 mr-2" />
              Start Wordle Race
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

