"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DEFAULT_MODELS } from "@/lib/constants"
import { PlayCircle, Loader2 } from "lucide-react"

interface RaceSetupFormProps {
  onStart: (name: string, rounds: any[], models: string[]) => void
  isRunning: boolean
  examples: any[]
}

export function RaceSetupForm({ onStart, isRunning, examples }: RaceSetupFormProps) {
  const [raceName, setRaceName] = useState("")
  const [selectedModels, setSelectedModels] = useState<string[]>(DEFAULT_MODELS.map((m) => m.id))
  const [selectedExample, setSelectedExample] = useState(0)
  const [maxModels, setMaxModels] = useState<number | null>(null)

  // Fetch config to know model cap
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        const cap = data.maxModels ?? null
        setMaxModels(cap)
        // Clamp initial selection
        if (cap !== null && selectedModels.length > cap) {
          setSelectedModels((prev) => prev.slice(0, cap))
        }
      })
      .catch(() => {})
  }, [])

  const handleStart = () => {
    const example = examples[selectedExample]
    onStart(raceName || example.name, example.rounds, selectedModels)
  }

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelId)) return prev.filter((id) => id !== modelId)
      // Enforce cap when adding
      if (maxModels !== null && prev.length >= maxModels) return prev
      return [...prev, modelId]
    })
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Setup Race</CardTitle>
        <CardDescription className="text-muted-foreground">Choose your models and race configuration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Race name */}
        <div className="space-y-2">
          <Label htmlFor="race-name" className="text-foreground">
            Race Name (Optional)
          </Label>
          <Input
            id="race-name"
            placeholder="My Epic AI Race"
            value={raceName}
            onChange={(e) => setRaceName(e.target.value)}
            disabled={isRunning}
            className="bg-muted text-foreground"
          />
        </div>

        {/* Example selector */}
        <div className="space-y-2">
          <Label className="text-foreground">Race Template</Label>
          <div className="grid grid-cols-1 gap-2">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={() => setSelectedExample(index)}
                disabled={isRunning}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedExample === index
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted hover:border-primary/50"
                }`}
              >
                <div className="font-medium text-foreground">{example.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {example.rounds.length} round(s),{" "}
                  {example.rounds.reduce((sum: number, r: any) => sum + r.clues.length, 0)} clues
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Model selection */}
        <div className="space-y-2">
          <Label className="text-foreground">
            Select Models ({selectedModels.length}{maxModels !== null ? `/${maxModels}` : `/${DEFAULT_MODELS.length}`})
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {DEFAULT_MODELS.map((model) => {
              const isSelected = selectedModels.includes(model.id)
              const atCap = !isSelected && maxModels !== null && selectedModels.length >= maxModels
              return (
                <button
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  disabled={isRunning || atCap}
                  className={`p-2 rounded-lg border text-sm transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                  } ${atCap ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {model.name}
                </button>
              )
            })}
          </div>
          {maxModels !== null && (
            <p className="text-xs text-muted-foreground">
              Public demo limited to {maxModels} models per race. Clone the repo and set UNRESTRICTED=true for unlimited access.
            </p>
          )}
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
              Start Race
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
