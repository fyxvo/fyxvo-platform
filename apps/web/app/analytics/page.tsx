"use client";

import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Notice,
} from "@fyxvo/ui";
import dynamic from "next/dynamic";
const BarChartCard = dynamic(() => import("../../components/charts").then((m) => ({ default: m.BarChartCard })), { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-2xl bg-[var(--fyxvo-panel-soft)]" /> });
const LineChartCard = dynamic(() => import("../../components/charts").then((m) => ({ default: m.LineChartCard })), { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-2xl bg-[var(--fyxvo-panel-soft)]" /> });
import { MetricCard, DeltaBadge } from "../../components/metric-card";
import { PageHeader } from "../../components/page-header";
import { RequestLogExplorer } from "../../components/request-log-explorer";
import { AuthGate } from "../../components/state-panels";
import { usePortal } from "../../components/portal-provider";
import { getCostBreakdown, getProjectAnalytics, downloadAnalyticsExport, getErrorLog, getMethodBreakdown } from "../../lib/api";
import { dashboardTrend } from "../../lib/sample-data";
import { formatDuration, formatInteger, formatPercent, formatRelativeDate, lamportsToSol } from "../../lib/format";
import type { AnalyticsRange, CostBreakdownSummary, ErrorLogEntry, MethodBreakdown, ProjectAnalytics } from "../../lib/types";

interface NodeDistributionEntry {
  readonly nodeUrl: string;
  readonly requestCount: number;
  readonly avgLatencyMs: number;
}
import { webEnv } from "../../lib/env";
import { CopyButton } from "../../components/copy-button";

const RANGE_OPTIONS: { label: string; value: AnalyticsRange }[] = [
  { label: "1h", value: "1h" },
  { label: "6h", value: "6h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" }
];

function RangeSelector({
  value,
  onChange
}: {
  readonly value: AnalyticsRange;
  readonly onChange: (v: AnalyticsRange) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-1">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${value === opt.value ? "bg-[var(--fyxvo-brand)] text-white" : "text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function toSparklinePath(points: number[], width = 80, height = 24): string {
  if (points.length < 2) return "";
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  return points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

async function fetchSolPriceUsd() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json() as { solana?: { usd?: number } };
    return data.solana?.usd ?? null;
  } catch {
    return null;
  }
}

export default function AnalyticsPage() {
  const portal = usePortal();
  const [range, setRange] = useState<AnalyticsRange>("24h");
  const [methods, setMethods] = useState<MethodBreakdown[]>([]);
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [localAnalytics, setLocalAnalytics] = useState<ProjectAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [nodeDistribution, setNodeDistribution] = useState<NodeDistributionEntry[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [successTrend, setSuccessTrend] = useState<number[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownSummary | null>(null);
  const [solPriceUsd, setSolPriceUsd] = useState<number | null>(null);
  const [costSort, setCostSort] = useState<"spend" | "count" | "method">("spend");

  const selectedProject = portal.selectedProject;

  useEffect(() => {
    if (!selectedProject || !portal.token) {
      setLocalAnalytics(null);
      return;
    }
    let cancelled = false;
    setLoadingAnalytics(true);
    getProjectAnalytics(selectedProject.id, portal.token, range)
      .then((data) => {
        if (!cancelled) setLocalAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) setLocalAnalytics(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingAnalytics(false);
      });
    return () => { cancelled = true; };
  }, [selectedProject, portal.token, range]);

  useEffect(() => {
    if (!selectedProject || !portal.token) return;
    let cancelled = false;
    setLoadingExtra(true);
    Promise.all([
      getMethodBreakdown(selectedProject.id, portal.token, range),
      getErrorLog(selectedProject.id, portal.token),
      getCostBreakdown(selectedProject.id, portal.token, range),
      fetchSolPriceUsd()
    ])
      .then(([m, e, costs, liveSolPriceUsd]) => {
        if (!cancelled) {
          setMethods(m);
          setErrors(e);
          setCostBreakdown(costs);
          setSolPriceUsd(liveSolPriceUsd);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMethods([]);
          setErrors([]);
          setCostBreakdown(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExtra(false);
      });
    return () => { cancelled = true; };
  }, [selectedProject, portal.token, range]);

  useEffect(() => {
    if (!selectedProject || !portal.token) {
      setNodeDistribution([]);
      return;
    }
    let cancelled = false;
    setLoadingNodes(true);
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"}/v1/projects/${selectedProject.id}/analytics/nodes`;
    fetch(url, { headers: { authorization: `Bearer ${portal.token}` }, cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("nodes fetch failed")))
      .then((body: unknown) => {
        if (typeof body === "object" && body !== null && "nodes" in body && Array.isArray((body as Record<string, unknown>).nodes)) {
          if (!cancelled) setNodeDistribution((body as { nodes: NodeDistributionEntry[] }).nodes);
        } else {
          if (!cancelled) setNodeDistribution([]);
        }
      })
      .catch(() => {
        if (!cancelled) setNodeDistribution([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingNodes(false);
      });
    return () => { cancelled = true; };
  }, [selectedProject, portal.token]);

  useEffect(() => {
    if (!selectedProject || !portal.token) {
      setSuccessTrend([]);
      return;
    }
    let cancelled = false;
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"}/v1/projects/${selectedProject.id}/analytics/success-trend?range=${range}`;
    fetch(url, { headers: { authorization: `Bearer ${portal.token}` }, cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("success-trend fetch failed")))
      .then((body: unknown) => {
        if (
          typeof body === "object" &&
          body !== null &&
          "trend" in body &&
          Array.isArray((body as Record<string, unknown>).trend)
        ) {
          const data = (body as { trend: number[] }).trend;
          if (!cancelled) setTimeout(() => setSuccessTrend(data), 0);
        } else {
          if (!cancelled) setTimeout(() => setSuccessTrend([]), 0);
        }
      })
      .catch(() => {
        if (!cancelled) setTimeout(() => setSuccessTrend([]), 0);
      });
    return () => { cancelled = true; };
  }, [selectedProject, portal.token, range]);

  useEffect(() => {
    if (!selectedProject || !portal.token) {
      setHeatmapData([]);
      return;
    }
    let cancelled = false;
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"}/v1/projects/${selectedProject.id}/analytics/heatmap?range=${range}`;
    fetch(url, { headers: { authorization: `Bearer ${portal.token}` }, cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("heatmap fetch failed")))
      .then((body: unknown) => {
        if (
          typeof body === "object" &&
          body !== null &&
          "heatmap" in body &&
          Array.isArray((body as Record<string, unknown>).heatmap)
        ) {
          const data = (body as { heatmap: number[][] }).heatmap;
          if (!cancelled) {
            setTimeout(() => setHeatmapData(data), 0);
          }
        } else {
          if (!cancelled) setTimeout(() => setHeatmapData([]), 0);
        }
      })
      .catch(() => {
        if (!cancelled) setTimeout(() => setHeatmapData([]), 0);
      });
    return () => { cancelled = true; };
  }, [selectedProject, portal.token, range]);

  useEffect(() => {
    if (!exportOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportOpen]);

  const displayAnalytics = localAnalytics ?? portal.projectAnalytics;

  const servicePoints = portal.analyticsOverview.requestsByService.map((entry) => ({
    label: entry.service,
    value: entry.count,
  }));
  const statusPoints = displayAnalytics.statusCodes.map((entry) => ({
    label: String(entry.statusCode),
    value: entry.count,
  }));

  const hasData = displayAnalytics.totals.requestLogs > 0;
  const isAuthenticated = portal.walletPhase === "authenticated";
  const sortedCostItems = [...(costBreakdown?.items ?? [])].sort((left, right) => {
    if (costSort === "count") {
      return right.count - left.count;
    }
    if (costSort === "method") {
      return left.method.localeCompare(right.method);
    }
    return right.totalLamports - left.totalLamports;
  });

  function triggerDownload(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCostBreakdown(format: "csv" | "json") {
    if (!selectedProject || !costBreakdown) return;
    if (format === "json") {
      triggerDownload(
        JSON.stringify(costBreakdown, null, 2),
        `cost-breakdown-${selectedProject.slug}-${range}.json`,
        "application/json"
      );
      return;
    }
    const header = "method,pricingTier,count,totalLamports,estimatedSol,shareOfTotalSpend\n";
    const rows = sortedCostItems.map((item) =>
      [
        item.method,
        item.pricingTier,
        item.count,
        item.totalLamports,
        item.estimatedSol.toFixed(6),
        item.shareOfTotalSpend.toFixed(4),
      ].join(",")
    );
    triggerDownload(header + rows.join("\n"), `cost-breakdown-${selectedProject.slug}-${range}.csv`, "text/csv");
  }

  async function exportData(format: "csv" | "excel" | "json") {
    if (!selectedProject || !portal.token) return;
    setExporting(true);
    setExportOpen(false);
    try {
      const blob = await downloadAnalyticsExport(selectedProject.id, range, portal.token);
      const rawCsv = await blob.text();

      const allLines = rawCsv.split("\n").filter((l) => l.trim().length > 0);
      const originalHeaders = (allLines[0] ?? "").split(",").map((h) => h.trim());
      const dataLines = allLines.slice(1);
      const colHeaders = ["timestamp", "project", "method", "mode", "latency", "status", "success", "apiKeyPrefix", "region", "upstream"];

      if (format === "json") {
        // Parse CSV rows into objects and export as JSON
        const csvRows = dataLines.map((line) => {
          const cells = line.split(",").map((c) => c.trim());
          const row: Record<string, string> = {};
          colHeaders.forEach((col) => {
            const origIdx = originalHeaders.indexOf(col);
            row[col] = origIdx >= 0 ? (cells[origIdx] ?? "") : "";
          });
          return row;
        });
        const json = JSON.stringify(csvRows, null, 2);
        triggerDownload(json, `analytics-${selectedProject.slug}-${range}.json`, "application/json");
      } else {
        // For both csv and excel, build rows with expanded columns
        const expandedRows = dataLines.map((line) => {
          const cells = line.split(",").map((c) => c.trim());
          return colHeaders.map((col) => {
            const origIdx = originalHeaders.indexOf(col);
            return origIdx >= 0 ? (cells[origIdx] ?? "") : "";
          });
        });
        const csvContent = [
          colHeaders.join(","),
          ...expandedRows.map((r) => r.join(",")),
        ].join("\n");

        if (format === "excel") {
          triggerDownload(
            csvContent,
            `analytics-${selectedProject.slug}-${range}.xlsx`,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );
        } else {
          triggerDownload(csvContent, `analytics-${selectedProject.slug}-${range}.csv`, "text/csv");
        }
      }
    } catch {
      // ignore export errors
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          eyebrow="Analytics"
          title="Know where the load is shaping up."
          description="Request volume, latency, error rates, and balance consumption tied to your project."
        />
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <RangeSelector value={range} onChange={setRange} />
          {isAuthenticated && selectedProject && (
            <div className="relative" ref={exportRef}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setExportOpen((v) => !v)}
                disabled={exporting}
              >
                {exporting ? "Exporting\u2026" : "Export \u25be"}
              </Button>
              {exportOpen && (
                <div className="absolute right-0 mt-1 min-w-[140px] rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] shadow-lg z-10">
                  {(
                    [
                      { label: "CSV", format: "csv" as const },
                      { label: "Excel (.xlsx)", format: "excel" as const },
                      { label: "JSON", format: "json" as const },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.format}
                      type="button"
                      onClick={() => void exportData(opt.format)}
                      className="block w-full px-4 py-2 text-left text-sm text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)] transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!isAuthenticated ? (
        <AuthGate body="Connect a wallet to replace the preview analytics with live project data from the API." />
      ) : null}

      {!hasData && isAuthenticated ? (
        <Notice tone="neutral" title="No request data yet">
          Send traffic to the gateway using your API key to populate these charts.
        </Notice>
      ) : null}

      {loadingAnalytics ? (
        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--fyxvo-panel-soft)]" />
          ))}
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <MetricCard
            label="Total requests"
            value={formatInteger(displayAnalytics.totals.requestLogs)}
            detail="Request volume attributed to the selected project."
            accent={<DeltaBadge value="project scope" />}
          />
          <MetricCard
            label="Success rate"
            value={(() => {
              const total = displayAnalytics.totals.requestLogs;
              if (!total) return "–";
              const success = displayAnalytics.statusCodes
                .filter((s) => s.statusCode < 400)
                .reduce((sum, s) => sum + s.count, 0);
              return formatPercent((success / total) * 100);
            })()}
            detail="Requests returning 2xx and 3xx status codes."
            accent={
              <div className="flex items-center gap-2">
                <DeltaBadge value="observed" />
                {successTrend.length >= 2 && (() => {
                  const latest = successTrend[successTrend.length - 1] ?? 0;
                  const color = latest >= 95 ? "#22c55e" : "#f59e0b";
                  const path = toSparklinePath(successTrend);
                  return (
                    <svg width={80} height={24} viewBox="0 0 80 24" fill="none" aria-hidden="true">
                      <path d={path} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  );
                })()}
              </div>
            }
          />
          <MetricCard
            label="Avg latency"
            value={formatDuration(displayAnalytics.latency.averageMs)}
            detail="Average end-to-end relay latency for the selected range."
            accent={<Badge tone="brand">avg</Badge>}
          />
          <MetricCard
            label="P95 latency"
            value={
              (displayAnalytics.latency as { averageMs: number; maxMs: number; p95Ms?: number }).p95Ms != null
                ? formatDuration((displayAnalytics.latency as { averageMs: number; maxMs: number; p95Ms?: number }).p95Ms!)
                : formatDuration(displayAnalytics.latency.maxMs)
            }
            detail="95th percentile latency — tail performance indicator."
            accent={<Badge tone="neutral">p95</Badge>}
          />
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <LineChartCard
          title="Gateway and API pressure"
          description="A combined traffic profile helps distinguish routing pressure from backend orchestration pressure."
          points={dashboardTrend}
        />
        <BarChartCard
          title="Requests by service"
          description="Service distribution shows whether the gateway is carrying the expected load."
          points={servicePoints}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <BarChartCard
          title="Status code composition"
          description="Small slices of 402, 429, and 503 traffic reveal reserve pressure and failover conditions."
          points={statusPoints}
        />
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Why these charts exist</CardTitle>
            <CardDescription>
              Analytics are tuned to operational questions that show up during live devnet traffic.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Latency signal
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                If the shape changes before the average does, you can rebalance nodes or funding
                before a degraded experience shows up.
              </div>
            </div>
            <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Treasury signal
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                402 and 429 traffic often maps back to reserve floors or pricing decisions, so it
                stays visible instead of buried in a log search.
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Method breakdown */}
      {isAuthenticated && (
        <section>
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Route breakdown</CardTitle>
              <CardDescription>
                Top 10 routes by request volume for the selected time range. Shows average latency and error rate per route.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingExtra ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--fyxvo-panel-soft)]" />
                  ))}
                </div>
              ) : methods.length === 0 ? (
                <Notice tone="neutral" title="No route data">
                  No requests found for the selected time range. Expand the range or send traffic to see the breakdown.
                </Notice>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--fyxvo-border)]">
                      <tr>
                        <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Route</th>
                        <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Service</th>
                        <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Requests</th>
                        <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Avg latency</th>
                        <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Error rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--fyxvo-border)]">
                      {methods.map((m) => (
                        <tr key={`${m.route}-${m.service}`} className="text-[var(--fyxvo-text-soft)]">
                          <td className="py-3 font-mono text-xs text-[var(--fyxvo-text)]">{m.route}</td>
                          <td className="py-3 text-xs">{m.service}</td>
                          <td className="py-3 text-right text-xs">{m.count.toLocaleString()}</td>
                          <td className="py-3 text-right text-xs">{formatDuration(m.averageLatencyMs)}</td>
                          <td className="py-3 text-right text-xs">
                            <span className={m.errorRate > 0.05 ? "text-[var(--fyxvo-danger)]" : "text-[var(--fyxvo-success)]"}>
                              {formatPercent(m.errorRate * 100)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Cost breakdown */}
      {isAuthenticated && displayAnalytics.totals.requestLogs > 0 && (
        <section>
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>Per-method cost breakdown</CardTitle>
                  <CardDescription>
                    Real request spend estimates for the selected range using Fyxvo pricing tiers, share of spend, and optional live USD conversion.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={costSort === "spend" ? "primary" : "secondary"} onClick={() => setCostSort("spend")}>
                    Sort by spend
                  </Button>
                  <Button size="sm" variant={costSort === "count" ? "primary" : "secondary"} onClick={() => setCostSort("count")}>
                    Sort by count
                  </Button>
                  <Button size="sm" variant={costSort === "method" ? "primary" : "secondary"} onClick={() => setCostSort("method")}>
                    Sort by method
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => exportCostBreakdown("csv")}>
                    Export CSV
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => exportCostBreakdown("json")}>
                    Export JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {costBreakdown === null ? (
                <Notice tone="neutral" title="Cost data unavailable">
                  Cost breakdown will appear once this project has billable request history in the selected range.
                </Notice>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Total spend</div>
                      <div className="mt-2 text-xl font-semibold text-[var(--fyxvo-text)]">
                        {lamportsToSol(costBreakdown.totalLamports).toFixed(6)} SOL
                      </div>
                      <div className="text-xs text-[var(--fyxvo-text-muted)]">
                        {formatInteger(costBreakdown.totalLamports)} lamports
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Live USD estimate</div>
                      <div className="mt-2 text-xl font-semibold text-[var(--fyxvo-text)]">
                        {solPriceUsd != null ? `$${(lamportsToSol(costBreakdown.totalLamports) * solPriceUsd).toFixed(2)}` : "Unavailable"}
                      </div>
                      <div className="text-xs text-[var(--fyxvo-text-muted)]">
                        {solPriceUsd != null ? `SOL price ${solPriceUsd.toFixed(2)} USD` : "CoinGecko price unavailable"}
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Top spend driver</div>
                      <div className="mt-2 text-xl font-semibold text-[var(--fyxvo-text)]">
                        {sortedCostItems[0]?.method ?? "No billable methods"}
                      </div>
                      <div className="text-xs text-[var(--fyxvo-text-muted)]">
                        {sortedCostItems[0] ? `${formatPercent(sortedCostItems[0].shareOfTotalSpend * 100)} of total spend` : "No spend captured yet"}
                      </div>
                    </div>
                  </div>

                  {sortedCostItems.length === 0 ? (
                    <Notice tone="neutral" title="No billable requests">
                      Simulation traffic is excluded, so this panel stays focused on real billed relay usage.
                    </Notice>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-[var(--fyxvo-border)]">
                          <tr>
                            <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Method</th>
                            <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Pricing tier</th>
                            <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Requests</th>
                            <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Lamports</th>
                            <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">SOL</th>
                            <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">USD</th>
                            <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Spend share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--fyxvo-border)]">
                          {sortedCostItems.map((item) => (
                            <tr key={`${item.method}-${item.pricingTier}`} className="text-[var(--fyxvo-text-soft)]">
                              <td className="py-3 font-mono text-xs text-[var(--fyxvo-text)]">{item.method}</td>
                              <td className="py-3 text-xs capitalize">{item.pricingTier.replace("_", " ")}</td>
                              <td className="py-3 text-right text-xs">{formatInteger(item.count)}</td>
                              <td className="py-3 text-right text-xs">{formatInteger(item.totalLamports)}</td>
                              <td className="py-3 text-right text-xs">{item.estimatedSol.toFixed(6)}</td>
                              <td className="py-3 text-right text-xs">
                                {solPriceUsd != null ? `$${(item.estimatedSol * solPriceUsd).toFixed(2)}` : "—"}
                              </td>
                              <td className="py-3 text-right text-xs">{formatPercent(item.shareOfTotalSpend * 100)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Upstream node distribution */}
      {isAuthenticated && selectedProject && (
        <section>
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Upstream Node Distribution</CardTitle>
              <CardDescription>
                Request volume and average latency broken down by upstream relay node.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingNodes ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--fyxvo-panel-soft)]" />
                  ))}
                </div>
              ) : nodeDistribution.length === 0 ? (
                <Notice tone="neutral" title="Node tracking was recently enabled">
                  More data will appear over the next few days as requests route through upstream nodes.
                </Notice>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--fyxvo-border)]">
                      <tr>
                        <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Node URL</th>
                        <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Requests</th>
                        <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Avg latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--fyxvo-border)]">
                      {nodeDistribution.map((node) => (
                        <tr key={node.nodeUrl} className="text-[var(--fyxvo-text-soft)]">
                          <td className="py-3 font-mono text-xs text-[var(--fyxvo-text)]" title={node.nodeUrl}>
                            {node.nodeUrl.length > 40 ? `${node.nodeUrl.slice(0, 38)}…` : node.nodeUrl}
                          </td>
                          <td className="py-3 text-right text-xs">{node.requestCount.toLocaleString()}</td>
                          <td className="py-3 text-right text-xs">{formatDuration(node.avgLatencyMs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Error log */}
      {isAuthenticated && (
        <section>
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Recent errors</CardTitle>
              <CardDescription>
                Last 20 failed requests (4xx and 5xx) for the selected project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingExtra ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--fyxvo-panel-soft)]" />
                  ))}
                </div>
              ) : errors.length === 0 ? (
                <Notice tone="success" title="No errors found">
                  No failed requests in the current dataset. Good signal.
                </Notice>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--fyxvo-border)]">
                      <tr>
                        <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Route</th>
                        <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Status</th>
                        <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Method</th>
                        <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Latency</th>
                        <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Time</th>
                        <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Replay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--fyxvo-border)]">
                      {errors.map((entry) => {
                        const replayCurl = entry.service === "gateway"
                          ? `curl -X POST ${webEnv.gatewayBaseUrl}${entry.route} \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot","params":[]}'`
                          : `curl -X ${entry.method} ${webEnv.apiBaseUrl}${entry.route} \\\n  -H "Authorization: Bearer YOUR_API_TOKEN"`;
                        return (
                          <tr key={entry.id} className="text-[var(--fyxvo-text-soft)]">
                            <td className="py-3 font-mono text-xs text-[var(--fyxvo-text)]">{entry.route}</td>
                            <td className="py-3 text-xs">
                              <Badge tone={entry.statusCode >= 500 ? "danger" : "warning"}>{entry.statusCode}</Badge>
                            </td>
                            <td className="py-3 text-xs uppercase">{entry.method}</td>
                            <td className="py-3 text-right text-xs">{formatDuration(entry.durationMs)}</td>
                            <td className="py-3 text-right text-xs">{formatRelativeDate(entry.createdAt)}</td>
                            <td className="py-3 text-right">
                              <CopyButton value={replayCurl} label="Copy replay" className="text-xs" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Latency Heatmap */}
      {isAuthenticated && selectedProject && (
        <section>
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Latency Heatmap</CardTitle>
              <CardDescription>
                Average latency by hour (0–23) and day of week (Mon–Sun). Darker cells indicate higher latency.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {heatmapData.length === 0 ? (
                <Notice tone="neutral" title="No heatmap data">
                  Heatmap data will appear once enough traffic has been recorded for the selected range.
                </Notice>
              ) : (
                <div className="space-y-3">
                  {/* Day labels */}
                  <div
                    style={{ display: "grid", gridTemplateColumns: "2.5rem repeat(7, 1fr)", gap: "2px" }}
                  >
                    <div />
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <div key={d} className="text-center text-xs text-[var(--fyxvo-text-muted)]">{d}</div>
                    ))}
                  </div>
                  {/* Grid rows: one per hour */}
                  {(() => {
                    const maxVal = Math.max(...heatmapData.flatMap((row) => row), 1);
                    return heatmapData.map((row, hour) => (
                      <div
                        key={hour}
                        style={{ display: "grid", gridTemplateColumns: "2.5rem repeat(7, 1fr)", gap: "2px" }}
                      >
                        <div className="flex items-center text-xs text-[var(--fyxvo-text-muted)]">
                          {String(hour).padStart(2, "0")}
                        </div>
                        {row.map((val, dayIdx) => {
                          const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
                          const intensity = maxVal > 0 ? val / maxVal : 0;
                          return (
                            <div
                              key={dayIdx}
                              title={`Hour ${String(hour).padStart(2, "0")}, ${DAY_LABELS[dayIdx] ?? `Day ${dayIdx}`}: ${val}ms avg`}
                              style={{
                                height: "14px",
                                borderRadius: "2px",
                                backgroundColor: `color-mix(in srgb, var(--fyxvo-brand) ${Math.round(intensity * 85 + 5)}%, transparent)`,
                              }}
                            />
                          );
                        })}
                      </div>
                    ));
                  })()}
                  {/* Legend */}
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs text-[var(--fyxvo-text-muted)]">Low latency</span>
                    <div
                      style={{
                        flex: 1,
                        height: "8px",
                        borderRadius: "4px",
                        background: "linear-gradient(to right, color-mix(in srgb, var(--fyxvo-brand) 10%, transparent), var(--fyxvo-brand))",
                      }}
                    />
                    <span className="text-xs text-[var(--fyxvo-text-muted)]">High latency</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {isAuthenticated && selectedProject && portal.token ? (
        <section>
          <RequestLogExplorer
            projectId={selectedProject.id}
            token={portal.token}
            title="Request log explorer"
            description="Drill into recent requests with the same filters your team uses during debugging, triage, and performance review."
            queryPrefix="analytics-logs"
          />
        </section>
      ) : null}
    </div>
  );
}
