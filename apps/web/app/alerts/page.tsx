"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@fyxvo/ui";
import { LoadingSkeleton } from "../../components/loading-skeleton";
import { RetryBanner } from "../../components/retry-banner";
import { AuthGate } from "../../components/state-panels";
import { getAlerts, updateAlertState } from "../../lib/api";
import { usePortal } from "../../lib/portal-context";
import type { AlertCenterItem } from "../../lib/types";

function severityClass(severity: AlertCenterItem["severity"]) {
  if (severity === "critical") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (severity === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-sky-500/30 bg-sky-500/10 text-sky-300";
}

export default function AlertsPage() {
  const { token } = usePortal();
  const [alerts, setAlerts] = useState<AlertCenterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      setAlerts(await getAlerts(token));
    } catch (loadError) {
      setAlerts([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load alerts.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  async function setAlertState(
    alert: AlertCenterItem,
    state: "acknowledged" | "resolved"
  ) {
    if (!token) return;
    setUpdatingKey(alert.alertKey);

    try {
      await updateAlertState({
        alertKey: alert.alertKey,
        token,
        state,
        projectId: alert.projectId,
      });
      setAlerts((current) =>
        current.map((item) =>
          item.alertKey === alert.alertKey ? { ...item, state } : item
        )
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update alert.");
    } finally {
      setUpdatingKey(null);
    }
  }

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <AuthGate>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Alerts
            </h1>
            <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
              Review low-balance, error-rate, webhook, and assistant availability alerts across
              your workspace.
            </p>
          </div>

          {error ? <RetryBanner message={error} onRetry={() => void loadAlerts()} /> : null}

          {loading ? (
            <div className="space-y-4">
              <LoadingSkeleton className="h-28 rounded-2xl" />
              <LoadingSkeleton className="h-28 rounded-2xl" />
              <LoadingSkeleton className="h-28 rounded-2xl" />
            </div>
          ) : alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${severityClass(alert.severity)}`}
                        >
                          {alert.severity}
                        </span>
                        <span className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1 text-xs text-[var(--fyxvo-text-muted)]">
                          {alert.state}
                        </span>
                        {alert.projectName ? (
                          <span className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1 text-xs text-[var(--fyxvo-text-muted)]">
                            {alert.projectName}
                          </span>
                        ) : null}
                      </div>
                      <h2 className="mt-3 text-lg font-semibold text-[var(--fyxvo-text)]">
                        {alert.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                        {alert.description}
                      </p>
                      <p className="mt-3 text-xs text-[var(--fyxvo-text-muted)]">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={alert.state !== "new" || updatingKey === alert.alertKey}
                        onClick={() => void setAlertState(alert, "acknowledged")}
                      >
                        Acknowledge
                      </Button>
                      <Button
                        type="button"
                        disabled={alert.state === "resolved" || updatingKey === alert.alertKey}
                        onClick={() => void setAlertState(alert, "resolved")}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8 text-center">
              <p className="text-base font-medium text-[var(--fyxvo-text)]">No alerts right now</p>
              <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                When balance pressure, error spikes, webhook failures, or incident signals appear,
                they will be listed here with acknowledgement controls.
              </p>
            </div>
          )}
        </div>
      </AuthGate>
    </div>
  );
}
