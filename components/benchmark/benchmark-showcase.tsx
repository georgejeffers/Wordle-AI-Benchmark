"use client"

import { useState, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BenchmarkBarChart } from "./benchmark-bar-chart"
import { BenchmarkPodium } from "./benchmark-podium"
import { BenchmarkLeaderboard } from "./benchmark-leaderboard"
import { BenchmarkGuessDistribution } from "./benchmark-guess-distribution"
import { BenchmarkWordDifficulty } from "./benchmark-word-difficulty"
import {
  filterValidModels,
  computeBenchmarkAnalysis,
  buildLeaderboard,
} from "@/lib/benchmark-data"
import type { BenchmarkResults, BenchmarkTab } from "@/lib/benchmark-types"
import {
  Trophy,
  Target,
  Clock,
  Coins,
  BarChart3,
  Zap,
  Grid3x3,
  Download,
} from "lucide-react"
import Link from "next/link"

interface BenchmarkShowcaseProps {
  data: BenchmarkResults
}

export function BenchmarkShowcase({ data }: BenchmarkShowcaseProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = (searchParams.get("tab") as BenchmarkTab) || "overview"
  const [activeTab, setActiveTab] = useState<BenchmarkTab>(initialTab)

  const validModels = useMemo(() => filterValidModels(data.models), [data.models])
  const leaderboard = useMemo(() => buildLeaderboard(validModels), [validModels])
  const analysis = useMemo(() => computeBenchmarkAnalysis(data), [data])
  const allLeaderboard = useMemo(() => buildLeaderboard(data.models), [data.models])

  const handleTabChange = (value: string) => {
    const tab = value as BenchmarkTab
    setActiveTab(tab)
    const url = tab === "overview" ? "/" : `/?tab=${tab}`
    router.replace(url, { scroll: false })
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "benchmark-results.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const runDate = new Date(data.metadata.runDate)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  Wordle AI Benchmark
                </h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    Updated: {runDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {data.metadata.totalModels} models &middot;{" "}
                    {data.metadata.wordCount} words &middot;{" "}
                    {data.metadata.totalGames} games
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/race" className="flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Play Wordle</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Export</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex flex-wrap h-auto gap-1 w-full sm:w-auto">
            <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm">
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">All</span>
            </TabsTrigger>
            <TabsTrigger value="winrate" className="gap-1 text-xs sm:text-sm">
              <Target className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Win Rate</span>
              <span className="sm:hidden">Win%</span>
            </TabsTrigger>
            <TabsTrigger value="guesses" className="gap-1 text-xs sm:text-sm">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Avg Guesses</span>
              <span className="sm:hidden">Guess</span>
            </TabsTrigger>
            <TabsTrigger value="speed" className="gap-1 text-xs sm:text-sm">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              Speed
            </TabsTrigger>
            <TabsTrigger value="cost" className="gap-1 text-xs sm:text-sm">
              <Coins className="w-3 h-3 sm:w-4 sm:h-4" />
              Cost
            </TabsTrigger>
            <TabsTrigger value="combined" className="gap-1 text-xs sm:text-sm">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
              Combined
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-card/50 backdrop-blur border-border">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {analysis.modelComparisons.mostAccurate.winRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Best Win Rate
                  </div>
                  <div className="text-xs text-primary mt-0.5 truncate">
                    {analysis.modelComparisons.mostAccurate.modelName}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur border-border">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {analysis.modelComparisons.mostEfficient.avgGuesses.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Fewest Guesses
                  </div>
                  <div className="text-xs text-primary mt-0.5 truncate">
                    {analysis.modelComparisons.mostEfficient.modelName}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur border-border">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {(analysis.modelComparisons.fastest.avgTimeMs / 1000).toFixed(1)}s
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Fastest Avg
                  </div>
                  <div className="text-xs text-primary mt-0.5 truncate">
                    {analysis.modelComparisons.fastest.modelName}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur border-border">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {validModels.length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Models with Wins
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    of {data.models.length} total
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Podium */}
            <BenchmarkPodium leaderboard={leaderboard} />

            {/* Top 10 leaderboard */}
            <BenchmarkLeaderboard
              leaderboard={allLeaderboard}
              models={data.models}
            />

            {/* Word difficulty */}
            <BenchmarkWordDifficulty
              hardestWords={analysis.hardestWords}
              easiestWords={analysis.easiestWords}
            />
          </TabsContent>

          {/* Win Rate Tab */}
          <TabsContent value="winrate" className="mt-6">
            <BenchmarkBarChart
              title="Win Rate Comparison"
              icon={<Target className="w-5 h-5" />}
              models={validModels}
              getValue={(m) => m.stats.winRate}
              formatValue={(v) => `${v.toFixed(0)}%`}
              maxValue={100}
            />
          </TabsContent>

          {/* Avg Guesses Tab */}
          <TabsContent value="guesses" className="space-y-6 mt-6">
            <BenchmarkBarChart
              title="Average Guesses (lower is better)"
              icon={<BarChart3 className="w-5 h-5" />}
              models={validModels}
              getValue={(m) => m.stats.avgGuesses}
              formatValue={(v) => v.toFixed(2)}
              invertBar={true}
              maxValue={6}
            />
            <BenchmarkGuessDistribution models={validModels} />
          </TabsContent>

          {/* Speed Tab */}
          <TabsContent value="speed" className="mt-6">
            <BenchmarkBarChart
              title="Median Response Time (lower is better)"
              icon={<Clock className="w-5 h-5" />}
              models={validModels.filter((m) => m.stats.medianTimeMs > 0)}
              getValue={(m) => m.stats.medianTimeMs / 1000}
              formatValue={(v) => `${v.toFixed(1)}s`}
              invertBar={true}
            />
          </TabsContent>

          {/* Cost Tab */}
          <TabsContent value="cost" className="mt-6">
            <BenchmarkBarChart
              title="Total Token Usage"
              icon={<Coins className="w-5 h-5" />}
              models={validModels.filter((m) => m.stats.totalTokens > 0)}
              getValue={(m) => m.stats.totalTokens}
              formatValue={(v) => `${(v / 1000).toFixed(0)}k tokens`}
            />
          </TabsContent>

          {/* Combined Tab */}
          <TabsContent value="combined" className="space-y-6 mt-6">
            <BenchmarkBarChart
              title="Composite Score (40% Accuracy + 35% Speed + 25% Guess Efficiency)"
              icon={<Zap className="w-5 h-5" />}
              models={validModels}
              getValue={(m) => {
                const entry = leaderboard.find((e) => e.modelId === m.id)
                return entry?.score ?? 0
              }}
              formatValue={(v) => v.toFixed(1)}
              maxValue={100}
            />
            <BenchmarkLeaderboard
              leaderboard={allLeaderboard}
              models={data.models}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="text-foreground font-medium mb-1">
                Built by George Jefferson
              </p>
              <p className="text-muted-foreground text-sm">
                Sponsored by{" "}
                <a href="https://x.com/artfreebrey" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Art Freebrey</a>
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <a
                href="https://x.com/GeorgeJeffersn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Follow on X
              </a>
            </Button>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center gap-x-3 gap-y-1 justify-center sm:justify-start">
            <span className="text-muted-foreground text-xs">Related:</span>
            <a href="https://ginger.sh/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Ginger</a>
            <a href="https://artomate.app/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Artomate</a>
            <a href="https://resold.app/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Resold</a>
            <a href="https://vinta.app/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Vinta</a>
            <a href="https://revnu.app/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Revnu</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
