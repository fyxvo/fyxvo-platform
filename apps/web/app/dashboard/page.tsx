"use client";

import { AuthGate } from "../../components/state-panels";
import { usePortal } from "../../lib/portal-context";

export default function DashboardPage() {
  const { selectedProject, projects } = usePortal();

  return (
    <AuthGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
            {selectedProject
              ? `Viewing ${selectedProject.name}`
              : projects.length === 0
                ? "No projects yet"
                : "Select a project"}
          </p>
        </div>
        {selectedProject ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4">
              <p className="text-xs text-[var(--fyxvo-text-muted)]">Project</p>
              <p className="mt-1 font-semibold text-[var(--fyxvo-text)]">{selectedProject.name}</p>
            </div>
            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4">
              <p className="text-xs text-[var(--fyxvo-text-muted)]">Network</p>
              <p className="mt-1 font-semibold text-[var(--fyxvo-text)] capitalize">
                {selectedProject.network}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4">
              <p className="text-xs text-[var(--fyxvo-text-muted)]">Status</p>
              <p className="mt-1 font-semibold text-[var(--fyxvo-text)]">{selectedProject.status}</p>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGate>
  );
}
