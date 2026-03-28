"use client";

import { AuthGate } from "../../components/state-panels";

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <AuthGate>
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Analytics
          </h1>
          <p className="text-sm text-[var(--fyxvo-text-muted)]">
            Request metrics, latency distributions, and error rates for your projects.
          </p>
        </div>
      </AuthGate>
    </div>
  );
}
