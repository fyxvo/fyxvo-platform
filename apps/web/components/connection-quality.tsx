"use client";

import { useEffect, useRef, useState } from "react";
import { webEnv } from "../lib/env";

type Quality = "fast" | "normal" | "slow" | "offline";

export function ConnectionQualityIndicator() {
  const [quality, setQuality] = useState<Quality>("fast");
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const samples = useRef<number[]>([]);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const start = Date.now();
      try {
        await fetch(new URL("/health", webEnv.apiBaseUrl), { method: "GET" });
        const ms = Date.now() - start;
        samples.current.push(ms);
        if (samples.current.length > 5) samples.current.shift();
        const avg = samples.current.reduce((a, b) => a + b, 0) / samples.current.length;
        if (mounted) {
          setLastMs(Math.round(ms));
          setQuality(avg < 200 ? "fast" : avg < 800 ? "normal" : "slow");
        }
      } catch {
        if (mounted) {
          setLastMs(null);
          setQuality("offline");
        }
      }
    }

    void check();
    const interval = setInterval(() => void check(), 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (quality === "fast") return null;

  const config = {
    offline: { dot: "bg-rose-400", label: "Offline", text: "text-rose-400" },
    slow: { dot: "bg-rose-400", label: "Slow API", text: "text-rose-400" },
    normal: { dot: "bg-amber-400", label: "Normal", text: "text-amber-400" },
    fast: { dot: "bg-emerald-400", label: "Fast", text: "text-emerald-400" },
  }[quality];

  const tooltip =
    quality === "offline"
      ? "API unreachable — check your connection"
      : `API response time: ${lastMs !== null ? `${lastMs}ms` : "—"} · ${quality === "slow" ? "Degraded performance" : "Normal"}`;

  return (
    <div
      className="relative flex items-center gap-1.5 cursor-default"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      aria-label={tooltip}
    >
      <div className={`h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
      <span className={`hidden sm:inline text-xs ${config.text}`}>{config.label}</span>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] px-3 py-2 text-xs text-[var(--fyxvo-text)] whitespace-nowrap shadow-lg z-50">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--fyxvo-bg-elevated)]" />
        </div>
      )}
    </div>
  );
}
