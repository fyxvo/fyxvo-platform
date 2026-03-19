"use client";

import { useEffect, useState } from "react";
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
import { BarChartCard, LineChartCard } from "../../components/charts";
import { MetricCard, DeltaBadge } from "../../components/metric-card";
import { PageHeader } from "../../components/page-header";
import { AuthGate } from "../../components/state-panels";
import { usePortal } from "../../components/portal-provider";
import { downloadAnalyticsExport, getErrorLog, getMethodBreakdown } from "../../lib/api";
import { dashboardTrend } from "../../lib/sample-data";
import { formatDuration, formatInteger, formatPercent, formatRelativeDate } from "../../lib/format";
import type { AnalyticsRange, ErrorLogEntry, MethodBreakdown } from "../../lib/types";

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
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${value === opt.value ? "bg-brand-500 text-white" : "text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const portal = usePortal();
  const [range, setRange] = useState<AnalyticsRange>("24h");
  const [methods, setMethods] = useState<MethodBreakdown[]>([]);
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [exporting, setExporting] = useState(false);

  const selectedProject = portal.selectedProject;

  useEffect(() => {
    if (!selectedProject || !portal.token) return;
    let cancelled = false;
    setLoadingExtra(true);
    Promise.all([
      getMethodBreakdown(selectedProject.id, portal.token, range),
      getErrorLog(selectedProject.id, portal.token)
    ])
      .then(([m, e]) => {
        if (!cancelled) {
          setMethods(m);
          setErrors(e);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMethods([]);
          setErrors([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExtra(false);
      });
    return () => { cancelled = true; };
  }, [selectedProject, portal.token, range]);

  const servicePoints = portal.analyticsOverview.requestsByService.map((entry) => ({
    label: entry.service,
    value: entry.count,
  }));
  const statusPoints = portal.projectAnalytics.statusCodes.map((entry) => ({
    label: String(entry.statusCode),
    value: entry.count,
  }));

  const hasData = portal.projectAnalytics.totals.requestLogs > 0;
  const isAuthenticated = portal.walletPhase === "authenticated";

  async function handleExport() {
    if (!selectedProject || !portal.token) return;
    setExporting(true);
    try {
      const blob = await downloadAnalyticsExport(selectedProject.id, range, portal.token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${selectedProject.slug}-${range}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleExport()}
              disabled={exporting}
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
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

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Requests"
          value={formatInteger(portal.projectAnalytics.totals.requestLogs)}
          detail="Request volume attributed to the selected project."
          accent={<DeltaBadge value="project scope" />}
        />
        <MetricCard
          label="Average latency"
          value={formatDuration(portal.projectAnalytics.latency.averageMs)}
          detail="Useful for spotting throughput issues before users report them."
          accent={<DeltaBadge value="observed" />}
        />
        <MetricCard
          label="Funding requests"
          value={String(portal.projectAnalytics.totals.fundingRequests)}
          detail="Treasury prep requests made through the authenticated API workflow."
          accent={<Badge tone="brand">project scope</Badge>}
        />
        <MetricCard
          label="API keys"
          value={String(portal.projectAnalytics.totals.apiKeys)}
          detail="Credential surface currently mapped to this project."
          accent={<Badge tone="neutral">active</Badge>}
        />
      </section>

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
                            <span className={m.errorRate > 0.05 ? "text-rose-400" : "text-emerald-400"}>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--fyxvo-border)]">
                      {errors.map((entry) => (
                        <tr key={entry.id} className="text-[var(--fyxvo-text-soft)]">
                          <td className="py-3 font-mono text-xs text-[var(--fyxvo-text)]">{entry.route}</td>
                          <td className="py-3 text-xs">
                            <Badge tone={entry.statusCode >= 500 ? "danger" : "warning"}>{entry.statusCode}</Badge>
                          </td>
                          <td className="py-3 text-xs uppercase">{entry.method}</td>
                          <td className="py-3 text-right text-xs">{formatDuration(entry.durationMs)}</td>
                          <td className="py-3 text-right text-xs">{formatRelativeDate(entry.createdAt)}</td>
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
    </div>
  );
}
