"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { LoadingSkeleton } from "../../../components/loading-skeleton";
import { RetryBanner } from "../../../components/retry-banner";
import { addIncidentUpdate, createIncident, listIncidents, updateIncident } from "../../../lib/api";
import { usePortal } from "../../../lib/portal-context";
import type { IncidentItem } from "../../../lib/types";

const DEFAULT_FORM: {
  serviceName: string;
  severity: "info" | "warning" | "critical" | "degraded";
  description: string;
} = {
  serviceName: "gateway",
  severity: "degraded",
  description: "",
};

export default function AdminIncidentsPage() {
  const { token } = usePortal();
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [updateMessages, setUpdateMessages] = useState<Record<string, string>>({});

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setIncidents(await listIncidents());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load incidents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents]);

  async function handleCreateIncident(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setCreating(true);
    setError(null);
    setNotice(null);

    try {
      await createIncident({
        token,
        serviceName: form.serviceName,
        severity: form.severity,
        description: form.description,
      });
      setNotice("Incident created.");
      setForm(DEFAULT_FORM);
      await loadIncidents();
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : "Unable to create the incident.");
    } finally {
      setCreating(false);
    }
  }

  async function handleAddUpdate(incidentId: string) {
    if (!token) return;

    setUpdatingId(incidentId);
    setError(null);
    setNotice(null);

    try {
      await addIncidentUpdate({
        token,
        incidentId,
        message: updateMessages[incidentId] || "Operational update posted.",
        status: "update",
      });
      setNotice("Incident update posted.");
      setUpdateMessages((current) => ({ ...current, [incidentId]: "" }));
      await loadIncidents();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to post the incident update.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleResolve(incidentId: string) {
    if (!token) return;

    setResolvingId(incidentId);
    setError(null);
    setNotice(null);

    try {
      await updateIncident({
        token,
        incidentId,
        status: "resolved",
      });
      setNotice("Incident resolved.");
      await loadIncidents();
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : "Unable to resolve the incident.");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
          Incident management
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
          Create public incident records, post ongoing updates, and resolve incidents so the status
          page stays aligned with the live operating state.
        </p>
      </div>

      {error ? <RetryBanner message={error} onRetry={loadIncidents} /> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}

      <form
        onSubmit={(event) => void handleCreateIncident(event)}
        className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6"
      >
        <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Create incident</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <input
            value={form.serviceName}
            onChange={(event) => setForm((current) => ({ ...current, serviceName: event.target.value }))}
            placeholder="Service name"
            className="h-11 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
          />
          <select
            value={form.severity}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                severity: event.target.value as typeof DEFAULT_FORM.severity,
              }))
            }
            className="h-11 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
          >
            {["info", "warning", "critical", "degraded"].map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
          <Button type="submit" loading={creating}>
            Create incident
          </Button>
        </div>
        <textarea
          rows={4}
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="Describe the incident and affected users."
          className="mt-4 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
        />
      </form>

      {loading && incidents.length === 0 ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-32 rounded-[2rem]" />
          <LoadingSkeleton className="h-32 rounded-[2rem]" />
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => {
            const active = !incident.resolvedAt;

            return (
              <div
                key={incident.id}
                className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                      {incident.serviceName}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-[var(--fyxvo-text)]">
                      {incident.description}
                    </h2>
                    <p className="mt-3 text-sm text-[var(--fyxvo-text-soft)]">
                      {incident.severity} · started {new Date(incident.startedAt).toLocaleString()}
                      {incident.resolvedAt
                        ? ` · resolved ${new Date(incident.resolvedAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  {active ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        loading={updatingId === incident.id}
                        onClick={() => void handleAddUpdate(incident.id)}
                      >
                        Post update
                      </Button>
                      <Button
                        type="button"
                        loading={resolvingId === incident.id}
                        onClick={() => void handleResolve(incident.id)}
                      >
                        Resolve
                      </Button>
                    </div>
                  ) : null}
                </div>

                {active ? (
                  <textarea
                    rows={3}
                    value={updateMessages[incident.id] ?? ""}
                    onChange={(event) =>
                      setUpdateMessages((current) => ({ ...current, [incident.id]: event.target.value }))
                    }
                    placeholder="Add an incident update for the public timeline."
                    className="mt-4 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
