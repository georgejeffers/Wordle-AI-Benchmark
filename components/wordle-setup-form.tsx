"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DEFAULT_MODELS } from "@/lib/constants"
import { PlayCircle, Loader2, Plus, Trash2 } from "lucide-react"
import { CustomEntryDialog } from "@/components/custom-entry-dialog"
import { getCustomEntries, deleteCustomEntry } from "@/lib/custom-entries"
import { getSelectedModels, saveSelectedModels } from "@/lib/selected-models"
import type { CustomEntry, ModelConfig } from "@/lib/types"

interface WordleSetupFormProps {
  onStart: (name: string, models: ModelConfig[], targetWord?: string, includeUser?: boolean) => void
  isRunning: boolean
}

export function WordleSetupForm({ onStart, isRunning }: WordleSetupFormProps) {
  // Initialize with all models by default to ensure SSR/client consistency
  // Load from localStorage after mount to avoid hydration mismatch
  const [selectedModels, setSelectedModels] = useState<string[]>(() => {
    // Always start with all models for consistent SSR/client rendering
    return DEFAULT_MODELS.map((m) => m.id)
  })
  const [selectedCustomEntries, setSelectedCustomEntries] = useState<string[]>([])
  const [wordMode, setWordMode] = useState<"random" | "custom">("random")
  const [customWord, setCustomWord] = useState("")
  const [wordError, setWordError] = useState("")
  const [includeUser, setIncludeUser] = useState(false)
  const [customEntries, setCustomEntries] = useState<CustomEntry[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<CustomEntry | null>(null)

  // Load custom entries on mount
  useEffect(() => {
    setCustomEntries(getCustomEntries())
  }, [])

  // Load selected models from localStorage after mount (client-side only)
  useEffect(() => {
    const saved = getSelectedModels()
    // If we have saved models, use them; otherwise keep default (all models)
    if (saved.length > 0) {
      setSelectedModels(saved)
    }
  }, [])

  // Save selected models to localStorage whenever they change
  useEffect(() => {
    saveSelectedModels(selectedModels)
  }, [selectedModels])

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
    }

    // Build model configs - include base models and custom entries as separate entries
    // This allows "model + my prompt" vs "model + your prompt" battles
    const modelConfigs: ModelConfig[] = []
    
    // Add all selected base models (they'll use default prompts)
    selectedModels.forEach((modelId) => {
      const defaultModel = DEFAULT_MODELS.find((m) => m.id === modelId)
      if (defaultModel) {
        modelConfigs.push({ ...defaultModel })
      }
    })
    
    // Add custom entries as separate model configs with unique IDs
    // These will appear as separate entries in the race grid
    selectedCustomEntries.forEach((entryId) => {
      const customEntry = customEntries.find((e) => e.id === entryId)
      if (customEntry) {
        const baseModel = DEFAULT_MODELS.find((m) => m.id === customEntry.modelId)
        if (baseModel) {
          modelConfigs.push({
            ...baseModel,
            id: customEntry.id, // Use custom entry ID directly (already unique)
            name: customEntry.name, // Use custom entry name for display
            customPrompt: customEntry.prompt,
            baseModelId: baseModel.id, // Store base model ID for cost calculation
          })
        }
      }
    })

    const targetWord = wordMode === "custom" ? customWord.trim().toLowerCase() : undefined
    onStart("Wordle Race", modelConfigs, targetWord, includeUser)
  }

  const handleCustomWordChange = (value: string) => {
    const trimmed = value.trim().toLowerCase().slice(0, 5)
    setCustomWord(trimmed)
    if (wordError && trimmed.length === 5 && /^[a-z]{5}$/.test(trimmed)) {
      setWordError("")
    }
  }

  const toggleModel = (modelId: string) => {
    const wasSelected = selectedModels.includes(modelId)
    const newSelection = wasSelected
      ? selectedModels.filter((id) => id !== modelId)
      : [...selectedModels, modelId]
    setSelectedModels(newSelection)
    // Remove custom entries for this model if deselected
    if (wasSelected) {
      setSelectedCustomEntries((prev) =>
        prev.filter((entryId) => {
          const entry = customEntries.find((e) => e.id === entryId)
          return entry?.modelId !== modelId
        })
      )
    }
  }

  const selectAllModels = () => {
    setSelectedModels(DEFAULT_MODELS.map((m) => m.id))
  }

  const deselectAllModels = () => {
    setSelectedModels([])
    // Also clear custom entries when deselecting all
    setSelectedCustomEntries([])
  }

  const toggleCustomEntry = (entryId: string) => {
    setSelectedCustomEntries((prev) =>
      prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId]
    )
  }

  const handleCreateCustom = () => {
    setEditingEntry(null)
    setDialogOpen(true)
  }

  const handleEditCustom = (entry: CustomEntry) => {
    setEditingEntry(entry)
    setDialogOpen(true)
  }

  const handleDeleteCustom = (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteCustomEntry(entryId)
    setCustomEntries(getCustomEntries())
    setSelectedCustomEntries((prev) => prev.filter((id) => id !== entryId))
  }

  const handleSaveCustom = (entry: CustomEntry) => {
    setCustomEntries(getCustomEntries())
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
          <div className="flex items-center justify-between">
            <Label className="text-foreground">
              Select Models ({selectedModels.length}/{DEFAULT_MODELS.length})
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllModels}
                disabled={isRunning || selectedModels.length === DEFAULT_MODELS.length}
                className="h-8 text-xs"
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={deselectAllModels}
                disabled={isRunning || selectedModels.length === 0}
                className="h-8 text-xs"
              >
                Deselect All
              </Button>
            </div>
          </div>
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

        {/* Custom Entries */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-foreground">Custom Entries</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCreateCustom}
              disabled={isRunning}
              className="h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Custom
            </Button>
          </div>
          {customEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Create custom entries to use your own prompts with specific models
            </p>
          ) : (
            <div className="space-y-2">
              {customEntries.map((entry) => {
                const model = DEFAULT_MODELS.find((m) => m.id === entry.modelId)
                const isSelected = selectedCustomEntries.includes(entry.id)
                const isModelSelected = selectedModels.includes(entry.modelId)
                
                return (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border text-sm transition-all cursor-pointer ${
                      isSelected && isModelSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted"
                    } ${!isModelSelected ? "opacity-50" : ""}`}
                    onClick={() => {
                      if (isModelSelected) {
                        toggleCustomEntry(entry.id)
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{entry.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {model?.name || entry.modelId}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected && isModelSelected && (
                          <span className="text-xs text-primary font-medium">Active</span>
                        )}
                        <button
                          onClick={(e) => handleEditCustom(entry)}
                          className="text-muted-foreground hover:text-foreground p-1"
                          disabled={isRunning}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleDeleteCustom(entry.id, e)}
                          className="text-muted-foreground hover:text-destructive p-1"
                          disabled={isRunning}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
      <CustomEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveCustom}
        editingEntry={editingEntry}
      />
    </Card>
  )
}

