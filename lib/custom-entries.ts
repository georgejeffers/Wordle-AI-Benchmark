// Utilities for managing custom Wordle entries (localStorage)

import type { CustomEntry } from "./types"

const STORAGE_KEY = "wordle-custom-entries"

export function getCustomEntries(): CustomEntry[] {
  if (typeof window === "undefined") return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error("[custom-entries] Failed to load custom entries:", error)
    return []
  }
}

export function saveCustomEntry(entry: CustomEntry): void {
  if (typeof window === "undefined") return
  
  try {
    const entries = getCustomEntries()
    const existingIndex = entries.findIndex((e) => e.id === entry.id)
    
    if (existingIndex >= 0) {
      entries[existingIndex] = entry
    } else {
      entries.push(entry)
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (error) {
    console.error("[custom-entries] Failed to save custom entry:", error)
  }
}

export function deleteCustomEntry(id: string): void {
  if (typeof window === "undefined") return
  
  try {
    const entries = getCustomEntries()
    const filtered = entries.filter((e) => e.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error("[custom-entries] Failed to delete custom entry:", error)
  }
}

export function createCustomEntryId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

