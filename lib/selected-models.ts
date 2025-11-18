// Utilities for managing selected Wordle models (localStorage)

const STORAGE_KEY = "wordle-selected-models"

export function getSelectedModels(): string[] {
  if (typeof window === "undefined") return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    // Ensure it's an array
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error("[selected-models] Failed to load selected models:", error)
    return []
  }
}

export function saveSelectedModels(modelIds: string[]): void {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modelIds))
  } catch (error) {
    console.error("[selected-models] Failed to save selected models:", error)
  }
}

