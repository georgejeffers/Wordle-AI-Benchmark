"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DEFAULT_MODELS } from "@/lib/constants"
import { PlayCircle, Loader2 } from "lucide-react"

interface WordleSetupFormProps {
  onStart: (name: string, models: string[]) => void
  isRunning: boolean
}

export function WordleSetupForm({ onStart, isRunning }: WordleSetupFormProps) {
  const [raceName, setRaceName] = useState("")
  const [selectedModels, setSelectedModels] = useState<string[]>(DEFAULT_MODELS.map((m) => m.id))

  const handleStart = () => {
    onStart(raceName || "Wordle Race", selectedModels)
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
        {/* Race name */}
        <div className="space-y-2">
          <Label htmlFor="wordle-name" className="text-foreground">
            Race Name (Optional)
          </Label>
          <Input
            id="wordle-name"
            placeholder="My Wordle Race"
            value={raceName}
            onChange={(e) => setRaceName(e.target.value)}
            disabled={isRunning}
            className="bg-muted text-foreground"
          />
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
          disabled={isRunning || selectedModels.length === 0}
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

