"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge, Button } from "@fyxvo/ui";
import { CopyButton } from "../../../components/copy-button";
import { getProjectRequestLogs } from "../../../lib/api";
import { formatDuration } from "../../../lib/format";
import type { ProjectRequestLogItem } from "../../../lib/types";

interface RealtimeFeedProps {
  readonly projectId: string;
  readonly token: string;
}

type StatusFilter = "all" | "success" | "error";
type GroupedEntry = {
  key: string;
  count: number;
  latestAt: string;
  item: ProjectRequestLogItem;
};

function relativeTime(isoDate: string, nowMs: number): string {
  const diffMs = Math.max(0, nowMs - new Date(isoDate).getTime());
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export function RealtimeFeed({ projectId, token }: RealtimeFeedProps) {
  const [requests, setRequests] = useState<ProjectRequestLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [maxItems, setMaxItems] = useState(50);
  const [paused, setPaused] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [newIds, setNewIds] = useState<string[]>([]);
  const latestSeenIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollDeltaRef = useRef<number | null>(null);

  useEffect(() => {
    const tickInterval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(tickInterval);
  }, []);

  useEffect(() => {
    if (pendingScrollDeltaRef.current == null || !containerRef.current) {
      return;
    }
    containerRef.current.scrollTop += pendingScrollDeltaRef.current;
    pendingScrollDeltaRef.current = null;
  }, [requests]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (paused) return;
      try {
        const container = containerRef.current;
        const previousHeight = container?.scrollHeight ?? 0;
        const shouldPreserve = container ? container.scrollTop > 16 : false;
        const next = await getProjectRequestLogs(projectId, token, {
          page: 1,
          pageSize: maxItems,
          range: "24h",
        });
        if (cancelled) return;
        const nextLatestId = next.items[0]?.id ?? null;
        if (latestSeenIdRef.current && nextLatestId && nextLatestId !== latestSeenIdRef.current) {
          const additions = next.items
            .filter((item) => item.id !== latestSeenIdRef.current)
            .slice(0, 5)
            .map((item) => item.id);
          setNewIds(additions);
          setPulseActive(true);
          window.setTimeout(() => setPulseActive(false), 1400);
          window.setTimeout(() => setNewIds([]), 2400);
        }
        latestSeenIdRef.current = nextLatestId;
        if (shouldPreserve && container) {
          const nextHeightEstimate = previousHeight + Math.max(0, next.items.length - requests.length) * 52;
          pendingScrollDeltaRef.current = nextHeightEstimate - previousHeight;
        }
        setRequests(next.items);
        setError(null);
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Network error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void poll();
    const pollTimer = window.setInterval(() => void poll(), 5000);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
    };
  }, [maxItems, paused, projectId, requests.length, token]);

  const filtered = useMemo(() => {
    return requests.filter((request) => {
      if (statusFilter === "success") return request.statusCode < 400;
      if (statusFilter === "error") return request.statusCode >= 400;
      return true;
    });
  }, [requests, statusFilter]);

  const grouped = useMemo<GroupedEntry[]>(() => {
    const items: GroupedEntry[] = [];
    for (const request of filtered) {
      const previous = items[items.length - 1];
      const withinBurst =
        previous && new Date(previous.latestAt).getTime() - new Date(request.timestamp).getTime() <= 15_000;
      if (
        previous &&
        withinBurst &&
        previous.item.route === request.route &&
        previous.item.mode === request.mode &&
        previous.item.statusCode === request.statusCode
      ) {
        previous.count += 1;
        continue;
      }
      items.push({
        key: request.id,
        count: 1,
        latestAt: request.timestamp,
        item: request,
      });
    }
    return items;
  }, [filtered]);

  const arrivalsLastMinute = requests.filter(
    (request) => nowMs - new Date(request.timestamp).getTime() <= 60_000
  ).length;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/95 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Status</span>
            {(["all", "success", "error"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  statusFilter === filter
                    ? "bg-[var(--fyxvo-brand)]/20 text-[var(--fyxvo-brand)]"
                    : "text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--fyxvo-text-muted)]">
            Max items
            <select
              value={String(maxItems)}
              onChange={(event) => setMaxItems(Number(event.target.value))}
              className="h-8 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-2 text-xs text-[var(--fyxvo-text)]"
            >
              {[20, 50, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <Button variant="secondary" size="sm" onClick={() => setPaused((current) => !current)}>
            {paused ? "Resume stream" : "Pause stream"}
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <span className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1 text-xs text-[var(--fyxvo-text-muted)]">
              {arrivalsLastMinute} request{arrivalsLastMinute === 1 ? "" : "s"} in the last minute
            </span>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 ${pulseActive ? "animate-ping" : ""}`}
                />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              <span className="text-xs text-[var(--fyxvo-text-muted)]">
                {paused ? "Stream paused" : pulseActive ? "New requests detected" : "Polling every 5s"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-lg bg-[var(--fyxvo-panel-soft)]" />
          ))}
        </div>
      ) : error !== null ? (
        <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-6 text-center">
          <p className="text-sm text-[var(--fyxvo-text-muted)]">Error loading feed: {error}</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-10 text-center">
          <p className="text-sm text-[var(--fyxvo-text-muted)]">
            {requests.length === 0
              ? "No recent traffic yet. Open the playground or send a real integration call to start the feed."
              : "No requests match the current filter."}
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="max-h-[40rem] overflow-auto rounded-xl border border-[var(--fyxvo-border)]">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="sticky top-0 border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Method</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Mode</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Latency</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Trace</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Region</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--fyxvo-border)]">
              {grouped.map((entry) => {
                const request = entry.item;
                const isNew = newIds.includes(request.id);
                return (
                  <tr
                    key={entry.key}
                    className={`bg-[var(--fyxvo-bg)] transition-colors hover:bg-[var(--fyxvo-panel-soft)] ${isNew ? "animate-[pulse_1.8s_ease-out_1]" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-[var(--fyxvo-text)]">{request.route}</span>
                        {entry.count > 1 ? <Badge tone="neutral">{entry.count} grouped</Badge> : null}
                        {request.simulated ? <Badge tone="warning">simulated</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={request.mode === "priority" ? "warning" : "neutral"}>{request.mode ?? "n/a"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={request.success ? "success" : "danger"}>{request.statusCode}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[var(--fyxvo-text-muted)]">{formatDuration(request.latencyMs)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {request.traceId ? (
                          <>
                            <code className="font-mono text-xs text-[var(--fyxvo-text-muted)]">{request.traceId.slice(0, 8)}</code>
                            <CopyButton value={request.traceId} label="Copy trace ID" className="h-7 px-2 text-[10px]" />
                            <Link href={`/playground?method=traceLookup&traceId=${encodeURIComponent(request.traceId)}`} className="text-xs font-medium text-[var(--fyxvo-brand)] hover:underline">
                              Trace lookup
                            </Link>
                          </>
                        ) : (
                          <span className="text-xs text-[var(--fyxvo-text-muted)]">n/a</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--fyxvo-text-muted)]">{request.region ?? request.upstreamNode ?? "Default"}</td>
                    <td className="px-4 py-3 text-right text-xs text-[var(--fyxvo-text-muted)]">{relativeTime(request.timestamp, nowMs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
