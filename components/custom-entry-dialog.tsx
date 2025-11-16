"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DEFAULT_MODELS } from "@/lib/constants"
import { generateWordlePrompt } from "@/lib/prompts"
import { createCustomEntryId, saveCustomEntry } from "@/lib/custom-entries"
import type { CustomEntry } from "@/lib/types"

interface CustomEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (entry: CustomEntry) => void
  editingEntry?: CustomEntry | null
}

export function CustomEntryDialog({
  open,
  onOpenChange,
  onSave,
  editingEntry,
}: CustomEntryDialogProps) {
  const [name, setName] = useState("")
  const [modelId, setModelId] = useState("")
  const [prompt, setPrompt] = useState("")
  const [error, setError] = useState("")

  // Get default prompt template
  const defaultPrompt = generateWordlePrompt("example", [])

  useEffect(() => {
    if (open) {
      if (editingEntry) {
        setName(editingEntry.name)
        setModelId(editingEntry.modelId)
        setPrompt(editingEntry.prompt)
      } else {
        setName("")
        setModelId(DEFAULT_MODELS[0]?.id || "")
        setPrompt(defaultPrompt)
      }
      setError("")
    }
  }, [open, editingEntry, defaultPrompt])

  const handleSave = () => {
    if (!name.trim()) {
      setError("Please enter a name")
      return
    }
    if (!modelId) {
      setError("Please select a model")
      return
    }
    if (!prompt.trim()) {
      setError("Please enter a prompt")
      return
    }

    const entry: CustomEntry = {
      id: editingEntry?.id || createCustomEntryId(),
      name: name.trim(),
      modelId,
      prompt: prompt.trim(),
      createdAt: editingEntry?.createdAt || Date.now(),
    }

    saveCustomEntry(entry)
    onSave(entry)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingEntry ? "Edit Custom Entry" : "Create Custom Entry"}</DialogTitle>
          <DialogDescription>
            Create a custom entry with your own prompt. This will override the default prompt for the selected model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name input */}
          <div className="space-y-2">
            <Label htmlFor="entry-name">Name</Label>
            <Input
              id="entry-name"
              placeholder="e.g., GPT-5 with My Custom Prompt"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError("")
              }}
              className="bg-muted text-foreground"
            />
          </div>

          {/* Model selection */}
          <div className="space-y-2">
            <Label htmlFor="entry-model">Model</Label>
            <select
              id="entry-model"
              value={modelId}
              onChange={(e) => {
                setModelId(e.target.value)
                if (error) setError("")
              }}
              className="w-full p-2 rounded-lg border border-border bg-muted text-foreground"
            >
              {DEFAULT_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Prompt input */}
          <div className="space-y-2">
            <Label htmlFor="entry-prompt">Prompt</Label>
            <textarea
              id="entry-prompt"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value)
                if (error) setError("")
              }}
              rows={12}
              className="w-full p-3 rounded-lg border border-border bg-muted text-foreground font-mono text-sm resize-y"
              placeholder={defaultPrompt}
            />
            <p className="text-xs text-muted-foreground">
              Edit the prompt template above. The prompt will receive previous guesses and feedback as context.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

