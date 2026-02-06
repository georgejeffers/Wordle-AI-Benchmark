import { Suspense } from "react"
import { BenchmarkShowcase } from "@/components/benchmark/benchmark-showcase"
import { loadBenchmarkResults } from "@/lib/benchmark-data"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Wordle AI Benchmark Results | 34+ Models, 50 Words",
  description:
    "Live benchmark results: AI models playing Wordle head-to-head. Compare win rates, guess efficiency, speed, and cost across GPT-5, Claude 4.5, Gemini, Grok, and 30+ more models.",
  alternates: {
    canonical: "https://wordlebench.ginger.sh",
  },
}

export default function HomePage() {
  const data = loadBenchmarkResults()

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading benchmark data...</div>
      </div>
    }>
      <BenchmarkShowcase data={data} />
    </Suspense>
  )
}
