"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const EXPLORER_BASE = "https://explorer.solana.com/address";
const DEVNET_CLUSTER = "?cluster=devnet";

const ON_CHAIN_ADDRESSES = [
  {
    label: "Program",
    address: "Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc",
  },
  {
    label: "Protocol Config",
    address: "J4uiLhB3qaYUFvu6YAT6oTrBbe7qXfwZFfLm2ph5GTAH",
  },
  {
    label: "Treasury",
    address: "HvgY6dGviH5xosaHvVBNKwt2gTTnJYJ9aG7dWC4wqST1",
  },
] as const;

interface ApiHealth {
  status?: string;
  timestamp?: string;
}

interface GatewayStatus {
  status?: string;
  health?: string;
  protocolReady?: boolean;
  metrics?: {
    standard?: {
      averageLatencyMs?: number;
      successRate?: number;
    };
  };
}

interface Incident {
  id: string;
  serviceName?: string;
  severity?: string;
  description?: string;
  startedAt?: string;
  resolvedAt?: string | null;
}

interface NetworkCapacity {
  requestsPerMinute?: number;
  capacityPerMinute?: number;
}

interface StatusData {
  apiHealth: ApiHealth | null;
  gatewayStatus: GatewayStatus | null;
  incidents: Incident[];
  capacity: NetworkCapacity | null;
}

function shortenAddr(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

function ComponentCard({
  title,
  status,
  detail,
  endpoint,
}: {
  readonly title: string;
  readonly status: "ok" | "degraded" | "loading";
  readonly detail: string;
  readonly endpoint?: string;
}) {
  const dotColor =
    status === "ok" ? "bg-emerald-400" : status === "degraded" ? "bg-amber-400" : "bg-[#64748b]";
  const badgeStyle =
    status === "ok"
      ? "border-emerald-400/25 text-emerald-400 bg-emerald-400/10"
      : status === "degraded"
        ? "border-amber-400/25 text-amber-400 bg-amber-400/10"
        : "border-white/[0.08] text-[#64748b] bg-white/[0.03]";
  const badgeLabel = status === "ok" ? "Operational" : status === "degraded" ? "Degraded" : "Checking";

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-base font-semibold text-[#f1f5f9]">{title}</h3>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${badgeStyle}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
          {badgeLabel}
        </span>
      </div>
      <p className="text-sm text-[#64748b] leading-6">{detail}</p>
      {endpoint ? (
        <a
          href={endpoint}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs font-mono text-[#f97316] hover:underline break-all"
        >
          {endpoint}
        </a>
      ) : null}
    </div>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData>({
    apiHealth: null,
    gatewayStatus: null,
    incidents: [],
    capacity: null,
  });
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    async function fetchAll() {
      const [apiRes, gatewayRes, incidentsRes, capacityRes] = await Promise.allSettled([
        fetch("https://api.fyxvo.com/health").then((r) => r.json()),
        fetch("https://rpc.fyxvo.com/v1/status").then((r) => r.json()),
        fetch("https://api.fyxvo.com/v1/incidents").then((r) => r.json()),
        fetch("https://api.fyxvo.com/v1/network/capacity").then((r) => r.json()),
      ]);

      if (apiRes.status === "rejected") console.error("[status] api health fetch failed:", apiRes.reason);
      if (gatewayRes.status === "rejected") console.error("[status] gateway status fetch failed:", gatewayRes.reason);
      if (incidentsRes.status === "rejected") console.error("[status] incidents fetch failed:", incidentsRes.reason);
      if (capacityRes.status === "rejected") console.error("[status] capacity fetch failed:", capacityRes.reason);

      setData({
        apiHealth: apiRes.status === "fulfilled" ? (apiRes.value as ApiHealth) : null,
        gatewayStatus:
          gatewayRes.status === "fulfilled" ? (gatewayRes.value as GatewayStatus) : null,
        incidents:
          incidentsRes.status === "fulfilled"
            ? ((incidentsRes.value as { items?: Incident[] }).items ??
              (incidentsRes.value as Incident[]) ??
              [])
            : [],
        capacity:
          capacityRes.status === "fulfilled" ? (capacityRes.value as NetworkCapacity) : null,
      });
      setLastRefreshed(new Date());
      setLoading(false);
    }

    void fetchAll();
    const interval = setInterval(() => void fetchAll(), 60_000);
    return () => clearInterval(interval);
  }, []);

  const apiOk = data.apiHealth?.status === "ok";
  // Gateway ok if fetch succeeded and response doesn't explicitly signal degraded/error
  const gatewayOk =
    data.gatewayStatus !== null &&
    data.gatewayStatus?.status !== "degraded" &&
    data.gatewayStatus?.health !== "degraded";
  // Protocol ready unless gateway explicitly says false
  const protocolReady = gatewayOk && data.gatewayStatus?.protocolReady !== false;
  const allGood = apiOk && gatewayOk;

  const capacityUsed = data.capacity?.requestsPerMinute ?? 0;
  const capacityMax = data.capacity?.capacityPerMinute ?? 10_000;
  const utilizationPct = Math.min(100, Math.round((capacityUsed / capacityMax) * 100));

  return (
    <div style={{ backgroundColor: "#0a0a0f" }} className="min-h-screen py-20">
      <div className="mx-auto max-w-5xl px-5 sm:px-8 space-y-16">

        {/* Overall status headline */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <span
              className={`h-5 w-5 rounded-full ${allGood ? "bg-emerald-400 shadow-lg shadow-emerald-400/30" : "bg-amber-400 shadow-lg shadow-amber-400/30"}`}
            />
            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#f1f5f9] tracking-tight">
              {loading
                ? "Checking system status…"
                : allGood
                  ? "All systems operational"
                  : "Degraded performance detected"}
            </h1>
          </div>
          {lastRefreshed ? (
            <p className="text-sm text-[#64748b]">
              Last refreshed {lastRefreshed.toLocaleTimeString()} · auto-refreshes every 60s
            </p>
          ) : null}
        </div>

        {/* Component cards */}
        <section>
          <h2 className="font-display text-xl font-semibold text-[#f1f5f9] mb-6">Components</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ComponentCard
              title="Control Plane"
              status={loading ? "loading" : apiOk ? "ok" : "degraded"}
              detail="REST API, authentication, project management, and key issuance."
              endpoint="https://api.fyxvo.com/health"
            />
            <ComponentCard
              title="Relay Gateway"
              status={loading ? "loading" : gatewayOk ? "ok" : "degraded"}
              detail={`JSON-RPC relay with rate controls and upstream failover. ${
                typeof data.gatewayStatus?.metrics?.standard?.averageLatencyMs === "number"
                  ? `Avg latency: ${data.gatewayStatus.metrics.standard.averageLatencyMs.toFixed(0)}ms.`
                  : ""
              }`}
              endpoint="https://rpc.fyxvo.com/v1/status"
            />
            <ComponentCard
              title="Protocol"
              status={loading ? "loading" : protocolReady ? "ok" : "degraded"}
              detail="On-chain program readiness, PDA verification, and treasury accounts on Solana devnet."
            />
          </div>
        </section>

        {/* Network capacity bar */}
        {data.capacity ? (
          <section>
            <h2 className="font-display text-xl font-semibold text-[#f1f5f9] mb-6">
              Network capacity
            </h2>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#64748b] mb-1">
                    Requests per minute
                  </p>
                  <p className="font-display text-3xl font-semibold text-[#f1f5f9]">
                    {capacityUsed.toLocaleString()}
                    <span className="text-lg text-[#64748b] ml-2">/ {capacityMax.toLocaleString()}</span>
                  </p>
                </div>
                <span className="text-2xl font-display font-semibold text-[#f97316]">
                  {utilizationPct}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  style={{ width: `${utilizationPct}%` }}
                  className="h-full rounded-full bg-[#f97316] transition-all duration-500"
                />
              </div>
              <p className="mt-3 text-xs text-[#64748b]">
                Utilization reflects current managed infrastructure. Capacity grows as the operator
                network expands.
              </p>
            </div>
          </section>
        ) : null}

        {/* Incident list */}
        <section>
          <h2 className="font-display text-xl font-semibold text-[#f1f5f9] mb-6">
            Incident history
          </h2>
          {data.incidents.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center">
              <p className="text-[#f1f5f9] font-medium mb-2">No recent incidents</p>
              <p className="text-sm text-[#64748b]">
                The monitoring system has not recorded any service disruptions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.incidents.slice(0, 10).map((incident) => (
                <div
                  key={incident.id}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
                >
                  <div className="flex flex-wrap items-center gap-3 justify-between mb-2">
                    <span className="font-medium text-[#f1f5f9] capitalize">
                      {incident.serviceName ?? "Unknown service"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                        incident.resolvedAt
                          ? "border-emerald-400/25 text-emerald-400 bg-emerald-400/10"
                          : "border-amber-400/25 text-amber-400 bg-amber-400/10"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${incident.resolvedAt ? "bg-emerald-400" : "bg-amber-400"}`}
                      />
                      {incident.resolvedAt ? "Resolved" : "Ongoing"}
                    </span>
                  </div>
                  {incident.severity ? (
                    <span className="inline-block text-xs text-[#64748b] border border-white/[0.08] rounded-full px-2.5 py-0.5 mb-2">
                      {incident.severity}
                    </span>
                  ) : null}
                  {incident.description ? (
                    <p className="text-sm text-[#64748b]">{incident.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-[#64748b]">
                    Started {incident.startedAt ? new Date(incident.startedAt).toLocaleString() : "unknown"}
                    {incident.resolvedAt
                      ? ` · Resolved ${new Date(incident.resolvedAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* On-chain addresses */}
        <section>
          <h2 className="font-display text-xl font-semibold text-[#f1f5f9] mb-2">
            On-chain addresses
          </h2>
          <p className="text-sm text-[#64748b] mb-6">
            Live Fyxvo devnet program accounts. Click any address to inspect on Solana Explorer.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ON_CHAIN_ADDRESSES.map(({ label, address }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-[#64748b] mb-3">{label}</p>
                <Link
                  href={`${EXPLORER_BASE}/${address}${DEVNET_CLUSTER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-[#f97316] hover:underline break-all"
                >
                  {shortenAddr(address)}
                </Link>
                <p className="mt-1 font-mono text-xs text-[#64748b] break-all">{address}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
