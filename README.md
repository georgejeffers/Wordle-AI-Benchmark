# Crossword Sprint - AI Model Race

A high-performance AI racing platform where language models compete head-to-head solving crossword-style clues. Built with Next.js, Vercel AI SDK, and deterministic scoring.

## Features

- **Real-time Racing**: Watch 6 AI models compete simultaneously
- **Deterministic Scoring**: Combines correctness (70%) + speed (30%) for fair ranking
- **Live Metrics**: TTFT, E2E latency, accuracy tracking
- **Multiple Models**: OpenAI GPT-5/5-Nano, Claude 4.5/Haiku, Groq Llama 3.1, xAI Grok
- **Streaming Results**: Server-Sent Events for real-time updates
- **Export Results**: Download race data as JSON

## Architecture

### Core Components

- **Types & Scoring** (`lib/types.ts`, `lib/scoring.ts`): TypeScript types and scoring algorithms
- **AI Runner** (`lib/ai-runner.ts`): Vercel AI SDK integration with streaming
- **Race Engine** (`lib/race-engine.ts`): Orchestration and state management
- **API Routes**: 
  - `/api/race/start` - Synchronous race execution
  - `/api/race/stream` - SSE streaming for live updates
  - `/api/race/examples` - Pre-built race templates

### Scoring Algorithm

Per-clue score (0-100):
- **Format validation**: Invalid format → score = 0
- **Correctness**: Wrong answer → score = 0
- **Base score**: 70 points for correct answer
- **Speed bonus**: 30 points (normalized against field)
- **Lightning bonus**: +2 points for sub-250ms responses

Tie-breakers:
1. Total correct answers
2. Median E2E latency
3. Latency variance (stability)

## Quick Start

\`\`\`bash
# Install dependencies (handled automatically)
npm install

# Start development server
npm run dev
\`\`\`

Visit `http://localhost:3000` to start racing!

## Configuration

### Adding New Clues

Edit `/api/race/examples/route.ts` to add custom crossword rounds:

\`\`\`typescript
{
  id: 'c1',
  clue: 'Capital of France (5)',
  answer: 'paris',
  length: 5,
  caseRule: 'lower'
}
\`\`\`

### Model Configuration

Modify `lib/constants.ts` to adjust model settings:

\`\`\`typescript
{
  id: 'gpt-5',
  name: 'GPT-5',
  modelString: 'openai/gpt-5',
  temperature: 0.1,
  topP: 1,
}
\`\`\`

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **AI**: Vercel AI SDK v5 with AI Gateway
- **Styling**: Tailwind CSS v4
- **UI**: shadcn/ui components
- **Type Safety**: TypeScript throughout
- **Deployment**: Vercel (optimized for edge runtime)

## Performance

- Parallel model execution per clue
- Streaming token capture for precise timing
- Client-side state caching with React hooks
- SSE for efficient real-time updates
- Sub-100ms UI updates

## Future Enhancements

- [ ] Multiplayer mode with user predictions
- [ ] Historical race leaderboards
- [ ] Custom clue editor
- [ ] Model vs. Model head-to-head mode
- [ ] Integration with additional model providers
- [ ] Advanced analytics dashboard

## License

MIT
