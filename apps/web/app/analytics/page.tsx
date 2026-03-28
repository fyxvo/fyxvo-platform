"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoadingSkeleton } from "../../components/loading-skeleton";
import { RetryBanner } from "../../components/retry-banner";
import { AuthGate } from "../../components/state-panels";
import {
  getAnalyticsOverview,
  getMethodBreakdown,
  getProjectAnalytics,
} from "../../lib/api";
import { usePortal } from "../../lib/portal-context";
import type { AnalyticsOverview, MethodBreakdownItem, ProjectAnalytics } from "../../lib/types";

const RANGE_OPTIONS = ["1h", "6h", "24h", "7d", "30d"] as const;

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">{value}</p>
      {note ? <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">{note}</p> : null}
    </div>
  );
}

export default function AnalyticsPage() {
  const { token, projects, selectedProject, setSelectedProject } = usePortal();
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>("24h");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [projectAnalytics, setProjectAnalytics] = useState<ProjectAnalytics | null>(null);
  const [methods, setMethods] = useState<MethodBreakdownItem[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      setSelectedProject(projects[0]!);
    }
  }, [projects, selectedProject, setSelectedProject]);

  const loadOverview = useCallback(async () => {
    if (!token) return;
    setOverviewLoading(true);
    setOverviewError(null);

    try {
      setOverview(await getAnalyticsOverview(token));
    } catch (error) {
      setOverview(null);
      setOverviewError(
        error instanceof Error ? error.message : "Unable to load the analytics overview."
      );
    } finally {
      setOverviewLoading(false);
    }
  }, [token]);

  const loadProjectDetail = useCallback(async () => {
    if (!token || !selectedProject) return;
    setDetailLoading(true);
    setDetailError(null);

    try {
      const [analytics, methodBreakdown] = await Promise.all([
        getProjectAnalytics({ projectId: selectedProject.id, token, range }),
        getMethodBreakdown({ projectId: selectedProject.id, token, range }),
      ]);
      setProjectAnalytics(analytics);
      setMethods(methodBreakdown);
    } catch (error) {
      setProjectAnalytics(null);
      setMethods([]);
      setDetailError(
        error instanceof Error ? error.message : "Unable to load project analytics."
      );
    } finally {
      setDetailLoading(false);
    }
  }, [range, selectedProject, token]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadProjectDetail();
  }, [loadProjectDetail]);

  const statusTotal =
    projectAnalytics?.statusCodes.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const successCount =
    projectAnalytics?.statusCodes
      .filter((item) => item.statusCode < 400)
      .reduce((sum, item) => sum + item.count, 0) ?? 0;
  const successRate = statusTotal > 0 ? `${((successCount / statusTotal) * 100).toFixed(1)}%` : "N/A";
  const averageLatency =
    projectAnalytics != null ? `${projectAnalytics.latency.averageMs.toFixed(1)}ms` : "N/A";
  const overviewServiceSummary = useMemo(
    () =>
      overview?.requestsByService
        .map((item) => `${item.service}: ${item.count.toLocaleString()}`)
        .join(" • ") ?? null,
    [overview]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <AuthGate>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
                Analytics
              </h1>
              <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
                Inspect aggregate platform usage and drill into project-level request behavior.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-col gap-2 text-sm text-[var(--fyxvo-text-muted)]">
                Project
                <select
                  value={selectedProject?.id ?? ""}
                  onChange={(event) => {
                    const project = projects.find((item) => item.id === event.target.value);
                    if (project) setSelectedProject(project);
                  }}
                  className="h-11 min-w-[14rem] rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-[var(--fyxvo-text-muted)]">
                Range
                <select
                  value={range}
                  onChange={(event) => setRange(event.target.value as (typeof RANGE_OPTIONS)[number])}
                  className="h-11 min-w-[8rem] rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                >
                  {RANGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {overviewError ? <RetryBanner message={overviewError} onRetry={() => void loadOverview()} /> : null}
          {detailError ? <RetryBanner message={detailError} onRetry={() => void loadProjectDetail()} /> : null}

          {overviewLoading && !overview ? (
            <div className="grid gap-4 md:grid-cols-3">
              <LoadingSkeleton className="h-28 rounded-2xl" />
              <LoadingSkeleton className="h-28 rounded-2xl" />
              <LoadingSkeleton className="h-28 rounded-2xl" />
            </div>
          ) : overview ? (
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Tracked requests"
                value={overview.totals.requestLogs.toLocaleString()}
                {...(overviewServiceSummary ? { note: overviewServiceSummary } : {})}
              />
              <MetricCard
                label="Projects"
                value={overview.totals.projects.toLocaleString()}
                note={`${overview.totals.apiKeys.toLocaleString()} API keys in scope`}
              />
              <MetricCard
                label="Platform latency"
                value={`${overview.latency.averageMs.toFixed(1)}ms`}
                note={`Peak ${overview.latency.maxMs.toFixed(1)}ms`}
              />
            </div>
          ) : null}

          {detailLoading && !projectAnalytics ? (
            <div className="space-y-4">
              <LoadingSkeleton className="h-32 rounded-2xl" />
              <LoadingSkeleton className="h-80 rounded-2xl" />
            </div>
          ) : projectAnalytics ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="Total requests"
                  value={projectAnalytics.totals.requestLogs.toLocaleString()}
                  note={`${projectAnalytics.totals.apiKeys.toLocaleString()} API keys attached`}
                />
                <MetricCard
                  label="Success rate"
                  value={successRate}
                  note={`${statusTotal.toLocaleString()} responses in range`}
                />
                <MetricCard
                  label="Average latency"
                  value={averageLatency}
                  note={`P95 ${projectAnalytics.latency.p95Ms.toFixed(1)}ms`}
                />
              </div>

              <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">
                  Method breakdown
                </h2>
                <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
                  Route activity for the selected project over the chosen time range.
                </p>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--fyxvo-border)] text-left text-[var(--fyxvo-text-muted)]">
                        <th className="px-3 py-3 font-medium">Route</th>
                        <th className="px-3 py-3 font-medium">Service</th>
                        <th className="px-3 py-3 font-medium">Count</th>
                        <th className="px-3 py-3 font-medium">Avg latency</th>
                        <th className="px-3 py-3 font-medium">Error rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {methods.map((item) => (
                        <tr key={`${item.service}-${item.route}`} className="border-b border-[var(--fyxvo-border)] last:border-b-0">
                          <td className="px-3 py-3 text-[var(--fyxvo-text)]">{item.route}</td>
                          <td className="px-3 py-3 text-[var(--fyxvo-text-soft)]">{item.service}</td>
                          <td className="px-3 py-3 text-[var(--fyxvo-text-soft)]">
                            {item.count.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-[var(--fyxvo-text-soft)]">
                            {item.averageLatencyMs.toFixed(1)}ms
                          </td>
                          <td className="px-3 py-3 text-[var(--fyxvo-text-soft)]">
                            {(item.errorRate * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </AuthGate>
    </div>
  );
}
