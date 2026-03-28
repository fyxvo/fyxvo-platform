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
    <div className="mx-auto max-w-7xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">Network</p>
      <h1 className="mt-3 max-w-4xl text-5xl font-bold tracking-tight text-[var(--fyxvo-text)] sm:text-6xl">
        {(stats?.totalRequests ?? 0).toLocaleString()} requests routed through devnet
      </h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        This is the live public overview of the Fyxvo network: request volume, active operators,
        gateway performance, capacity posture, and protocol addresses currently backing the devnet
        private alpha rollout.
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

      <div className="mt-10 grid gap-4 lg:grid-cols-4">
        {liveSummary.map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6"
          >
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
              {item.label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-[var(--fyxvo-text)]">{item.value}</p>
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
