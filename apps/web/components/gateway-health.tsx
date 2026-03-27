"use client";

import { useEffect, useState } from "react";
import { fetchGatewayStatus } from "../lib/api";
import type { PortalServiceStatus } from "../lib/types";

interface HealthSnapshot {
  readonly status: "healthy" | "degraded" | "unknown";
  readonly averageLatencyMs: number | null;
  readonly requestsPerMin: number | null;
  readonly errorRate: number | null;
  readonly lastChecked: Date;
}

function deriveSnapshot(data: PortalServiceStatus): HealthSnapshot {
  const m = data.metrics;
  const standard = m?.standard;
  const totals = m?.totals;
  const latency = standard?.averageLatencyMs ?? m?.priority?.averageLatencyMs ?? null;
  const successRate = standard?.successRate ?? null;
  const errorRate = successRate !== null ? 1 - successRate : null;
  const reqs = totals?.requests ?? null;

  const isHealthy = data.upstreamReachable !== false &&
    (errorRate === null || errorRate < 0.1);

  return {
    status: isHealthy ? "healthy" : "degraded",
    averageLatencyMs: latency !== undefined ? latency : null,
    requestsPerMin: reqs !== null ? Math.round(reqs / 5) : null, // approximate from total
    errorRate: errorRate !== null ? errorRate : null,
    lastChecked: new Date()
  };
}

function StatusDot({ status }: { readonly status: HealthSnapshot["status"] }) {
  if (status === "healthy") {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </span>
    );
  }
  if (status === "degraded") {
    return <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />;
  }
  return <span className="h-2.5 w-2.5 rounded-full bg-[var(--fyxvo-border)]" />;
}

export function GatewayHealthBadge() {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    function poll() {
      fetchGatewayStatus()
        .then((data) => {
          if (!cancelled) setSnapshot(deriveSnapshot(data));
        })
        .catch(() => {
          if (!cancelled) setSnapshot({
            status: "unknown",
            averageLatencyMs: null,
            requestsPerMin: null,
            errorRate: null,
            lastChecked: new Date()
          });
        });
    }

    poll();
    const interval = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!snapshot) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1.5">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--fyxvo-panel-soft)]" />
        <span className="text-xs text-[var(--fyxvo-text-muted)]">Checking gateway…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2">
      <div className="flex items-center gap-2">
        <StatusDot status={snapshot.status} />
        <span className={`text-xs font-medium ${snapshot.status === "healthy" ? "text-[var(--fyxvo-success)]" : snapshot.status === "degraded" ? "text-[var(--fyxvo-warning)]" : "text-[var(--fyxvo-text-muted)]"}`}>
          {snapshot.status === "healthy" ? "Gateway healthy" : snapshot.status === "degraded" ? "Gateway degraded" : "Gateway unknown"}
        </span>
      </div>
      {snapshot.averageLatencyMs !== null && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--fyxvo-text-muted)]">Latency</span>
          <span className="text-xs font-semibold text-[var(--fyxvo-text)]">{snapshot.averageLatencyMs}ms</span>
        </div>
      )}
      {snapshot.errorRate !== null && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--fyxvo-text-muted)]">Error rate</span>
          <span className="text-xs font-semibold text-[var(--fyxvo-text)]">{(snapshot.errorRate * 100).toFixed(1)}%</span>
        </div>
      )}
      <span className="ml-auto text-[10px] text-[var(--fyxvo-text-muted)]">
        Updates every 30s
      </span>
    </div>
  );
}

export function GatewayHealthCard() {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    function poll() {
      fetchGatewayStatus()
        .then((data) => {
          if (!cancelled) setSnapshot(deriveSnapshot(data));
        })
        .catch(() => {
          if (!cancelled) setSnapshot({
            status: "unknown",
            averageLatencyMs: null,
            requestsPerMin: null,
            errorRate: null,
            lastChecked: new Date()
          });
        });
    }

    poll();
    const interval = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
          Gateway health
        </div>
        <span className="text-[10px] text-[var(--fyxvo-text-muted)]">Live · 30s poll</span>
      </div>
      {!snapshot ? (
        <div className="mt-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--fyxvo-border)]" />
          <span className="text-sm text-[var(--fyxvo-text-muted)]">Checking…</span>
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <StatusDot status={snapshot.status} />
            <span className={`text-sm font-semibold ${snapshot.status === "healthy" ? "text-[var(--fyxvo-success)]" : snapshot.status === "degraded" ? "text-[var(--fyxvo-warning)]" : "text-[var(--fyxvo-text-muted)]"}`}>
              {snapshot.status === "healthy" ? "Healthy" : snapshot.status === "degraded" ? "Degraded" : "Unknown"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Avg latency</div>
              <div className="mt-1 text-sm font-semibold text-[var(--fyxvo-text)]">
                {snapshot.averageLatencyMs !== null ? `${snapshot.averageLatencyMs}ms` : "—"}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Error rate</div>
              <div className="mt-1 text-sm font-semibold text-[var(--fyxvo-text)]">
                {snapshot.errorRate !== null ? `${(snapshot.errorRate * 100).toFixed(1)}%` : "—"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
