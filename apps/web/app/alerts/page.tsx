"use client";

import { AuthGate } from "../../components/state-panels";

export default function AlertsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <AuthGate>
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Alerts
          </h1>
          <p className="text-sm text-[var(--fyxvo-text-muted)]">
            Configure budget, error-rate, and latency alerts for your projects.
          </p>
        </div>
      </AuthGate>
    </div>
  );
}
