import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://wordlebench.ginger.sh"),
  title: {
    default: "WordleBench - AI Wordle Benchmark | Compare 34+ AI Models",
    template: "%s | WordleBench",
  },
  description:
    "Benchmark AI models playing Wordle head-to-head. Compare win rates, speed, accuracy, and cost across GPT-5, Claude 4.5, Gemini, Grok, Llama, and 34+ models on 50 standardized words.",
  keywords: [
    "wordle AI benchmark",
    "AI model comparison",
    "LLM benchmark",
    "AI wordle",
    "GPT-5 benchmark",
    "Claude benchmark",
    "Gemini benchmark",
    "AI accuracy test",
    "AI speed test",
    "language model benchmark",
    "LLM leaderboard",
    "AI model ranking",
    "wordle solver AI",
    "deterministic AI testing",
  ],
  authors: [{ name: "George Jefferson", url: "https://x.com/GeorgeJeffersn" }],
  creator: "George Jefferson",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://wordlebench.ginger.sh",
    siteName: "WordleBench",
    title: "WordleBench - AI Wordle Benchmark | Compare 34+ AI Models",
    description:
      "Benchmark AI models playing Wordle head-to-head. Compare win rates, speed, accuracy, and cost across GPT-5, Claude 4.5, Gemini, Grok, and 34+ models.",
  },
  twitter: {
    card: "summary_large_image",
    title: "WordleBench - AI Wordle Benchmark",
    description:
      "Benchmark AI models playing Wordle head-to-head. Compare win rates, speed, and accuracy across 34+ models.",
    creator: "@GeorgeJeffersn",
  },
  alternates: {
    canonical: "https://wordlebench.ginger.sh",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: [],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "WordleBench",
              url: "https://wordlebench.ginger.sh",
              description:
                "Benchmark AI models playing Wordle head-to-head. Compare win rates, speed, accuracy, and cost across 34+ language models.",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web",
              author: {
                "@type": "Person",
                name: "George Jefferson",
                url: "https://x.com/GeorgeJeffersn",
              },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "AI model Wordle benchmark",
                "34+ model comparison",
                "Real-time streaming results",
                "Win rate analysis",
                "Speed and latency metrics",
                "Cost per game tracking",
                "Deterministic testing",
              ],
            }),
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
