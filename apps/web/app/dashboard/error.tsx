"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, Notice } from "@fyxvo/ui";

export default function DashboardError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route error", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <Notice tone="warning" title="Dashboard temporarily unavailable">
        We hit a dashboard rendering problem. Your projects, funding, and live services are still available.
      </Notice>
      <div className="rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
        <p className="text-sm leading-6 text-[var(--fyxvo-text-muted)]">
          Retry the dashboard first. If the problem continues, jump directly into the project workspace or funding until the failing panel is isolated.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={reset}>Retry dashboard</Button>
          <Button asChild variant="secondary">
            <Link href="/projects">Open projects</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/funding">Open funding</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
