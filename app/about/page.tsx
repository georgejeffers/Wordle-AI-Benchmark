import { Zap, Server, Gauge, Brain, Code2, Activity, Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const metadata = {
  title: "About - Crossword Sprint AI",
  description:
    "Learn how Crossword Sprint AI benchmarks language models in real-time using Server-Sent Events and parallel AI execution.",
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Zap className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Crossword Sprint</h1>
                <p className="text-sm text-muted-foreground">AI Model Race</p>
              </div>
            </Link>
            <Button asChild variant="outline" size="sm">
              <Link href="/">Back to Race</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4 text-balance">Real-Time AI Model Benchmarking</h1>
          <p className="text-xl text-muted-foreground text-pretty">
            Watch language models compete head-to-head on crossword clues, streaming results as they generate answers
          </p>
        </div>

        {/* What It Does */}
        <Card className="mb-8 bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Brain className="w-5 h-5" />
              What It Does
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Crossword Sprint AI is a real-time benchmarking platform that pits multiple language models against each
              other in timed crossword challenges. Each model receives the same clues simultaneously and races to
              provide correct answers as quickly as possible.
            </p>
            <p>
              The system scores each attempt based on both <strong className="text-foreground">accuracy</strong> and{" "}
              <strong className="text-foreground">speed</strong>, providing a comprehensive view of model performance
              under constrained output conditions (typical crossword answers are 3-15 characters).
            </p>
          </CardContent>
        </Card>

        {/* Technical Architecture */}
        <Card className="mb-8 bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Code2 className="w-5 h-5" />
              Technical Architecture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Server className="w-4 h-4" />
                Server-Sent Events (SSE) Streaming
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                The system uses SSE to stream race updates to the client in real-time. Each model attempt is sent
                individually as soon as it completes, rather than waiting for all models to finish.
              </p>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs overflow-x-auto">
                <div className="text-green-600 dark:text-green-400">// Backend sends events as they happen:</div>
                <div>
                  controller.enqueue(&quot;data: &#123;&quot;type&quot;:&quot;attempt&quot;, ...&#125;\n\n&quot;)
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Parallel Model Execution
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                All models process each clue simultaneously using Promise.all(), with individual completion callbacks
                that trigger SSE updates the moment each model finishes.
              </p>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs overflow-x-auto">
                <div className="text-green-600 dark:text-green-400">// Parallel execution with callbacks:</div>
                <div>await Promise.all(models.map(model =&gt;</div>
                <div className="ml-4">runModel(model).then(onComplete)</div>
                <div>))</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Performance Metrics
              </h3>
              <p className="text-sm text-muted-foreground">Each attempt is measured for:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mt-2">
                <li>
                  <strong className="text-foreground">Time to First Token (TTFT)</strong>: Latency before generation
                  starts
                </li>
                <li>
                  <strong className="text-foreground">End-to-End Time</strong>: Total completion time
                </li>
                <li>
                  <strong className="text-foreground">Accuracy</strong>: Normalized string matching against correct
                  answer
                </li>
                <li>
                  <strong className="text-foreground">Composite Score</strong>: Combined metric balancing speed and
                  correctness
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Scoring Algorithm
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Models are scored using a time-weighted accuracy system that rewards both correctness and speed:
              </p>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs overflow-x-auto">
                <div className="text-green-600 dark:text-green-400">// Score calculation:</div>
                <div>baseScore = correct ? 100 : 0</div>
                <div>timeBonus = max(0, (timeLimit - e2eTime) / timeLimit * 50)</div>
                <div>finalScore = baseScore + timeBonus</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hackathon Context */}
        <Card className="mb-8 bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Built for Web Summit Hackathon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              This project was created for the <strong className="text-foreground">Web Summit Hackathon</strong>,
              inspired by Groq's impressive AI inference speed demonstrations. The goal was to build a visual,
              interactive way to compare multiple language models racing against each other in real-time.
            </p>
            <p>
              Special thanks to <strong className="text-foreground">Vercel</strong> and{" "}
              <strong className="text-foreground">v0</strong> for making this possible. Built entirely with v0's AI code
              generation and deployed on Vercel's infrastructure with the AI SDK powering real-time model streaming.
            </p>
          </CardContent>
        </Card>

        {/* Creator Section */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-foreground font-medium mb-1">Built by George Jefferson</p>
                <p className="text-sm text-muted-foreground">Open source project exploring real-time AI benchmarking</p>
              </div>
              <div className="flex gap-3">
                <Button asChild variant="outline" size="sm">
                  <a href="https://x.com/GeorgeJeffersn" target="_blank" rel="noopener noreferrer">
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Follow on X
                  </a>
                </Button>
                <Button asChild variant="default" size="sm">
                  <Link href="/">Try It Now</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
