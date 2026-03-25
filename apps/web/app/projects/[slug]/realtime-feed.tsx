"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@fyxvo/ui";
import { webEnv } from "../../../lib/env";
import type { ProjectAnalytics } from "../../../lib/types";

type RecentRequest = ProjectAnalytics["recentRequests"][number];

interface RealtimeFeedProps {
  readonly projectId: string;
  readonly token: string;
}

type StatusFilter = "all" | "success" | "error";

function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export function RealtimeFeed({ projectId, token }: RealtimeFeedProps) {
  const [requests, setRequests] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pulseActive, setPulseActive] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestSeenIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Force re-render every second to update relative timestamps
    const tickInterval = setInterval(() => {
      setTick((n) => n + 1);
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(tickInterval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          new URL(`/v1/analytics/projects/${projectId}`, webEnv.apiBaseUrl),
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) {
          if (!cancelled) setError(`API returned ${res.status}`);
          return;
        }
        const json = (await res.json()) as { item: ProjectAnalytics };
        if (!cancelled) {
          const nextRequests = json.item.recentRequests ?? [];
          const nextLatestId = nextRequests[0]?.id ?? null;
          if (latestSeenIdRef.current && nextLatestId && nextLatestId !== latestSeenIdRef.current) {
            setPulseActive(true);
            window.setTimeout(() => setPulseActive(false), 1400);
          }
          latestSeenIdRef.current = nextLatestId;
          setRequests(nextRequests);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Network error");
          setLoading(false);
        }
      }
    }

    void poll();
    intervalRef.current = setInterval(() => void poll(), 5000);

    return () => {
      cancelled = true;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [projectId, token]);

  const filtered = requests.filter((r) => {
    if (statusFilter === "success") return r.statusCode < 400;
    if (statusFilter === "error") return r.statusCode >= 400;
    return true;
  });
  const arrivalsLastMinute = requests.filter(
    (request) => nowMs - new Date(request.createdAt).getTime() <= 60_000
  ).length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)] mr-1">
            Status
          </span>
          {(["all", "success", "error"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                statusFilter === f
                  ? "bg-brand-500/20 text-[var(--fyxvo-brand)]"
                  : "text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1 text-xs text-[var(--fyxvo-text-muted)]">
            {arrivalsLastMinute} request{arrivalsLastMinute === 1 ? "" : "s"} in the last minute
          </span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 ${
                  pulseActive ? "animate-ping" : ""
                }`}
              />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            <span className="text-xs text-[var(--fyxvo-text-muted)]">
              {pulseActive ? "New request detected" : "Polling every 5s"}
            </span>
          </div>
        </div>
      </div>

      {/* Notice about endpoint */}
      <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2.5">
        <p className="text-xs text-[var(--fyxvo-text-muted)]">
          Showing recent requests from the analytics endpoint. A dedicated real-time request log endpoint would enable live streaming.
        </p>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--fyxvo-panel-soft)]" />
          ))}
        </div>
      ) : error !== null ? (
        <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-6 text-center">
          <p className="text-sm text-[var(--fyxvo-text-muted)]">Error loading feed: {error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-10 text-center">
          <p className="text-sm text-[var(--fyxvo-text-muted)]">
            {requests.length === 0
              ? "No requests recorded yet. Send traffic to populate this feed."
              : "No requests match the current filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--fyxvo-border)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Method / Route
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Status
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Duration
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--fyxvo-border)]">
              {filtered.map((req) => (
                <tr key={req.id} className="bg-[var(--fyxvo-bg)] hover:bg-[var(--fyxvo-panel-soft)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[var(--fyxvo-panel-soft)] px-1.5 py-0.5 font-mono text-xs uppercase tracking-wide text-[var(--fyxvo-text-muted)]">
                        {req.method}
                      </span>
                      <span className="font-mono text-xs text-[var(--fyxvo-text)]">{req.route}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={req.statusCode < 400 ? "success" : "danger"}>
                      {req.statusCode}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-[var(--fyxvo-text-muted)]">
                    {req.durationMs}ms
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-[var(--fyxvo-text-muted)]">
                    {relativeTime(req.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
