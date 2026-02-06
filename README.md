<div align="center">

# WordleBench

### AI Wordle Benchmark — Compare 34+ Language Models Head-to-Head

[![Live Demo](https://img.shields.io/badge/demo-wordlebench.ginger.sh-22c55e?style=for-the-badge)](https://wordlebench.ginger.sh)
[![MIT License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)

**Deterministic AI benchmarking platform. Every model solves the same Wordle puzzles under identical conditions.**

[Live Results](https://wordlebench.ginger.sh) · [How It Works](#how-it-works) · [Models Tested](#models-tested) · [Run Locally](#quick-start)

</div>

---

## What is WordleBench?

WordleBench is a deterministic testing platform where AI models compete head-to-head solving Wordle puzzles. It measures what traditional benchmarks miss: **accuracy + speed** under identical, reproducible conditions.

Every model gets the same word, the same rules, and the same number of attempts. Results are streamed in real-time so you can watch models think and guess live.

### Why Wordle?

- **Concrete task** — not abstract reasoning on curated datasets
- **Deterministic** — same word, same conditions, fair comparison
- **Speed matters** — fast + correct beats slow + correct
- **Reproducible** — run the same word multiple times to verify consistency
- **Constrained output** — forces precise 5-letter responses, testing instruction following

## Benchmark Results

The full benchmark covers **34+ models × 50 standardized words = 1,700+ games**.

| Metric | What It Measures |
|--------|-----------------|
| **Win Rate** | % of puzzles solved within 6 guesses |
| **Avg Guesses** | Mean guesses to solve (lower is better) |
| **Speed (TTFT)** | Time to first token — model latency |
| **Speed (E2E)** | End-to-end time per guess |
| **Cost** | Estimated API cost per game |
| **Composite** | Combined score balancing all factors |

> View the full interactive leaderboard at [wordlebench.ginger.sh](https://wordlebench.ginger.sh)

## Models Tested

| Provider | Models |
|----------|--------|
| **OpenAI** | GPT-5, GPT-5.1, GPT-5.2, GPT-4.1-mini, o1, o3-mini |
| **Anthropic** | Claude Opus 4.6, Opus 4.5, Opus 4, Sonnet 4.5, Sonnet 4, Haiku 4.5, 3.7 Sonnet |
| **Google** | Gemini 3 Pro Preview, Gemini 2.5 Flash, Gemini 2.5 Pro |
| **xAI** | Grok 4 Fast |
| **Meta** | Llama 3.3 70B |
| **Alibaba** | Qwen 3-32B, Qwen QWQ-32B |
| **DeepSeek** | DeepSeek R1 Distill Llama 70B |
| **Moonshot** | Kimi K2 0905 |

## How It Works

### Deterministic Testing

Every race uses the same target word for all models. Each model:

1. Receives identical game state (previous guesses + Wordle feedback)
2. Has the same constraints (6 guesses max, 5-letter words only)
3. Is measured with precise timing (request start → first token → completion)
4. Gets ranked by: solved status → time to solve → guess count

### Scoring & Ranking

Models are ranked by:

1. **Solved** — Did they get the word? (solvers always rank above failures)
2. **Speed** — Among solvers, faster total time wins
3. **Efficiency** — If tied on speed, fewer guesses wins
4. **Closeness** — Failed models ranked by how close they got (correct letters × 3 + present letters × 1)

### Real-Time Streaming

Results are streamed via **Server-Sent Events (SSE)**. You watch each model's guesses appear live as they generate answers, with per-token timing for accurate latency measurement.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **AI Integration** | Vercel AI SDK v5 via [OpenRouter](https://openrouter.ai) |
| **Runtime** | Bun |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4, shadcn/ui |
| **Charts** | Recharts |
| **Deployment** | Vercel |

## Quick Start

```bash
# Clone the repo
git clone https://github.com/georgejeffers/Wordle-AI-Benchmark.git
cd Wordle-AI-Benchmark

# Install dependencies
bun install

# Add API keys to .env
cp .env.example .env

# Start dev server
bun dev
```

Visit `http://localhost:3000` to start benchmarking.

### Environment Variables

All models are accessed through [OpenRouter](https://openrouter.ai), so you only need one API key:

```env
OPENROUTER_API_KEY=sk-or-...
```

Get your key at [openrouter.ai/keys](https://openrouter.ai/keys).

### Run the Full Benchmark

```bash
# Run benchmark across all models and 50 words
bun benchmark

# Resume a benchmark that was interrupted
bun benchmark:resume

# Quick benchmark (fewer words)
bun benchmark:quick
```

## Architecture

```
app/
├── layout.tsx              # Root layout with SEO metadata
├── page.tsx                # Home — benchmark results dashboard
├── about/page.tsx          # Methodology & documentation
├── sitemap.ts              # Dynamic sitemap generation
├── robots.ts               # Search engine crawling rules
├── opengraph-image.tsx     # Dynamic OG image generation
└── api/wordle/stream/      # SSE streaming endpoint

lib/
├── wordle-engine.ts        # Game orchestration (parallel model execution)
├── ai-runner.ts            # Vercel AI SDK integration + timing
├── wordle-utils.ts         # Feedback computation + scoring
├── wordle-words.ts         # Word list
├── constants.ts            # 34+ model configurations
└── benchmark-data.ts       # Benchmark result loader

components/
├── benchmark/              # Leaderboard, charts, analysis views
├── wordle-*.tsx            # Game board, race lanes, results
└── ui/                     # shadcn/ui primitives
```

## Key Features

- **Live Wordle Racing** — Watch multiple AI models solve puzzles simultaneously
- **Benchmark Dashboard** — Pre-computed results for 34+ models across 50 words
- **Custom Prompts** — Test your own prompt engineering strategies against defaults
- **User Participation** — Play against the AI models yourself
- **Export Data** — Download results as JSON for your own analysis
- **Deterministic Conditions** — Every model gets identical inputs for fair comparison

## Contributing

Contributions welcome! Areas of interest:

- Adding new model providers
- Improving the scoring algorithm
- UI/UX improvements to the benchmark dashboard
- Additional analysis views

## License

[MIT](LICENSE)

---

<div align="center">

Built by [George Jefferson](https://x.com/GeorgeJeffersn) · Sponsored by [Art Freebrey](https://x.com/artfreebrey)

[wordlebench.ginger.sh](https://wordlebench.ginger.sh)

</div>
