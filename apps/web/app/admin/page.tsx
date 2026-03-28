"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LoadingSkeleton } from "../../components/loading-skeleton";
import { RetryBanner } from "../../components/retry-banner";
import { JsonResponseView } from "../../components/json-response-view";
import { getAdminOverview } from "../../lib/api";
import { usePortal } from "../../lib/portal-context";
import type { AdminOverview } from "../../lib/types";

export default function AdminOverviewPage() {
  const { token } = usePortal();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      setOverview(await getAdminOverview(token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the admin overview.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
          Admin overview
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
          This page reflects the live control-plane overview returned by the backend, including
          worker health, protocol posture, recent operational activity, and the inbound demand
          queues for the network.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/operators"
          className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-4 py-2 text-sm text-[var(--fyxvo-text)] transition hover:border-[var(--fyxvo-brand)]"
        >
          Manage operators
        </Link>
        <Link
          href="/admin/platform"
          className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-4 py-2 text-sm text-[var(--fyxvo-text)] transition hover:border-[var(--fyxvo-brand)]"
        >
          Platform stats
        </Link>
        <Link
          href="/admin/errors"
          className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-4 py-2 text-sm text-[var(--fyxvo-text)] transition hover:border-[var(--fyxvo-brand)]"
        >
          Errors
        </Link>
        <Link
          href="/admin/feedback"
          className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-4 py-2 text-sm text-[var(--fyxvo-text)] transition hover:border-[var(--fyxvo-brand)]"
        >
          Feedback inbox
        </Link>
        <Link
          href="/admin/incidents"
          className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-4 py-2 text-sm text-[var(--fyxvo-text)] transition hover:border-[var(--fyxvo-brand)]"
        >
          Incidents
        </Link>
      </div>

      {error ? <RetryBanner message={error} onRetry={loadOverview} /> : null}

      {loading && !overview ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-32 rounded-[2rem]" />
          <LoadingSkeleton className="h-96 rounded-[2rem]" />
        </div>
      ) : overview ? (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Worker
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                {overview.worker.status}
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Interest submissions
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                {overview.interestSubmissions.total}
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Feedback inbox
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                {overview.feedbackSubmissions.open}
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Authority mode
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                {overview.protocol.authorityPlan.mode}
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Recent project activity</h2>
                <div className="mt-4 space-y-3">
                  {overview.recentProjectActivity.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                    >
                      <p className="text-sm font-medium text-[var(--fyxvo-text)]">
                        {item.method} {item.route}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                        {item.project?.name ?? "Platform-level event"} · status {item.statusCode} ·{" "}
                        {item.durationMs} ms
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Launch funnel</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Object.entries(overview.launchFunnel.counts).map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                        {key.replace(/([A-Z])/g, " $1")}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-[var(--fyxvo-text)]">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Treasury overview</h2>
                <div className="mt-4 space-y-3 text-sm text-[var(--fyxvo-text-soft)]">
                  <p>SOL balance: {overview.protocol.treasury.solBalance ?? "unknown"}</p>
                  <p>USDC balance: {overview.protocol.treasury.usdcBalance ?? "unknown"}</p>
                  <p>Protocol SOL fees owed: {overview.protocol.treasury.protocolSolFeesOwed ?? "0"}</p>
                  <p>Protocol USDC fees owed: {overview.protocol.treasury.protocolUsdcFeesOwed ?? "0"}</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Raw response</h2>
                <div className="mt-4">
                  <JsonResponseView value={overview} maxHeightClassName="max-h-[28rem]" />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
