import { ImageResponse } from "next/og"

export const runtime = "edge"

export const alt = "WordleBench - AI Wordle Benchmark"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background grid pattern */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            display: "flex",
          }}
        />

        {/* Wordle tiles row */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "40px",
          }}
        >
          {[
            { letter: "W", color: "#22c55e" },
            { letter: "O", color: "#eab308" },
            { letter: "R", color: "#22c55e" },
            { letter: "D", color: "#6b7280" },
            { letter: "L", color: "#22c55e" },
            { letter: "E", color: "#eab308" },
          ].map((tile, i) => (
            <div
              key={i}
              style={{
                width: "72px",
                height: "72px",
                background: tile.color,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                fontWeight: 800,
                color: "white",
                letterSpacing: "-1px",
              }}
            >
              {tile.letter}
            </div>
          ))}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "white",
            letterSpacing: "-2px",
            marginBottom: "12px",
            display: "flex",
          }}
        >
          WordleBench
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "28px",
            color: "#94a3b8",
            fontWeight: 500,
            marginBottom: "32px",
            display: "flex",
          }}
        >
          AI Wordle Benchmark
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: "48px",
          }}
        >
          {[
            { value: "34+", label: "AI Models" },
            { value: "50", label: "Words" },
            { value: "1,700+", label: "Games" },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: 700,
                  color: "#22c55e",
                  display: "flex",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "16px",
                  color: "#64748b",
                  fontWeight: 500,
                  display: "flex",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            fontSize: "18px",
            color: "#475569",
            fontWeight: 500,
            display: "flex",
          }}
        >
          wordlebench.ginger.sh
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
