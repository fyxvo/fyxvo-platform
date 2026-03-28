"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingSkeleton } from "../../../components/loading-skeleton";
import { RetryBanner } from "../../../components/retry-banner";
import { getAdminPlatformStats } from "../../../lib/api";
import { usePortal } from "../../../lib/portal-context";
import type { AdminPlatformStats } from "../../../lib/types";

export default function AdminPlatformPage() {
  const { token } = usePortal();
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      setStats(await getAdminPlatformStats(token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load platform stats.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
          Platform stats
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
          This view exposes the aggregate platform metrics returned by the backend, including recent
          signups, user totals, project totals, newsletter growth, and current traffic volume.
        </p>
      </div>

      {error ? <RetryBanner message={error} onRetry={loadStats} /> : null}

      {loading && !stats ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-32 rounded-[2rem]" />
          <LoadingSkeleton className="h-64 rounded-[2rem]" />
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Users
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">{stats.totalUsers}</p>
            </div>
            <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Projects
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">{stats.totalProjects}</p>
            </div>
            <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Requests today
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">{stats.requestsToday}</p>
            </div>
            <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Requests this week
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">{stats.requestsThisWeek}</p>
            </div>
            <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Newsletter
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">{stats.newsletterCount}</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
            <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Recent signups</h2>
            <div className="mt-4 space-y-3">
              {stats.recentSignups.length > 0 ? (
                stats.recentSignups.map((signup) => (
                  <div
                    key={`${signup.walletAddress}-${signup.createdAt}`}
                    className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                  >
                    <p className="font-mono text-sm text-[var(--fyxvo-text)]">{signup.walletAddress}</p>
                    <p className="mt-2 text-sm text-[var(--fyxvo-text-soft)]">
                      {new Date(signup.createdAt).toLocaleString()} · {signup.projectCount} project
                      {signup.projectCount === 1 ? "" : "s"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--fyxvo-text-soft)]">
                  No recent signups are currently returned by the API.
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
