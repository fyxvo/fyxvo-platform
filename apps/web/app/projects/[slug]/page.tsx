"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Modal, Notice } from "@fyxvo/ui";
import { AddressLink } from "../../../components/address-link";
import { LoadingSkeleton } from "../../../components/loading-skeleton";
import { RetryBanner } from "../../../components/retry-banner";
import { AuthGate } from "../../../components/state-panels";
import {
  cancelProjectSubscription,
  getOnchainSnapshot,
  getProject,
  getProjectAnalytics,
  getProjectRequestLogs,
  getProjectRequestTrace,
  getProjectSubscription,
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
  ProjectRequestTrace,
  ProjectSubscriptionSummary,
} from "../../../lib/types";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

interface ProjectCoreState {
  project: ProjectDetail;
  onchain: OnchainSnapshot;
  analytics: ProjectAnalytics;
  apiKeys: PortalApiKey[];
  subscription: ProjectSubscriptionSummary | null;
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

function getStatusTone(statusCode: number) {
  if (statusCode === 200) return "bg-emerald-500/10 text-emerald-300";
  if (statusCode === 429) return "bg-amber-500/10 text-amber-300";
  if (statusCode >= 400) return "bg-rose-500/10 text-rose-300";
  return "bg-sky-500/10 text-sky-300";
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = use(params);
  const { token, setSelectedProject } = usePortal();
  const [state, setState] = useState<ProjectCoreState | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<ProjectRequestLogList | null>(null);
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [trace, setTrace] = useState<ProjectRequestTrace | null>(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [subscriptionUpdating, setSubscriptionUpdating] = useState(false);

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
      setProjectId(match.id);
      setRequestsPage(1);

      const [project, onchain, analytics, apiKeys, subscription] = await Promise.all([
        getProject({ projectId: match.id, token }),
        getOnchainSnapshot({ projectId: match.id, token }),
        getProjectAnalytics({ projectId: match.id, token, range: "24h" }),
        listApiKeys({ projectId: match.id, token }),
        getProjectSubscription({ projectId: match.id, token }),
      ]);

      setState({
        project,
        onchain,
        analytics,
        apiKeys,
        subscription,
      });
    } catch (loadError) {
      setState(null);
      setProjectId(null);
      setRequests(null);
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load the project workspace."
      );
    } finally {
      setLoading(false);
    }
  }, [setSelectedProject, slug, token]);

  const loadRequests = useCallback(async () => {
    if (!token || !projectId) return;

    setRequestsLoading(true);
    try {
      const nextRequests = await getProjectRequestLogs({
        projectId,
        token,
        range: "24h",
        page: requestsPage,
        pageSize: 10,
      });
      setRequests(nextRequests);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load request traces."
      );
    } finally {
      setRequestsLoading(false);
    }
  }, [projectId, requestsPage, token]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const openTrace = useCallback(
    async (traceId: string) => {
      if (!token || !projectId) return;
      setTraceOpen(true);
      setTraceLoading(true);
      setTraceError(null);

      try {
        const item = await getProjectRequestTrace({
          projectId,
          traceId,
          token,
        });
        setTrace(item);
      } catch (loadError) {
        setTrace(null);
        setTraceError(
          loadError instanceof Error ? loadError.message : "Unable to load trace detail."
        );
      } finally {
        setTraceLoading(false);
      }
    },
    [projectId, token]
  );

  const totalStatusCount =
    state?.analytics.statusCodes.reduce((sum, entry) => sum + entry.count, 0) ?? 0;
  const successCount =
    state?.analytics.statusCodes
      .filter((entry) => entry.statusCode < 400)
      .reduce((sum, entry) => sum + entry.count, 0) ?? 0;
  const successRate =
    totalStatusCount > 0 ? `${((successCount / totalStatusCount) * 100).toFixed(1)}%` : "N/A";

  const traceHint = useMemo(() => {
    if (!trace?.fyxvoHint) return null;
    return JSON.stringify(trace.fyxvoHint, null, 2);
  }, [trace]);

  const subscription = state?.subscription ?? null;

  async function handleCancelSubscription() {
    if (!token || !projectId) return;
    setSubscriptionUpdating(true);
    setError(null);

    try {
      const nextSubscription = await cancelProjectSubscription({ projectId, token });
      setState((current) => (current ? { ...current, subscription: nextSubscription } : current));
    } catch (cancelError) {
      setError(
        cancelError instanceof Error ? cancelError.message : "Unable to cancel the subscription."
      );
    } finally {
      setSubscriptionUpdating(false);
    }
  }

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

              <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Billing</h2>
                    <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
                      Subscription status, in-period usage, and the next renewal window for this project.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary">
                      <Link href="/pricing">Upgrade plan</Link>
                    </Button>
                    {subscription ? (
                      <Button
                        type="button"
                        variant="ghost"
                        loading={subscriptionUpdating}
                        onClick={() => void handleCancelSubscription()}
                      >
                        Cancel plan
                      </Button>
                    ) : null}
                  </div>
                </div>

                {subscription ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Plan" value={subscription.plan} note={subscription.status} />
                    <MetricCard
                      label="Standard usage"
                      value={`${subscription.usage.standardRequestsUsed.toLocaleString()} / ${Number(subscription.requestsIncluded).toLocaleString()}`}
                      note="Requests used versus included in the current period."
                    />
                    <MetricCard
                      label="Priority usage"
                      value={`${subscription.usage.priorityRequestsUsed.toLocaleString()} / ${Number(subscription.priorityRequestsIncluded).toLocaleString()}`}
                      note="Priority relay usage versus included capacity."
                    />
                    <MetricCard
                      label="Next renewal"
                      value={new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      note={
                        subscription.cancelledAt
                          ? "Cancellation is scheduled for the end of the current period."
                          : "Automatic renewal will charge the project treasury if sufficient USDC is available."
                      }
                    />
                  </div>
                ) : (
                  <Notice tone="warning" className="mt-5">
                    This project is on treasury-funded pay-per-request billing right now. Open pricing
                    to activate a monthly plan.
                  </Notice>
                )}
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
                    {state.onchain.treasuryUsdcVault?.address ? (
                      <p>
                        Treasury USDC vault:{" "}
                        <AddressLink address={state.onchain.treasuryUsdcVault.address} />
                      </p>
                    ) : null}
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
                    {requests?.totalCount.toLocaleString() ?? 0} records
                  </p>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--fyxvo-border)] text-left text-[var(--fyxvo-text-muted)]">
                        <th className="px-3 py-3 font-medium">Time</th>
                        <th className="px-3 py-3 font-medium">Method</th>
                        <th className="px-3 py-3 font-medium">Route</th>
                        <th className="px-3 py-3 font-medium">Status</th>
                        <th className="px-3 py-3 font-medium">Duration</th>
                        <th className="px-3 py-3 font-medium">Trace</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestsLoading && !requests ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-[var(--fyxvo-text-muted)]">
                            Loading request traces…
                          </td>
                        </tr>
                      ) : requests?.items.length ? (
                        requests.items.map((row) => (
                          <tr key={row.id} className="border-b border-[var(--fyxvo-border)] last:border-b-0">
                            <td className="px-3 py-3 text-[var(--fyxvo-text-soft)]">
                              {new Date(row.timestamp).toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-[var(--fyxvo-text)]">{row.httpMethod}</td>
                            <td className="px-3 py-3 text-[var(--fyxvo-text)]">{row.route}</td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusTone(row.statusCode)}`}
                              >
                                {row.statusCode}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-[var(--fyxvo-text-soft)]">
                              {row.latencyMs}ms
                            </td>
                            <td className="px-3 py-3">
                              {row.traceId ? (
                                <button
                                  type="button"
                                  onClick={() => void openTrace(row.traceId!)}
                                  className="text-sm font-medium text-[var(--fyxvo-brand)] transition-colors hover:text-[var(--fyxvo-text)]"
                                >
                                  Open trace
                                </button>
                              ) : (
                                <span className="text-[var(--fyxvo-text-muted)]">Unavailable</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-[var(--fyxvo-text-muted)]">
                            No request traces have been recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[var(--fyxvo-text-muted)]">
                    Page {requests?.page ?? requestsPage} of {requests?.totalPages ?? 1}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={requestsLoading || requestsPage <= 1}
                      onClick={() => setRequestsPage((page) => Math.max(1, page - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={
                        requestsLoading ||
                        !requests ||
                        requestsPage >= requests.totalPages
                      }
                      onClick={() => setRequestsPage((page) => page + 1)}
                    >
                      Next page
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </AuthGate>

      <Modal
        open={traceOpen}
        onClose={() => {
          setTraceOpen(false);
          setTrace(null);
          setTraceError(null);
        }}
        title="Request trace"
        description="Inspect the exact request trace returned by the control plane."
      >
        {traceLoading ? (
          <div className="space-y-3">
            <LoadingSkeleton className="h-16 rounded-2xl" />
            <LoadingSkeleton className="h-40 rounded-2xl" />
          </div>
        ) : traceError ? (
          <Notice tone="danger">{traceError}</Notice>
        ) : trace ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 text-sm text-[var(--fyxvo-text-soft)]">
                <p className="font-medium text-[var(--fyxvo-text)]">{trace.method}</p>
                <p className="mt-2">{trace.route}</p>
                <p className="mt-2">Service: {trace.service}</p>
                <p className="mt-2">Duration: {trace.durationMs}ms</p>
              </div>
              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 text-sm text-[var(--fyxvo-text-soft)]">
                <p>
                  Status:{" "}
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusTone(trace.statusCode)}`}>
                    {trace.statusCode}
                  </span>
                </p>
                <p className="mt-2">Trace ID: {trace.requestId}</p>
                <p className="mt-2">Created: {new Date(trace.createdAt).toLocaleString()}</p>
                <p className="mt-2">Region: {trace.region ?? "Unknown"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 text-sm text-[var(--fyxvo-text-soft)]">
              <p>Mode: {trace.mode ?? "standard"}</p>
              <p className="mt-2">Upstream node: {trace.upstreamNode ?? "Unknown"}</p>
              <p className="mt-2">Request size: {trace.requestSize ?? 0} bytes</p>
              <p className="mt-2">Response size: {trace.responseSize ?? 0} bytes</p>
              <p className="mt-2">Cache hit: {trace.cacheHit === null ? "Unknown" : trace.cacheHit ? "Yes" : "No"}</p>
              <p className="mt-2">Simulated: {trace.simulated ? "Yes" : "No"}</p>
            </div>

            {traceHint ? (
              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-4">
                <p className="text-sm font-medium text-[var(--fyxvo-text)]">Hint payload</p>
                <pre className="mt-3 overflow-x-auto text-xs text-[var(--fyxvo-text-soft)]">
                  <code>{traceHint}</code>
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
