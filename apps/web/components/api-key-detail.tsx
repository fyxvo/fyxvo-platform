"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Notice, Skeleton } from "@fyxvo/ui";
import { getApiKeyAnalytics, getErrorLog } from "../lib/api";
import { formatDuration, formatRelativeDate } from "../lib/format";
import { EndpointBuilder } from "./endpoint-builder";
import type { AnalyticsRange, ApiKeyAnalytics, ErrorLogEntry, PortalApiKey } from "../lib/types";

const RANGES: { label: string; value: AnalyticsRange }[] = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" }
];

function MiniBarChart({ buckets }: { readonly buckets: ApiKeyAnalytics["dailyBuckets"] }) {
  if (buckets.length === 0) {
    return <div className="flex h-16 items-center justify-center text-xs text-[var(--fyxvo-text-muted)]">No data</div>;
  }
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  return (
    <div className="flex h-16 items-end gap-1">
      {[...buckets].reverse().map((b) => (
        <div key={b.date} className="group relative flex-1">
          <div
            className="w-full rounded-t-sm bg-brand-500/40 transition group-hover:bg-brand-500/70"
            style={{ height: `${Math.max((b.count / maxCount) * 100, 8)}%` }}
            title={`${b.date}: ${b.count} requests (${b.errors} errors)`}
          />
        </div>
      ))}
    </div>
  );
}

export function ApiKeyDetail({
  apiKey,
  projectId,
  token,
  onRevoke
}: {
  readonly apiKey: PortalApiKey;
  readonly projectId: string;
  readonly token: string;
  readonly onRevoke: (apiKeyId: string) => void;
}) {
  const [analytics, setAnalytics] = useState<ApiKeyAnalytics | null>(null);
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [loading, setLoading] = useState(true);
  const [revokeConfirm, setRevokeConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getApiKeyAnalytics(projectId, apiKey.id, token, range),
      getErrorLog(projectId, token)
    ])
      .then(([a, e]) => {
        if (!cancelled) {
          setAnalytics(a);
          setErrors(e.filter((entry) => entry.apiKeyPrefix === apiKey.prefix).slice(0, 10));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAnalytics(null);
          setErrors([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [apiKey.id, apiKey.prefix, projectId, token, range]);

  const isRevoked = apiKey.status === "REVOKED";

  return (
    <div className="space-y-5">
      {/* Key metadata */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Prefix</p>
          <p className="mt-1 font-mono text-sm font-medium text-[var(--fyxvo-text)]">{apiKey.prefix}…</p>
        </div>
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Status</p>
          <div className="mt-1">
            <Badge tone={isRevoked ? "danger" : "success"}>{apiKey.status}</Badge>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Created</p>
          <p className="mt-1 text-sm text-[var(--fyxvo-text)]">{formatRelativeDate(apiKey.createdAt)}</p>
        </div>
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Last used</p>
          <p className="mt-1 text-sm text-[var(--fyxvo-text)]">
            {apiKey.lastUsedAt ? formatRelativeDate(apiKey.lastUsedAt) : "Never"}
          </p>
        </div>
      </div>

      {/* Scopes */}
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--fyxvo-text)]">Scopes</p>
        <div className="flex flex-wrap gap-1.5">
          {apiKey.scopes.map((scope) => (
            <Badge key={scope} tone="neutral">{scope}</Badge>
          ))}
        </div>
      </div>

      {/* Analytics */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-[var(--fyxvo-text)]">Usage analytics</p>
          <div className="flex gap-1 rounded-lg border border-[var(--fyxvo-border)] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition ${range === r.value ? "bg-brand-500 text-white" : "text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : analytics ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Total requests</p>
                <p className="mt-1 text-xl font-semibold text-[var(--fyxvo-text)]">{analytics.totalRequests.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Avg latency</p>
                <p className="mt-1 text-xl font-semibold text-[var(--fyxvo-text)]">{formatDuration(analytics.averageLatencyMs)}</p>
              </div>
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Error rate</p>
                <p className={`mt-1 text-xl font-semibold ${analytics.errorRate > 0.05 ? "text-rose-400" : "text-emerald-400"}`}>
                  {(analytics.errorRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
              <p className="mb-3 text-[10px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Requests per day</p>
              <MiniBarChart buckets={analytics.dailyBuckets} />
            </div>
          </div>
        ) : (
          <Notice tone="neutral" title="Analytics not available">
            Could not load per-key analytics. Send traffic through this key to see data here.
          </Notice>
        )}
      </div>

      {/* Recent errors */}
      {errors.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-[var(--fyxvo-text)]">Recent errors from this key</p>
          <div className="overflow-hidden rounded-xl border border-[var(--fyxvo-border)]">
            <table className="w-full text-xs">
              <thead className="border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-[var(--fyxvo-text-muted)]">Route</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--fyxvo-text-muted)]">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--fyxvo-text-muted)]">Latency</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--fyxvo-text-muted)]">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--fyxvo-border)]">
                {errors.map((entry) => (
                  <tr key={entry.id} className="text-[var(--fyxvo-text-soft)]">
                    <td className="px-3 py-2 font-mono">{entry.route}</td>
                    <td className="px-3 py-2">
                      <Badge tone={entry.statusCode >= 500 ? "danger" : "warning"}>{entry.statusCode}</Badge>
                    </td>
                    <td className="px-3 py-2">{formatDuration(entry.durationMs)}</td>
                    <td className="px-3 py-2">{formatRelativeDate(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Endpoint builder */}
      {!isRevoked && (
        <div>
          <p className="mb-3 text-xs font-medium text-[var(--fyxvo-text)]">Endpoint builder</p>
          <EndpointBuilder apiKey={`${apiKey.prefix}…`} />
        </div>
      )}

      {/* Revoke */}
      {!isRevoked && (
        <div className="border-t border-[var(--fyxvo-border)] pt-4">
          {revokeConfirm ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setRevokeConfirm(false);
                  onRevoke(apiKey.id);
                }}
              >
                Confirm revoke
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRevokeConfirm(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRevokeConfirm(true)}
            >
              Revoke key
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
