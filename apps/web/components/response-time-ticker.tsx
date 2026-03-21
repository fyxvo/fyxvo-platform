"use client";

import { useEffect, useState } from "react";

export function ResponseTimeTicker({ apiBase }: { readonly apiBase: string }) {
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function poll() {
      setUpdating(true);
      try {
        const res = await fetch(`${apiBase}/v1/network/stats`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { averageLatencyMs?: number };
          if (typeof data.averageLatencyMs === "number") {
            setLatencyMs(data.averageLatencyMs);
          }
        }
      } catch {
        // ignore network errors
      }
      setUpdating(false);
    }
    void poll();
    const interval = setInterval(() => void poll(), 10_000);
    return () => clearInterval(interval);
  }, [apiBase]);

  if (latencyMs === null) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--fyxvo-text-muted)]">
      <span
        className={`h-1.5 w-1.5 rounded-full ${updating ? "animate-pulse" : ""} bg-green-400`}
      />
      <span>
        Gateway latency:{" "}
        <strong className="text-[var(--fyxvo-text)]">{Math.round(latencyMs)}ms</strong>
      </span>
      <span className="opacity-50">· updates every 10s</span>
    </div>
  );
}
