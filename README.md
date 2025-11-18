# Wordle Race - Deterministic AI Testing Platform

A deterministic testing platform where AI models compete head-to-head solving Wordle puzzles. Built with Next.js, Vercel AI SDK, and real-time streaming to measure what actually matters: **accuracy + speed**.

## Why This Exists

Traditional AI benchmarks are unreliable and don't apply to day-to-day use. They measure abstract capabilities on curated datasets, but real-world AI needs to be:

- **Accurate**: Get the right answer
- **Fast**: Respond quickly enough to be useful

This platform provides **deterministic testing** that measures both simultaneously. Every model solves the same Wordle puzzle under identical conditions, giving you real, comparable results you can trust.

## Features

- **Wordle Racing**: Watch multiple AI models compete to solve the same Wordle puzzle in real-time
- **Deterministic Testing**: Same puzzle, same conditions, fair comparison
- **Live Metrics**: Real-time tracking of guesses, timing (TTFT, E2E latency), and accuracy
- **Multiple Models**: Test OpenAI GPT-5/5.1, Claude 4.5/Haiku, Gemini 3/2.5, Groq Llama 3.1, xAI Grok, and more
- **Custom Prompts**: Create custom entries with your own prompts to test prompt engineering strategies
- **User Participation**: Race against the AI models yourself
- **Streaming Results**: Server-Sent Events for real-time updates
- **Export Results**: Download race data as JSON for analysis

## How It Works

### Deterministic Testing

Every race uses the same target word for all models. Each model:
1. Receives identical game state (previous guesses and feedback)
2. Has the same constraints (6 guesses max, 5-letter words)
3. Is measured with precise timing (request start, first token, completion)
4. Gets ranked by: solved status → time to solve → guess count

This eliminates variables and gives you **reproducible, comparable results**.

### Scoring & Ranking

Models are ranked by:
1. **Solved**: Did they solve it? (Yes > No)
2. **Speed**: If solved, how fast? (Total time across all guesses)
3. **Efficiency**: If tied on speed, fewer guesses wins
4. **Closeness**: If failed, how close did they get? (Correct letters + present letters)

Failed attempts are ranked by closeness score (correct letters weighted 3x, present letters 1x) to give credit for partial solutions.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to start racing!

## Architecture

### Core Components

- **Wordle Engine** (`lib/wordle-engine.ts`): Orchestrates Wordle games with multiple models
- **AI Runner** (`lib/ai-runner.ts`): Vercel AI SDK integration with streaming and precise timing
- **Types** (`lib/types.ts`): TypeScript types for Wordle games, guesses, and results
- **Wordle Utils** (`lib/wordle-utils.ts`): Feedback computation, closeness scoring, cost estimation
- **API Routes**: 
  - `/api/wordle/stream` - SSE streaming for live Wordle races

### Wordle Game Flow

1. **Setup**: Select models and optionally a target word (or use random)
2. **Race Start**: All models begin simultaneously with the same target word
3. **Guessing**: Each model makes up to 6 guesses, receiving feedback after each
4. **Real-time Updates**: Watch guesses appear live with timing metrics
5. **Results**: See who solved it fastest, who got closest, and detailed stats

## Testing AI Models

### Why Deterministic Testing Matters

Traditional benchmarks have problems:
- **Curated datasets** don't reflect real-world usage
- **Abstract tasks** don't measure practical performance
- **No timing component** ignores speed, which matters in production
- **Inconsistent conditions** make comparisons unreliable

This platform solves these by:
- **Real-world task**: Wordle is a concrete problem people actually solve
- **Same conditions**: Every model gets identical inputs
- **Speed matters**: Fast and correct beats slow and correct
- **Reproducible**: Run the same word multiple times to verify consistency

### What Gets Measured

- **Accuracy**: Did they solve it? How many guesses?
- **Speed**: Time to first token (TTFT), end-to-end latency (E2E)
- **Efficiency**: Total tokens used, estimated cost
- **Consistency**: Run multiple races to see variance

### Custom Prompts

Test prompt engineering strategies by creating custom entries:
- Use the same base model with different prompts
- Compare "model + your prompt" vs "model + default prompt"
- See which prompts lead to faster, more accurate solutions

## Configuration

### Model Configuration

Modify `lib/constants.ts` to adjust model settings:

```typescript
{
  id: 'gpt-5',
  name: 'GPT-5',
  modelString: 'openai/gpt-5',
  temperature: 0.1,
  topP: 1,
}
```

### Custom Wordle Words

- **Random**: Uses a random word from the Wordle word list
- **Custom**: Specify your own 5-letter word for testing/reproducibility

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **AI**: Vercel AI SDK v5 with AI Gateway
- **Styling**: Tailwind CSS v4
- **UI**: shadcn/ui components
- **Type Safety**: TypeScript throughout
- **Deployment**: Vercel (optimized for edge runtime)

## Performance

- Parallel model execution (all models race simultaneously)
- Streaming token capture for precise timing measurements
- Client-side state caching with React hooks
- SSE for efficient real-time updates
- Sub-100ms UI updates

## Future Enhancements

- [ ] Batch testing mode (run multiple words automatically)
- [ ] Historical race leaderboards
- [ ] Advanced analytics dashboard
- [ ] Integration with additional model providers
- [ ] Custom word lists for domain-specific testing

## License

MIT
