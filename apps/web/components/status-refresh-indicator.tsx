"use client";

import { useEffect, useState } from "react";

export function StatusRefreshIndicator() {
  const [secondsSince, setSecondsSince] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsSince((s) => {
        const next = s + 1;
        if (next > 0 && next % 60 === 0) {
          window.location.reload();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <p className="text-xs text-[var(--fyxvo-text-muted)]">
      Updated {secondsSince === 0 ? "just now" : `${secondsSince}s ago`} · Auto-refreshes every 60s
    </p>
  );
}
