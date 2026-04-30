"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoadingSkeleton } from "../../components/loading-skeleton";
import { RetryBanner } from "../../components/retry-banner";
import { AddressLink } from "../../components/address-link";
import { API_BASE, GATEWAY_BASE } from "../../lib/env";
import type { OperatorNetworkSummary } from "../../lib/types";
import { protocolAddresses } from "../../lib/public-data";

type NetworkStatsResponse = {
  totalRequests: number;
  totalProjects: number;
  totalApiKeys: number;
  totalSolFees: string;
  updatedAt: string;
  region?: string;
};

type CapacityResponse = {
  requestsPerMinute: number;
  capacityRpm: number;
  utilizationPct: number;
};

type GatewayStatusResponse = {
  status: string;
  timestamp: string;
  nodeCount?: number;
  metrics?: {
    standard?: { averageLatencyMs?: number; successRate?: number };
    priority?: { averageLatencyMs?: number; successRate?: number };
    totals?: { requests?: number; errors?: number };
  };
};

type NetworkErrors = {
  stats: string | null;
  operators: string | null;
  capacity: string | null;
  gateway: string | null;
};

const INITIAL_ERRORS: NetworkErrors = {
  stats: null,
  operators: null,
  capacity: null,
  gateway: null,
};

function formatLamportsToSol(lamports: string | number | bigint | null | undefined) {
  if (lamports == null) return "0.0000";
  const value = typeof lamports === "bigint" ? lamports : BigInt(lamports);
  const whole = value / 1_000_000_000n;
  const fractional = ((value % 1_000_000_000n) * 10_000n / 1_000_000_000n)
    .toString()
    .padStart(4, "0");
  return `${whole.toLocaleString()}.${fractional}`;
}

function FetchIndicator({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-300">
      fetch issue
    </span>
  );
}

export default function NetworkPage() {
  const [stats, setStats] = useState<NetworkStatsResponse | null>(null);
  const [operators, setOperators] = useState<OperatorNetworkSummary | null>(null);
  const [capacity, setCapacity] = useState<CapacityResponse | null>(null);
  const [gateway, setGateway] = useState<GatewayStatusResponse | null>(null);
  const [errors, setErrors] = useState<NetworkErrors>(INITIAL_ERRORS);
  const [loading, setLoading] = useState(true);

  const loadNetwork = useCallback(async (disposed?: () => boolean) => {
    if (!disposed?.()) {
      setLoading(true);
    }

    try {
      const response = await fetch(`${API_BASE}/v1/network/stats`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as NetworkStatsResponse;
      if (!disposed?.()) {
        setStats(payload);
        setErrors((current) => ({ ...current, stats: null }));
      }
    } catch (error) {
      if (!disposed?.()) {
        setErrors((current) => ({
          ...current,
          stats: error instanceof Error ? error.message : "Unable to load network totals",
        }));
      }
    }

    try {
      const response = await fetch(`${API_BASE}/v1/operators/network`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as OperatorNetworkSummary;
      if (!disposed?.()) {
        setOperators(payload);
        setErrors((current) => ({ ...current, operators: null }));
      }
    } catch (error) {
      if (!disposed?.()) {
        setErrors((current) => ({
          ...current,
          operators: error instanceof Error ? error.message : "Unable to load operator network",
        }));
      }
    }

    try {
      const response = await fetch(`${API_BASE}/v1/network/capacity`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as CapacityResponse;
      if (!disposed?.()) {
        setCapacity(payload);
        setErrors((current) => ({ ...current, capacity: null }));
      }
    } catch (error) {
      if (!disposed?.()) {
        setErrors((current) => ({
          ...current,
          capacity: error instanceof Error ? error.message : "Unable to load capacity data",
        }));
      }
    }

    try {
      const response = await fetch(`${GATEWAY_BASE}/v1/status`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as GatewayStatusResponse;
      if (!disposed?.()) {
        setGateway(payload);
        setErrors((current) => ({ ...current, gateway: null }));
      }
    } catch (error) {
      if (!disposed?.()) {
        setErrors((current) => ({
          ...current,
          gateway: error instanceof Error ? error.message : "Unable to load gateway status",
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

    void loadNetwork(isDisposed);
    const intervalId = window.setInterval(() => {
      void loadNetwork(isDisposed);
    }, 60_000);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [loadNetwork]);

  const combinedError = Object.values(errors).find(Boolean) ?? null;
  const hasAnyData = Boolean(stats || operators || capacity || gateway);
  const utilizationWidth = Math.max(4, Math.min(capacity?.utilizationPct ?? 0, 100));
  const standardLatency = gateway?.metrics?.standard?.averageLatencyMs ?? 0;
  const priorityLatency = gateway?.metrics?.priority?.averageLatencyMs ?? 0;
  const totalGatewayRequests = gateway?.metrics?.totals?.requests ?? 0;

  const liveSummary = useMemo(
    () => [
      {
        label: "Active operators",
        value: (operators?.activeOperatorCount ?? 0).toLocaleString(),
      },
      {
        label: "Projects",
        value: (stats?.totalProjects ?? 0).toLocaleString(),
      },
      {
        label: "API keys",
        value: (stats?.totalApiKeys ?? 0).toLocaleString(),
      },
      {
        label: "Fees routed",
        value: `${formatLamportsToSol(stats?.totalSolFees)} SOL`,
      },
    ],
    [operators?.activeOperatorCount, stats?.totalApiKeys, stats?.totalProjects, stats?.totalSolFees]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-20">
      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] px-3 py-1 rounded-full border border-[var(--fyxvo-brand)]/20 bg-[var(--fyxvo-brand)]/5 text-[var(--fyxvo-brand)]">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
        Network Overview
      </p>
      <h1 className="mt-5 max-w-4xl text-5xl font-bold tracking-tight text-[var(--fyxvo-text)] sm:text-6xl lg:text-7xl">
        <span className="tabular-nums">{(stats?.totalRequests ?? 0).toLocaleString()}</span>
        <span className="block text-3xl sm:text-4xl lg:text-5xl text-[var(--fyxvo-text-soft)] font-semibold mt-2">requests routed through devnet</span>
      </h1>
      <p className="mt-6 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        Live public overview of the Fyxvo network: request volume, active operators,
        gateway performance, capacity posture, and protocol addresses currently backing the devnet
        private alpha.
      </p>

      {combinedError ? (
        <div className="mt-8 max-w-3xl">
          <RetryBanner
            message="One or more network sources failed to refresh. Last known good data is still shown below."
            onRetry={loadNetwork}
          />
        </div>
      ) : null}

      {!hasAnyData && loading ? (
        <div className="mt-10 grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <LoadingSkeleton key={`network-skeleton-${index}`} className="h-32 rounded-3xl" />
          ))}
        </div>
      ) : null}

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {liveSummary.map((item, index) => (
          <div
            key={item.label}
            className="group rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 transition-all duration-300 hover:border-[var(--fyxvo-brand)]/20 hover:shadow-lg hover:shadow-[var(--fyxvo-brand)]/5"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center gap-2 text-[var(--fyxvo-brand)] mb-4">
              {index === 0 && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              )}
              {index === 1 && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              )}
              {index === 2 && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              )}
              {index === 3 && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
              {item.label}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--fyxvo-text)] group-hover:text-[var(--fyxvo-brand)] transition-colors">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Active operators</h2>
            <FetchIndicator error={errors.operators} />
          </div>
          <div className="mt-6 space-y-3">
            {(operators?.operators ?? []).map((operator) => (
              <div
                key={`${operator.name}-${operator.endpointHost}`}
                className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-base font-semibold text-[var(--fyxvo-text)]">{operator.name}</p>
                  <p className="text-sm text-[var(--fyxvo-text-muted)]">{operator.region}</p>
                </div>
                <p className="mt-2 text-sm text-[var(--fyxvo-text-soft)]">{operator.endpointHost}</p>
              </div>
            ))}
            {(operators?.operators.length ?? 0) === 0 ? (
              <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                No active operators are currently listed.
              </p>
            ) : null}
            <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              On-chain registry count: {(operators?.totalRegistered ?? 0).toLocaleString()}.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Capacity utilization</h2>
              <FetchIndicator error={errors.capacity} />
            </div>
            <div className="mt-6">
              <div className="h-3 overflow-hidden rounded-full bg-[var(--fyxvo-panel-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--fyxvo-brand)] transition-[width] duration-500"
                  style={{ width: `${utilizationWidth}%` }}
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    Requests/min
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[var(--fyxvo-text)]">
                    {(capacity?.requestsPerMinute ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    Capacity
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[var(--fyxvo-text)]">
                    {(capacity?.capacityRpm ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    Utilization
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[var(--fyxvo-text)]">
                    {capacity?.utilizationPct ?? 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Gateway performance</h2>
              <FetchIndicator error={errors.gateway} />
            </div>
            <div className="mt-6 space-y-3 text-sm text-[var(--fyxvo-text-soft)]">
              <div className="flex items-center justify-between gap-4">
                <span>Gateway status</span>
                <span>{gateway?.status ?? "checking"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Standard latency</span>
                <span>{standardLatency}ms</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Priority latency</span>
                <span>{priorityLatency}ms</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Gateway requests</span>
                <span>{totalGatewayRequests.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Upstream nodes</span>
                <span>{(gateway?.nodeCount ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
        <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Protocol addresses</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(protocolAddresses).map(([label, address]) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                {label}
              </p>
              <div className="mt-3">
                <AddressLink
                  address={address}
                  chars={10}
                  className="break-all font-mono text-xs text-[var(--fyxvo-brand)] hover:underline"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
