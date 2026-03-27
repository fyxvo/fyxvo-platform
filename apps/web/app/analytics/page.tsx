"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Notice,
} from "@fyxvo/ui";
import { MetricCard } from "../../components/metric-card";
import { PageHeader } from "../../components/page-header";
import { AuthGate, LoadingGrid } from "../../components/state-panels";
import { usePortal } from "../../components/portal-provider";
import { getAnalyticsOverview } from "../../lib/api";
import { formatDuration, formatInteger, formatPercent } from "../../lib/format";
import type { AnalyticsOverview, ProjectAnalytics } from "../../lib/types";

function computeSuccessRate(statusCodes: ProjectAnalytics["statusCodes"]): number | null {
  const total = statusCodes.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return null;
  const success = statusCodes
    .filter((s) => s.statusCode >= 200 && s.statusCode < 300)
    .reduce((sum, s) => sum + s.count, 0);
  return (success / total) * 100;
}

function OverviewMetrics({ overview }: { readonly overview: AnalyticsOverview }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Total requests"
        value={formatInteger(overview.totals.requestLogs)}
        detail="All requests logged across every project and API key in your account."
      />
      <MetricCard
        label="Average latency"
        value={formatDuration(overview.latency.averageMs)}
        detail="Mean response time measured from gateway receipt to upstream acknowledgement."
      />
      <MetricCard
        label="Active projects"
        value={formatInteger(overview.totals.projects)}
        detail="Projects that have an on-chain account and at least one API key configured."
      />
      <MetricCard
        label="API keys"
        value={formatInteger(overview.totals.apiKeys)}
        detail="Total API keys across all your projects, including inactive and expired keys."
      />
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]"
        />
      ))}
    </div>
  );
}

function RecentRequestsTable({
  requests,
}: {
  readonly requests: ProjectAnalytics["recentRequests"];
}) {
  if (requests.length === 0) {
    return (
      <p className="text-sm text-[var(--fyxvo-text-muted)]">
        No recent requests recorded for this project.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--fyxvo-border)] text-left">
            <th className="pb-2 pr-4 font-medium text-[var(--fyxvo-text-muted)]">Method</th>
            <th className="pb-2 pr-4 font-medium text-[var(--fyxvo-text-muted)]">Route</th>
            <th className="pb-2 pr-4 font-medium text-[var(--fyxvo-text-muted)]">Status</th>
            <th className="pb-2 font-medium text-[var(--fyxvo-text-muted)]">Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--fyxvo-border)]">
          {requests.slice(0, 20).map((req) => (
            <tr key={req.id} className="text-[var(--fyxvo-text-muted)]">
              <td className="py-2 pr-4">
                <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1.5 py-0.5 text-xs font-mono text-[var(--fyxvo-text)]">
                  {req.method}
                </code>
              </td>
              <td className="py-2 pr-4 font-mono text-xs truncate max-w-[200px]">{req.route}</td>
              <td className="py-2 pr-4">
                <Badge
                  tone={
                    req.statusCode >= 200 && req.statusCode < 300
                      ? "success"
                      : req.statusCode >= 400
                      ? "danger"
                      : "neutral"
                  }
                >
                  {req.statusCode}
                </Badge>
              </td>
              <td className="py-2 text-xs">{formatDuration(req.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectAnalyticsSection({
  analytics,
}: {
  readonly analytics: ProjectAnalytics;
}) {
  const successRate = computeSuccessRate(analytics.statusCodes);
  const total = analytics.statusCodes.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
          <p className="text-xs uppercase tracking-widest text-[var(--fyxvo-text-muted)]">
            Total requests
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
            {formatInteger(analytics.totals.requestLogs)}
          </p>
        </Card>
        <Card className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
          <p className="text-xs uppercase tracking-widest text-[var(--fyxvo-text-muted)]">
            Success rate
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
            {successRate !== null ? formatPercent(successRate) : "—"}
          </p>
          {total > 0 ? (
            <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
              From {formatInteger(total)} requests with recorded status codes
            </p>
          ) : null}
        </Card>
        <Card className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
          <p className="text-xs uppercase tracking-widest text-[var(--fyxvo-text-muted)]">
            Avg latency
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
            {formatDuration(analytics.latency.averageMs)}
          </p>
          <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
            Mean gateway response time
          </p>
        </Card>
        <Card className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
          <p className="text-xs uppercase tracking-widest text-[var(--fyxvo-text-muted)]">
            P95 latency
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
            {analytics.latency.p95Ms ? formatDuration(analytics.latency.p95Ms) : "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
            95th percentile response time
          </p>
        </Card>
      </div>

      <Card className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
        <CardHeader>
          <CardTitle>Recent requests</CardTitle>
          <CardDescription>
            The most recent requests logged for this project, showing method, route, status code,
            and duration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecentRequestsTable requests={analytics.recentRequests} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AnalyticsPage() {
  const portal = usePortal();
  const [freshOverview, setFreshOverview] = useState<AnalyticsOverview | null>(null);
  const [loadingFresh, setLoadingFresh] = useState(false);

  useEffect(() => {
    if (!portal.token) return;
    let cancelled = false;
    setLoadingFresh(true);
    getAnalyticsOverview(portal.token)
      .then((data) => {
        if (!cancelled) setFreshOverview(data);
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoadingFresh(false);
      });
    return () => {
      cancelled = true;
    };
  }, [portal.token]);

  if (portal.walletPhase !== "authenticated") {
    return (
      <AuthGate
        title="Connect your wallet to view analytics"
        body="Authenticate with your Solana wallet to see request volume, latency metrics, and cost data across all your projects."
      />
    );
  }

  const overview = freshOverview ?? portal.analyticsOverview;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Observability"
        title="Analytics"
        description="Request volume, latency, and cost across all your projects."
      />

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-[var(--fyxvo-text)]">
          Overview
        </h2>
        {loadingFresh && !freshOverview ? (
          <OverviewSkeleton />
        ) : (
          <OverviewMetrics overview={overview} />
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-[var(--fyxvo-text)]">
          Project analytics
        </h2>
        {!portal.selectedProject ? (
          <Notice tone="neutral" title="Select a project">
            Choose a project from the dashboard to see detailed request analytics, success rates,
            latency breakdown, and recent request logs.
          </Notice>
        ) : portal.projectAnalytics ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-[var(--fyxvo-text)]">
                {portal.selectedProject.name}
              </span>
              <Badge tone="neutral">devnet</Badge>
              <code className="text-xs uppercase tracking-widest text-[var(--fyxvo-text-muted)]">
                {portal.selectedProject.slug}
              </code>
            </div>
            <ProjectAnalyticsSection analytics={portal.projectAnalytics} />
          </>
        ) : (
          <LoadingGrid />
        )}
      </section>

      {portal.projects.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-[var(--fyxvo-text)]">
            All projects
          </h2>
          <p className="text-sm leading-6 text-[var(--fyxvo-text-muted)]">
            Select a project from the list below to load its detailed analytics data above, or
            navigate to the project page for the full operational view.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portal.projects.map((project) => {
              const isSelected = portal.selectedProject?.id === project.id;
              return (
                <Card
                  key={project.id}
                  className={`rounded-xl border bg-[var(--fyxvo-panel-soft)] p-5 transition ${
                    isSelected
                      ? "border-[var(--fyxvo-brand)]/40"
                      : "border-[var(--fyxvo-border)]"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--fyxvo-text)]">{project.name}</span>
                    <Badge tone="neutral">devnet</Badge>
                    {isSelected ? <Badge tone="brand">Viewing</Badge> : null}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-[var(--fyxvo-text-muted)]">
                    {project.slug}
                  </div>
                  {project._count ? (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--fyxvo-text-muted)]">
                      <span>{formatInteger(project._count.requestLogs)} requests</span>
                      <span>{formatInteger(project._count.apiKeys)} keys</span>
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => portal.selectProject(project.id)}
                      className="text-xs text-[var(--fyxvo-brand)] hover:underline"
                    >
                      Load analytics
                    </button>
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] hover:underline"
                    >
                      View detailed analytics
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
