"use client";

import { AuthGate } from "../../components/state-panels";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <AuthGate>
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Settings
          </h1>
          <p className="text-sm text-[var(--fyxvo-text-muted)]">
            Manage your project and account preferences.
          </p>
        </div>
      </AuthGate>
    </div>
  );
}
