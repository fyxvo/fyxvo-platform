"use client";

import { useEffect, useState } from "react";
import { fetchApiHealth } from "../lib/api";

type Quality = "fast" | "normal" | "slow" | "offline";

export function ConnectionQualityIndicator() {
  const [quality, setQuality] = useState<Quality>("normal");

  useEffect(() => {
    let mounted = true;
    const samples: number[] = [];

    async function check() {
      const start = Date.now();
      try {
        await fetchApiHealth();
        const ms = Date.now() - start;
        samples.push(ms);
        if (samples.length > 5) samples.shift();
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        if (mounted) {
          setQuality(avg < 200 ? "fast" : avg < 600 ? "normal" : "slow");
        }
      } catch {
        if (mounted) setQuality("offline");
      }
    }

    void check();
    const interval = setInterval(() => void check(), 30_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (quality === "fast") return null;

  const label = quality === "offline" ? "Offline" : quality === "slow" ? "Slow connection" : "Normal";
  const color = quality === "offline" ? "text-rose-400" : quality === "slow" ? "text-amber-400" : "text-[var(--fyxvo-text-muted)]";

  return (
    <div className={`flex items-center gap-1 text-xs ${color}`} title={`API connection: ${label}`}>
      <div className={`h-1.5 w-1.5 rounded-full ${
        quality === "offline" ? "bg-rose-400" : quality === "slow" ? "bg-amber-400" : "bg-emerald-400"
      }`} />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
