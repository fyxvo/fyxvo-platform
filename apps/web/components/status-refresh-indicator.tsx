"use client";

import { useEffect, useState } from "react";

function humanizeRelative(value: Date): string {
  const diffMs = Date.now() - value.getTime();
  if (diffMs < 5_000) return "just now";
  if (diffMs < 60_000) return `${Math.floor(diffMs / 1000)}s ago`;
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  return `${Math.floor(diffMs / 3_600_000)}h ago`;
}

export function StatusRefreshIndicator() {
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const [, setTick] = useState(0);

  useEffect(() => {
    const tickInterval = window.setInterval(() => setTick((current) => current + 1), 1000);
    const refreshInterval = window.setInterval(() => {
      setLastUpdatedAt(new Date());
      window.location.reload();
    }, 60_000);

    return () => {
      window.clearInterval(tickInterval);
      window.clearInterval(refreshInterval);
    };
  }, []);

  const label = humanizeRelative(lastUpdatedAt);

  return (
    <p className="text-xs text-[var(--fyxvo-text-muted)]">
      Last updated {label} · Refreshes automatically every 60s
    </p>
  );
}
