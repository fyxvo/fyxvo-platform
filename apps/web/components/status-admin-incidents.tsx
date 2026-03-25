"use client";

import { useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { usePortal } from "./portal-provider";
import { webEnv } from "../lib/env";
import { liveDevnetState } from "../lib/live-state";

type Incident = {
  id: string;
  serviceName: string;
  severity: string;
  description: string;
  startedAt: string;
  resolvedAt: string | null;
};

export function StatusAdminIncidents({ initialIncidents }: { readonly initialIncidents: Incident[] }) {
  const portal = usePortal();
  const [incidents, setIncidents] = useState(initialIncidents);
  const [serviceName, setServiceName] = useState("gateway");
  const [severity, setSeverity] = useState("degraded");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isAdminWallet =
    portal.walletPhase === "authenticated" &&
    portal.walletAddress === liveDevnetState.adminAuthority &&
    Boolean(portal.token);

  if (!isAdminWallet || !portal.token) return null;

  async function createIncident() {
    if (!description.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(new URL("/v1/admin/incidents", webEnv.apiBaseUrl), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${portal.token}`,
        },
        body: JSON.stringify({ serviceName, severity, description }),
      });
      if (!response.ok) return;
      const body = (await response.json()) as { item: Incident };
      setIncidents((current) => [body.item, ...current]);
      setDescription("");
    } finally {
      setSaving(false);
    }
  }

  async function patchIncident(id: string, input: { severity?: string; description?: string; status?: "open" | "resolved" }) {
    setEditingId(id);
    try {
      const response = await fetch(new URL(`/v1/admin/incidents/${id}`, webEnv.apiBaseUrl), {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${portal.token}`,
        },
        body: JSON.stringify(input),
      });
      if (!response.ok) return;
      const body = (await response.json()) as { item: Incident };
      setIncidents((current) => current.map((incident) => (incident.id === id ? body.item : incident)));
    } finally {
      setEditingId(null);
    }
  }

  return (
    <div className="space-y-4 rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
      <Notice tone="warning" title="Admin incident controls">
        These controls are visible only to the configured admin authority wallet.
      </Notice>
      <div className="grid gap-3 md:grid-cols-[160px_160px_1fr_auto]">
        <input
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
          className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2 text-sm text-[var(--fyxvo-text)]"
          placeholder="service"
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2 text-sm text-[var(--fyxvo-text)]"
        >
          <option value="degraded">degraded</option>
          <option value="warning">warning</option>
          <option value="critical">critical</option>
          <option value="info">info</option>
        </select>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2 text-sm text-[var(--fyxvo-text)]"
          placeholder="Describe the incident"
        />
        <Button onClick={() => void createIncident()} disabled={saving || !description.trim()}>
          {saving ? "Opening…" : "Open incident"}
        </Button>
      </div>

      <div className="space-y-3">
        {incidents.map((incident) => (
          <div key={incident.id} className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--fyxvo-text)]">{incident.serviceName}</p>
                <p className="text-xs text-[var(--fyxvo-text-muted)]">{incident.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={incident.severity}
                  onChange={(e) => void patchIncident(incident.id, { severity: e.target.value })}
                  disabled={editingId === incident.id}
                  className="rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-2 py-1 text-xs text-[var(--fyxvo-text)]"
                >
                  <option value="degraded">degraded</option>
                  <option value="warning">warning</option>
                  <option value="critical">critical</option>
                  <option value="info">info</option>
                </select>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={editingId === incident.id}
                  onClick={() => {
                    const next = window.prompt("Update incident description", incident.description);
                    if (next && next !== incident.description) {
                      void patchIncident(incident.id, { description: next });
                    }
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={editingId === incident.id || incident.resolvedAt !== null}
                  onClick={() => void patchIncident(incident.id, { status: "resolved" })}
                >
                  Resolve
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
