"use client";

import { useEffect, useState, useCallback } from "react";
import { usePortal } from "../../components/portal-provider";
import { WalletConnectButton } from "../../components/wallet-connect-button";

const API = "https://api.fyxvo.com";

type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";

interface OverviewMetrics {
  readonly totalRequests: number;
  readonly successRate: number;
  readonly avgLatencyMs: number;
  readonly p95LatencyMs: number;
}

interface MethodRow {
  readonly method: string;
  readonly count: number;
  readonly avgLatencyMs: number;
  readonly errorRate: number;
}

interface ErrorRow {
  readonly timestamp: string;
  readonly method: string;
  readonly statusCode: number;
  readonly message: string;
}

function MetricCard({
  label,
  value,
  sub,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-transform hover:-translate-y-1">
      <p className="text-xs font-medium text-[#64748b] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#f1f5f9]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#64748b]">{sub}</p>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="h-3 w-24 rounded bg-white/[0.06] mb-2" />
      <div className="h-8 w-32 rounded bg-white/[0.06]" />
    </div>
  );
}

export default function AnalyticsPage() {
  const portal = usePortal();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [methods, setMethods] = useState<MethodRow[]>([]);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Set default project when portal loads
  useEffect(() => {
    if (!selectedProjectId && portal.selectedProject?.id) {
      setSelectedProjectId(portal.selectedProject.id);
    }
  }, [portal.selectedProject, selectedProjectId]);

  const fetchData = useCallback(async () => {
    if (!selectedProjectId || !portal.token) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${portal.token}` };
      const [overviewRes, methodsRes, errorsRes] = await Promise.all([
        fetch(`${API}/v1/analytics/projects/${selectedProjectId}?range=${timeRange}`, { headers }),
        fetch(`${API}/v1/projects/${selectedProjectId}/analytics/methods`, { headers }),
        fetch(`${API}/v1/projects/${selectedProjectId}/analytics/errors`, { headers }),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json() as OverviewMetrics;
        setMetrics(data);
      }
      if (methodsRes.ok) {
        const data = await methodsRes.json() as MethodRow[] | { methods?: MethodRow[] };
        setMethods(Array.isArray(data) ? data : (data.methods ?? []));
      }
      if (errorsRes.ok) {
        const data = await errorsRes.json() as ErrorRow[] | { errors?: ErrorRow[] };
        setErrors(Array.isArray(data) ? data : (data.errors ?? []));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, timeRange, portal.token]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleExport() {
    if (!portal.token || !selectedProjectId) return;
    setExporting(true);
    try {
      const res = await fetch(`${API}/v1/projects/${selectedProjectId}/analytics/export`, {
        headers: { Authorization: `Bearer ${portal.token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${selectedProjectId}-${timeRange}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (portal.walletPhase !== "authenticated") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col items-center gap-6 pt-20 text-center">
            <p className="text-[#64748b]">Connect your wallet to view analytics.</p>
            <WalletConnectButton />
          </div>
        </div>
      </div>
    );
  }

  const timeRanges: TimeRange[] = ["1h", "6h", "24h", "7d", "30d"];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#f1f5f9]">Analytics</h1>
            <p className="text-[#64748b] mt-1">Request metrics and error logs by project.</p>
          </div>
          <button
            onClick={() => void handleExport()}
            disabled={exporting || !selectedProjectId}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#64748b] hover:text-[#f1f5f9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-3 py-2 text-sm text-[#f1f5f9] focus:outline-none focus:border-[#f97316]/50 min-w-[200px]"
          >
            <option value="">Select project</option>
            {portal.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName ?? p.name}
              </option>
            ))}
          </select>

          <div className="flex gap-1">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  timeRange === range
                    ? "bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30"
                    : "border border-white/[0.08] bg-white/[0.03] text-[#64748b] hover:text-[#f1f5f9]"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : metrics ? (
            <>
              <MetricCard
                label="Total requests"
                value={metrics.totalRequests.toLocaleString()}
                sub={`Last ${timeRange}`}
              />
              <MetricCard
                label="Success rate"
                value={`${metrics.successRate.toFixed(1)}%`}
                sub="2xx responses"
              />
              <MetricCard
                label="Avg latency"
                value={`${metrics.avgLatencyMs}ms`}
                sub="Mean response time"
              />
              <MetricCard
                label="P95 latency"
                value={`${metrics.p95LatencyMs}ms`}
                sub="95th percentile"
              />
            </>
          ) : (
            <div className="col-span-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-10 text-center text-sm text-[#64748b]">
              {selectedProjectId ? "No data for this range." : "Select a project to view metrics."}
            </div>
          )}
        </div>

        {/* Method breakdown */}
        {methods.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-4">Method breakdown</h2>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 font-medium text-[#64748b]">Method</th>
                    <th className="text-right px-4 py-3 font-medium text-[#64748b]">Count</th>
                    <th className="text-right px-4 py-3 font-medium text-[#64748b]">Avg Latency</th>
                    <th className="text-right px-4 py-3 font-medium text-[#64748b]">Error Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {methods.map((row) => (
                    <tr key={row.method} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-xs text-[#f97316]">{row.method}</td>
                      <td className="px-4 py-3 text-right text-[#f1f5f9]">
                        {row.count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-[#f1f5f9]">
                        {row.avgLatencyMs}ms
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={
                            row.errorRate > 5
                              ? "text-rose-400"
                              : row.errorRate > 1
                                ? "text-amber-400"
                                : "text-emerald-400"
                          }
                        >
                          {row.errorRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error log */}
        {errors.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-4">Error log</h2>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 font-medium text-[#64748b]">Time</th>
                    <th className="text-left px-4 py-3 font-medium text-[#64748b]">Method</th>
                    <th className="text-left px-4 py-3 font-medium text-[#64748b]">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-[#64748b]">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {errors.map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-xs text-[#64748b] whitespace-nowrap">
                        {new Date(row.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#f97316]">{row.method}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded px-1.5 py-0.5 text-xs font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {row.statusCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#64748b] max-w-xs truncate">
                        {row.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
