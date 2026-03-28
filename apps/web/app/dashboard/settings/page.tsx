"use client";

import { AuthGate } from "../../../components/state-panels";

export default function DashboardSettingsPage() {
  return (
    <AuthGate>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
          Dashboard Settings
        </h1>
        <p className="text-sm text-[var(--fyxvo-text-muted)]">
          Customize your dashboard layout and preferences.
        </p>
      </div>
    </AuthGate>
  );
}
