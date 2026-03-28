"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoadingSkeleton } from "../../components/loading-skeleton";
import { RetryBanner } from "../../components/retry-banner";
import { StatusSubscribeForm } from "../../components/status-subscribe-form";
import { API_BASE, GATEWAY_BASE } from "../../lib/env";

type ApiHealthResponse = {
  status: string;
  service: string;
  timestamp: string;
  dependencies?: {
    database?: { ok: boolean; responseTimeMs?: number };
    redis?: { ok: boolean; responseTimeMs?: number };
    solana?: { ok: boolean; responseTimeMs?: number; protocolReady?: boolean };
  };
};

type GatewayStatusResponse = {
  status: string;
  service: string;
  timestamp: string;
  metrics?: {
    standard?: { averageLatencyMs?: number; successRate?: number };
    priority?: { averageLatencyMs?: number; successRate?: number };
    totals?: { requests?: number; errors?: number };
  };
};

type IncidentsResponse = {
  incidents: Array<{ id: string; title?: string; status?: string; resolvedAt?: string | null }>;
};

type CapacityResponse = {
  requestsPerMinute: number;
  capacityRpm: number;
  utilizationPct: number;
};

type HealthCalendarResponse = {
  calendar: Array<{ date: string; availability: number; color: string }>;
};

type StatusErrors = {
  apiHealth: string | null;
  gatewayStatus: string | null;
  incidents: string | null;
  capacity: string | null;
  healthCalendar: string | null;
};

const INITIAL_ERRORS: StatusErrors = {
  apiHealth: null,
  gatewayStatus: null,
  incidents: null,
  capacity: null,
  healthCalendar: null,
};

function FetchIndicator({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-300">
      fetch issue
    </span>
  );
}

function CardStatus({
  label,
  value,
  ok,
  error,
}: {
  label: string;
  value: string;
  ok: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--fyxvo-text)]">{label}</p>
        <FetchIndicator error={error} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
        <span className="text-lg font-semibold text-[var(--fyxvo-text)]">{value}</span>
      </div>
    </div>
  );
}

export default function StatusPage() {
  const [apiHealth, setApiHealth] = useState<ApiHealthResponse | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatusResponse | null>(null);
  const [incidents, setIncidents] = useState<IncidentsResponse | null>(null);
  const [capacity, setCapacity] = useState<CapacityResponse | null>(null);
  const [healthCalendar, setHealthCalendar] = useState<HealthCalendarResponse | null>(null);
  const [errors, setErrors] = useState<StatusErrors>(INITIAL_ERRORS);
  const [loading, setLoading] = useState(true);

  const loadStatusData = useCallback(async (disposed?: () => boolean) => {
    if (!disposed?.()) {
      setLoading(true);
    }

    try {
      const response = await fetch(`${API_BASE}/health`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as ApiHealthResponse;
      console.log("[StatusPage] /health", payload);
      if (!disposed?.()) {
        setApiHealth(payload);
        setErrors((current) => ({ ...current, apiHealth: null }));
      }
    } catch (error) {
      if (!disposed?.()) {
        setErrors((current) => ({
          ...current,
          apiHealth: error instanceof Error ? error.message : "Unable to refresh control plane health",
        }));
      }
    }

    try {
      const response = await fetch(`${GATEWAY_BASE}/v1/status`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as GatewayStatusResponse;
      console.log("[StatusPage] /v1/status", payload);
      if (!disposed?.()) {
        setGatewayStatus(payload);
        setErrors((current) => ({ ...current, gatewayStatus: null }));
      }
    } catch (error) {
      if (!disposed?.()) {
        setErrors((current) => ({
          ...current,
          gatewayStatus: error instanceof Error ? error.message : "Unable to refresh gateway status",
        }));
      }
    }

    try {
      const response = await fetch(`${API_BASE}/v1/incidents`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as IncidentsResponse;
      console.log("[StatusPage] /v1/incidents", payload);
      if (!disposed?.()) {
        setIncidents(payload);
        setErrors((current) => ({ ...current, incidents: null }));
      }
    } catch (error) {
      if (!disposed?.()) {
        setErrors((current) => ({
          ...current,
          incidents: error instanceof Error ? error.message : "Unable to refresh incidents",
        }));
      }
    }

    try {
      const response = await fetch(`${API_BASE}/v1/network/capacity`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as CapacityResponse;
      console.log("[StatusPage] /v1/network/capacity", payload);
      if (!disposed?.()) {
        setCapacity(payload);
        setErrors((current) => ({ ...current, capacity: null }));
      }
    } catch (error) {
      if (!disposed?.()) {
        setErrors((current) => ({
          ...current,
          capacity: error instanceof Error ? error.message : "Unable to refresh capacity",
        }));
      }
    }

    try {
      const response = await fetch(`${API_BASE}/v1/network/health-calendar`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as HealthCalendarResponse;
      console.log("[StatusPage] /v1/network/health-calendar", payload);
      if (!disposed?.()) {
        setHealthCalendar(payload);
        setErrors((current) => ({ ...current, healthCalendar: null }));
      }
    } catch (error) {
      if (!disposed?.()) {
        setErrors((current) => ({
          ...current,
          healthCalendar: error instanceof Error ? error.message : "Unable to refresh health calendar",
        }));
      }
    }

    if (!disposed?.()) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    const isDisposed = () => disposed;

    void loadStatusData(isDisposed);
    const intervalId = window.setInterval(() => {
      void loadStatusData(isDisposed);
    }, 60_000);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [loadStatusData]);

  const openIncidents = incidents?.incidents.filter((incident) => !incident.resolvedAt) ?? [];
  const recentCalendar = useMemo(
    () => (healthCalendar?.calendar ?? []).slice(-30),
    [healthCalendar]
  );
  const hasAnyData = Boolean(apiHealth || gatewayStatus || incidents || capacity || healthCalendar);
  const combinedError = Object.values(errors).find(Boolean) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-[var(--fyxvo-text)]">Status</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        Live view of the Fyxvo control plane, relay gateway, protocol readiness, incident state,
        and current network capacity. Each data source refreshes independently every 60 seconds.
      </p>

      {!hasAnyData && loading ? (
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`status-skeleton-${index}`}
              className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6"
            >
              <LoadingSkeleton className="h-4 w-28" />
              <LoadingSkeleton className="mt-6 h-6 w-32" />
            </div>
          ))}
        </div>
      ) : null}

      {combinedError ? (
        <div className="mt-8">
          <RetryBanner
            message="One or more live status sources failed to refresh. Last known good data is still shown below."
            onRetry={loadStatusData}
          />
        </div>
      ) : null}

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <CardStatus
          label="Control Plane"
          value={apiHealth?.status === "ok" ? "Operational" : apiHealth?.status ?? "Checking"}
          ok={apiHealth?.status === "ok"}
          error={errors.apiHealth}
        />
        <CardStatus
          label="Gateway"
          value={
            gatewayStatus?.status === "ok" ? "Operational" : gatewayStatus?.status ?? "Checking"
          }
          ok={gatewayStatus?.status === "ok"}
          error={errors.gatewayStatus}
        />
        <CardStatus
          label="Protocol"
          value="Devnet ready"
          ok
          error={null}
        />
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Network capacity</h2>
            <FetchIndicator error={errors.capacity} />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Requests/min
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                {(capacity?.requestsPerMinute ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Capacity RPM
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                {(capacity?.capacityRpm ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Utilization
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                {capacity?.utilizationPct ?? 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Incidents</h2>
            <FetchIndicator error={errors.incidents} />
          </div>
          {openIncidents.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--fyxvo-text-soft)]">No open incidents.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {openIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                >
                  <p className="font-medium text-[var(--fyxvo-text)]">
                    {incident.title ?? incident.id}
                  </p>
                  <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
                    {incident.status ?? "open"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">30-day health calendar</h2>
            <FetchIndicator error={errors.healthCalendar} />
          </div>
          <div className="mt-6 grid grid-cols-10 gap-2 sm:grid-cols-15">
            {recentCalendar.map((entry) => (
              <div
                key={entry.date}
                className={`aspect-square rounded-md ${
                  entry.color === "green"
                    ? "bg-emerald-500/80"
                    : entry.color === "yellow"
                      ? "bg-amber-500/80"
                      : "bg-rose-500/80"
                }`}
                title={`${entry.date}: ${(entry.availability * 100).toFixed(2)}%`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Gateway live metrics</h2>
          <div className="mt-6 space-y-3 text-sm text-[var(--fyxvo-text-soft)]">
            <div className="flex items-center justify-between gap-4">
              <span>Standard avg latency</span>
              <span>{gatewayStatus?.metrics?.standard?.averageLatencyMs ?? 0}ms</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Priority avg latency</span>
              <span>{gatewayStatus?.metrics?.priority?.averageLatencyMs ?? 0}ms</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Total requests</span>
              <span>{(gatewayStatus?.metrics?.totals?.requests ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Total errors</span>
              <span>{(gatewayStatus?.metrics?.totals?.errors ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 max-w-xl">
        <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">
          Subscribe to incident updates
        </h2>
        <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">
          Get notified when incidents are reported or resolved.
        </p>
        <div className="mt-4">
          <StatusSubscribeForm />
        </div>
      </div>
    </div>
  );
}
