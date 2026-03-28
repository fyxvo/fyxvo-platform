"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { AddressLink } from "../../../components/address-link";
import { LoadingSkeleton } from "../../../components/loading-skeleton";
import { RetryBanner } from "../../../components/retry-banner";
import { AuthGate } from "../../../components/state-panels";
import {
  getOnchainSnapshot,
  getProject,
  getProjectAnalytics,
  getProjectRequestLogs,
  listApiKeys,
  listProjects,
} from "../../../lib/api";
import { usePortal } from "../../../lib/portal-context";
import type {
  OnchainSnapshot,
  PortalApiKey,
  PortalProject,
  ProjectAnalytics,
  ProjectDetail,
  ProjectRequestLogList,
} from "../../../lib/types";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

interface ProjectDetailState {
  project: ProjectDetail;
  onchain: OnchainSnapshot;
  analytics: ProjectAnalytics;
  apiKeys: PortalApiKey[];
  requests: ProjectRequestLogList;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const toneClass =
    normalized === "active"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : normalized === "pending"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)]";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>
      {status}
    </span>
  );
}

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

export default function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = use(params);
  const { token, setSelectedProject } = usePortal();
  const [state, setState] = useState<ProjectDetailState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const projects = await listProjects(token);
      const match = projects.find((project) => project.slug === slug);

      if (!match) {
        throw new Error(`Project "${slug}" was not found in this wallet workspace.`);
      }

      setSelectedProject(match as PortalProject);

      const [project, onchain, analytics, apiKeys, requests] = await Promise.all([
        getProject({ projectId: match.id, token }),
        getOnchainSnapshot({ projectId: match.id, token }),
        getProjectAnalytics({ projectId: match.id, token, range: "24h" }),
        listApiKeys({ projectId: match.id, token }),
        getProjectRequestLogs({ projectId: match.id, token, range: "24h", pageSize: 20 }),
      ]);

      setState({
        project,
        onchain,
        analytics,
        apiKeys,
        requests,
      });
    } catch (loadError) {
      setState(null);
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load the project workspace."
      );
    } finally {
      setLoading(false);
    }
  }, [setSelectedProject, slug, token]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  const totalStatusCount =
    state?.analytics.statusCodes.reduce((sum, entry) => sum + entry.count, 0) ?? 0;
  const successCount =
    state?.analytics.statusCodes
      .filter((entry) => entry.statusCode < 400)
      .reduce((sum, entry) => sum + entry.count, 0) ?? 0;
  const successRate =
    totalStatusCount > 0 ? `${((successCount / totalStatusCount) * 100).toFixed(1)}%` : "N/A";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <AuthGate message="Project detail requires an authenticated wallet session.">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                Project detail
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
                {state?.project.name ?? slug}
              </h1>
              {state?.project.description ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  {state.project.description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              {state?.project.status ? <StatusBadge status={state.project.status} /> : null}
              {state?.project.id ? (
                <Button asChild variant="secondary">
                  <Link href="/funding">Fund project</Link>
                </Button>
              ) : null}
            </div>
          </div>

          {error ? <RetryBanner message={error} onRetry={() => void loadProject()} /> : null}

          {loading && !state ? (
            <div className="space-y-4">
              <LoadingSkeleton className="h-28 w-full rounded-3xl" />
              <div className="grid gap-4 md:grid-cols-3">
                <LoadingSkeleton className="h-28 rounded-2xl" />
                <LoadingSkeleton className="h-28 rounded-2xl" />
                <LoadingSkeleton className="h-28 rounded-2xl" />
              </div>
              <LoadingSkeleton className="h-80 w-full rounded-3xl" />
            </div>
          ) : null}

          {state ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="SOL balance"
                  value={`${state.onchain.balanceSol.toFixed(4)} SOL`}
                  note="Treasury balance from the on-chain project snapshot."
                />
                <MetricCard
                  label="Requests"
                  value={state.analytics.totals.requestLogs.toLocaleString()}
                  note="Observed request logs for the selected project."
                />
                <MetricCard
                  label="Success rate"
                  value={successRate}
                  note={`Average latency ${state.analytics.latency.averageMs.toFixed(1)}ms`}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                  <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">On-chain state</h2>
                  <div className="mt-5 space-y-4 text-sm text-[var(--fyxvo-text-soft)]">
                    <p>
                      Project PDA: <AddressLink address={state.onchain.projectPda} />
                    </p>
                    <p>
                      Treasury PDA: <AddressLink address={state.onchain.treasuryPda} />
                    </p>
                    <p>Operator count: {state.onchain.operatorCount}</p>
                    <p>Observed request count: {state.onchain.requestCount.toLocaleString()}</p>
                    <p>Last updated: {new Date(state.onchain.updatedAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                  <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">API keys</h2>
                  {state.apiKeys.length > 0 ? (
                    <div className="mt-5 space-y-3">
                      {state.apiKeys.map((apiKey) => (
                        <div
                          key={apiKey.id}
                          className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-[var(--fyxvo-text)]">{apiKey.label}</p>
                            <StatusBadge status={apiKey.status} />
                          </div>
                          <p className="mt-2 font-mono text-xs text-[var(--fyxvo-text-muted)]">
                            {apiKey.prefix}...
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                            {apiKey.scopes.join(", ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Notice tone="warning" className="mt-5">
                      No API keys have been issued for this project yet.
                    </Notice>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Request log</h2>
                    <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
                      Latest request traces for the last 24 hours.
                    </p>
                  </div>
                  <p className="text-sm text-[var(--fyxvo-text-muted)]">
                    {state.requests.totalCount.toLocaleString()} records
                  </p>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--fyxvo-border)] text-left text-[var(--fyxvo-text-muted)]">
                        <th className="px-3 py-3 font-medium">Time</th>
                        <th className="px-3 py-3 font-medium">Route</th>
                        <th className="px-3 py-3 font-medium">Status</th>
                        <th className="px-3 py-3 font-medium">Latency</th>
                        <th className="px-3 py-3 font-medium">Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.requests.items.map((row) => (
                        <tr key={row.id} className="border-b border-[var(--fyxvo-border)] last:border-b-0">
                          <td className="px-3 py-3 text-[var(--fyxvo-text-soft)]">
                            {new Date(row.timestamp).toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-[var(--fyxvo-text)]">{row.route}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                row.success
                                  ? "bg-emerald-500/10 text-emerald-300"
                                  : "bg-rose-500/10 text-rose-300"
                              }`}
                            >
                              {row.statusCode}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-[var(--fyxvo-text-soft)]">
                            {row.latencyMs}ms
                          </td>
                          <td className="px-3 py-3 text-[var(--fyxvo-text-soft)]">
                            {row.mode ?? "standard"}
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
