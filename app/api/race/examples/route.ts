import { NextResponse } from "next/server"
import type { Round } from "@/lib/types"

/**
 * GET /api/race/examples
 * Get example race configurations
 */
export async function GET() {
  const examples: { name: string; rounds: Round[] }[] = [
    {
      name: "Quick Sprint",
      rounds: [
        {
          id: "r1",
          type: "crossword",
          name: "Geography & Culture",
          outputRule: "json",
          clues: [
            { id: "c1", clue: "Capital of France (5)", answer: "paris", length: 5, caseRule: "lower" },
            { id: "c2", clue: "Largest ocean (7)", answer: "pacific", length: 7, caseRule: "lower" },
            { id: "c3", clue: "Egyptian river (4)", answer: "nile", length: 4, caseRule: "lower" },
          ],
          maxTokens: 8,
          timeLimitMs: 4000,
        },
      ],
    },
    {
      name: "Tech Challenge",
      rounds: [
        {
          id: "r1",
          type: "crossword",
          name: "Computer Science",
          outputRule: "json",
          clues: [
            { id: "c1", clue: "Web protocol (4)", answer: "http", length: 4, caseRule: "lower" },
            { id: "c2", clue: "Programming snake (6)", answer: "python", length: 6, caseRule: "lower" },
            { id: "c3", clue: "Binary digit (3)", answer: "bit", length: 3, caseRule: "lower" },
            { id: "c4", clue: "Computer memory unit (4)", answer: "byte", length: 4, caseRule: "lower" },
            { id: "c5", clue: "Query language (3)", answer: "sql", length: 3, caseRule: "lower" },
          ],
          maxTokens: 8,
          timeLimitMs: 4000,
        },
      ],
    },
    {
      name: "Mythology Marathon",
      rounds: [
        {
          id: "r1",
          type: "crossword",
          name: "Greek Gods",
          outputRule: "json",
          clues: [
            { id: "c1", clue: "King of the gods (4)", answer: "zeus", length: 4, caseRule: "lower" },
            { id: "c2", clue: "Greek earth goddess (7)", answer: "demeter", length: 7, caseRule: "lower" },
            { id: "c3", clue: "Messenger god (6)", answer: "hermes", length: 6, caseRule: "lower" },
            { id: "c4", clue: "God of war (4)", answer: "ares", length: 4, caseRule: "lower" },
          ],
          maxTokens: 8,
          timeLimitMs: 4000,
        },
        {
          id: "r2",
          type: "crossword",
          name: "Norse Gods",
          outputRule: "json",
          clues: [
            { id: "c5", clue: "God of thunder (4)", answer: "thor", length: 4, caseRule: "lower" },
            { id: "c6", clue: "Allfather (4)", answer: "odin", length: 4, caseRule: "lower" },
            { id: "c7", clue: "Trickster god (4)", answer: "loki", length: 4, caseRule: "lower" },
          ],
          maxTokens: 8,
          timeLimitMs: 4000,
        },
      ],
    },
  ]

  return NextResponse.json({ examples })
}
