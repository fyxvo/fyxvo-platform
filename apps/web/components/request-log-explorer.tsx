"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Modal, Notice } from "@fyxvo/ui";
import { CopyButton } from "./copy-button";
import { downloadProjectRequestLogs, getProjectRequestLogs } from "../lib/api";
import { formatDuration, formatInteger, formatRelativeDate } from "../lib/format";
import type { ProjectRequestLogItem, RequestLogRange } from "../lib/types";

const RANGE_OPTIONS: readonly RequestLogRange[] = ["1h", "6h", "24h", "7d", "30d"];

type ExplorerFilters = {
  range: RequestLogRange;
  method: string;
  status: "all" | "success" | "error";
  apiKey: string;
  mode: "all" | "standard" | "priority";
  simulatedOnly: boolean;
  errorsOnly: boolean;
  search: string;
  page: number;
  pageSize: number;
};

const DEFAULT_FILTERS: ExplorerFilters = {
  range: "24h",
  method: "",
  status: "all",
  apiKey: "",
  mode: "all",
  simulatedOnly: false,
  errorsOnly: false,
  search: "",
  page: 1,
  pageSize: 50,
};

function readFilters(prefix: string): ExplorerFilters {
  if (typeof window === "undefined") {
    return DEFAULT_FILTERS;
  }

  const params = new URLSearchParams(window.location.search);
  const read = (key: keyof ExplorerFilters) => params.get(`${prefix}-${key}`);
  const range = read("range");
  const status = read("status");
  const mode = read("mode");
  const page = Number(read("page") ?? DEFAULT_FILTERS.page);
  const pageSize = Number(read("pageSize") ?? DEFAULT_FILTERS.pageSize);

  return {
    range: RANGE_OPTIONS.includes((range ?? "") as RequestLogRange) ? (range as RequestLogRange) : DEFAULT_FILTERS.range,
    method: read("method") ?? "",
    status: status === "success" || status === "error" ? status : DEFAULT_FILTERS.status,
    apiKey: read("apiKey") ?? "",
    mode: mode === "standard" || mode === "priority" ? mode : DEFAULT_FILTERS.mode,
    simulatedOnly: read("simulatedOnly") === "true",
    errorsOnly: read("errorsOnly") === "true",
    search: read("search") ?? "",
    page: Number.isFinite(page) && page > 0 ? page : DEFAULT_FILTERS.page,
    pageSize: Number.isFinite(pageSize) && [20, 50, 100].includes(pageSize) ? pageSize : DEFAULT_FILTERS.pageSize,
  };
}

function writeFilters(prefix: string, pathname: string, filters: ExplorerFilters) {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  for (const key of Object.keys(DEFAULT_FILTERS) as Array<keyof ExplorerFilters>) {
    params.delete(`${prefix}-${key}`);
  }

  const entries: Array<[string, string | number | boolean]> = [
    ["range", filters.range],
    ["method", filters.method],
    ["status", filters.status],
    ["apiKey", filters.apiKey],
    ["mode", filters.mode],
    ["simulatedOnly", filters.simulatedOnly],
    ["errorsOnly", filters.errorsOnly],
    ["search", filters.search],
    ["page", filters.page],
    ["pageSize", filters.pageSize],
  ];

  for (const [key, value] of entries) {
    const stringValue = String(value);
    if (
      stringValue.length > 0 &&
      stringValue !== "false" &&
      stringValue !== "all" &&
      stringValue !== String((DEFAULT_FILTERS as Record<string, unknown>)[key])
    ) {
      params.set(`${prefix}-${key}`, stringValue);
    }
  }

  const query = params.toString();
  const nextUrl = query.length > 0 ? `${pathname}?${query}` : pathname;
  window.history.replaceState(null, "", nextUrl);
}

function renderHint(value: unknown) {
  if (!value) {
    return "None";
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

export function RequestLogExplorer({
  projectId,
  token,
  title = "Request log explorer",
  description = "Search, filter, export, and inspect request traces for this project.",
  queryPrefix = "logs",
}: {
  readonly projectId: string;
  readonly token: string;
  readonly title?: string;
  readonly description?: string;
  readonly queryPrefix?: string;
}) {
  const pathname = usePathname();
  const [filters, setFilters] = useState<ExplorerFilters>(() => readFilters(queryPrefix));
  const [data, setData] = useState<{ items: ProjectRequestLogItem[]; totalCount: number; totalPages: number }>({
    items: [],
    totalCount: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProjectRequestLogItem | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const exportAnchorRef = useRef<HTMLDivElement | null>(null);

  function updateFilters(next: ExplorerFilters | ((current: ExplorerFilters) => ExplorerFilters)) {
    setLoading(true);
    setError(null);
    setFilters(next);
  }

  useEffect(() => {
    writeFilters(queryPrefix, pathname, filters);
  }, [filters, pathname, queryPrefix]);

  useEffect(() => {
    let cancelled = false;
    getProjectRequestLogs(projectId, token, {
      range: filters.range,
      ...(filters.method ? { method: filters.method } : {}),
      ...(filters.status !== "all" ? { status: filters.status } : {}),
      ...(filters.apiKey ? { apiKey: filters.apiKey } : {}),
      ...(filters.mode !== "all" ? { mode: filters.mode } : {}),
      ...(filters.simulatedOnly ? { simulatedOnly: true } : {}),
      ...(filters.errorsOnly ? { errorsOnly: true } : {}),
      ...(filters.search ? { search: filters.search } : {}),
      page: filters.page,
      pageSize: filters.pageSize,
    })
      .then((next) => {
        if (cancelled) return;
        setData({
          items: next.items,
          totalCount: next.totalCount,
          totalPages: next.totalPages,
        });
      })
      .catch((nextError) => {
        if (cancelled) return;
        setError(nextError instanceof Error ? nextError.message : "Unable to load request logs.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters, projectId, token]);

  const pageSummary = useMemo(() => {
    if (data.totalCount === 0) {
      return "No requests in this range yet.";
    }
    const start = (filters.page - 1) * filters.pageSize + 1;
    const end = Math.min(data.totalCount, start + data.items.length - 1);
    return `Showing ${formatInteger(start)}-${formatInteger(end)} of ${formatInteger(data.totalCount)} requests.`;
  }, [data, filters.page, filters.pageSize]);

  async function exportLogs(format: "csv" | "json") {
    const blob = await downloadProjectRequestLogs(projectId, token, format, {
      range: filters.range,
      ...(filters.method ? { method: filters.method } : {}),
      ...(filters.status !== "all" ? { status: filters.status } : {}),
      ...(filters.apiKey ? { apiKey: filters.apiKey } : {}),
      ...(filters.mode !== "all" ? { mode: filters.mode } : {}),
      ...(filters.simulatedOnly ? { simulatedOnly: true } : {}),
      ...(filters.errorsOnly ? { errorsOnly: true } : {}),
      ...(filters.search ? { search: filters.search } : {}),
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `fyxvo-request-logs.${format}`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function copyShareUrl() {
    await navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 1200);
  }

  return (
    <>
      <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => void exportLogs("csv")}>
                Export CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void exportLogs("json")}>
                Export JSON
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void copyShareUrl()}>
                {shareCopied ? "Copied URL" : "Copy filtered URL"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="sticky top-0 z-10 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/95 p-4 backdrop-blur">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1 text-xs text-[var(--fyxvo-text-muted)]">
                <span>Time range</span>
                <select
                  value={filters.range}
                  onChange={(event) => updateFilters((current) => ({ ...current, range: event.target.value as RequestLogRange, page: 1 }))}
                  className="h-10 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 text-sm text-[var(--fyxvo-text)]"
                >
                  {RANGE_OPTIONS.map((range) => (
                    <option key={range} value={range}>
                      {range}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-[var(--fyxvo-text-muted)]">
                <span>Method</span>
                <input
                  value={filters.method}
                  onChange={(event) => updateFilters((current) => ({ ...current, method: event.target.value, page: 1 }))}
                  placeholder="getLatestBlockhash"
                  className="h-10 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 text-sm text-[var(--fyxvo-text)]"
                />
              </label>
              <label className="space-y-1 text-xs text-[var(--fyxvo-text-muted)]">
                <span>Status</span>
                <select
                  value={filters.status}
                  onChange={(event) => updateFilters((current) => ({ ...current, status: event.target.value as ExplorerFilters["status"], page: 1 }))}
                  className="h-10 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 text-sm text-[var(--fyxvo-text)]"
                >
                  <option value="all">All</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-[var(--fyxvo-text-muted)]">
                <span>API key prefix</span>
                <input
                  value={filters.apiKey}
                  onChange={(event) => updateFilters((current) => ({ ...current, apiKey: event.target.value, page: 1 }))}
                  placeholder="fyxvo_live_"
                  className="h-10 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 text-sm text-[var(--fyxvo-text)]"
                />
              </label>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto_auto]">
              <label className="space-y-1 text-xs text-[var(--fyxvo-text-muted)]">
                <span>Mode</span>
                <select
                  value={filters.mode}
                  onChange={(event) => updateFilters((current) => ({ ...current, mode: event.target.value as ExplorerFilters["mode"], page: 1 }))}
                  className="h-10 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 text-sm text-[var(--fyxvo-text)]"
                >
                  <option value="all">All modes</option>
                  <option value="standard">Standard</option>
                  <option value="priority">Priority</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-[var(--fyxvo-text-muted)]">
                <span>Search</span>
                <input
                  value={filters.search}
                  onChange={(event) => updateFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
                  placeholder="Trace ID, method, upstream node"
                  className="h-10 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 text-sm text-[var(--fyxvo-text)]"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--fyxvo-text)]">
                <input
                  type="checkbox"
                  checked={filters.simulatedOnly}
                  onChange={(event) => updateFilters((current) => ({ ...current, simulatedOnly: event.target.checked, page: 1 }))}
                />
                Simulated only
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--fyxvo-text)]">
                <input
                  type="checkbox"
                  checked={filters.errorsOnly}
                  onChange={(event) => updateFilters((current) => ({ ...current, errorsOnly: event.target.checked, page: 1 }))}
                />
                Errors only
              </label>
              <label className="space-y-1 text-xs text-[var(--fyxvo-text-muted)]">
                <span>Page size</span>
                <select
                  value={String(filters.pageSize)}
                  onChange={(event) => updateFilters((current) => ({ ...current, pageSize: Number(event.target.value), page: 1 }))}
                  className="h-10 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 text-sm text-[var(--fyxvo-text)]"
                >
                  {[20, 50, 100].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--fyxvo-text-muted)]">
            <span>{pageSummary}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => updateFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
              >
                Previous
              </Button>
              <span>Page {filters.page} / {data.totalPages}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={filters.page >= data.totalPages}
                onClick={() => updateFilters((current) => ({ ...current, page: Math.min(data.totalPages, current.page + 1) }))}
              >
                Next
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-xl bg-[var(--fyxvo-panel-soft)]" />
              ))}
            </div>
          ) : error ? (
            <Notice tone="warning" title="Unable to load request logs">
              {error}
            </Notice>
          ) : data.items.length === 0 ? (
            <Notice tone="neutral" title="No matching requests">
              Adjust the filters, widen the time range, or send traffic through the selected project to populate the explorer.
            </Notice>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--fyxvo-border)]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--fyxvo-panel-soft)] text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                    <tr>
                      <th className="px-3 py-3 text-left">Timestamp</th>
                      <th className="px-3 py-3 text-left">Method</th>
                      <th className="px-3 py-3 text-left">Mode</th>
                      <th className="px-3 py-3 text-right">Latency</th>
                      <th className="px-3 py-3 text-left">Result</th>
                      <th className="px-3 py-3 text-left">Status</th>
                      <th className="px-3 py-3 text-left">API key</th>
                      <th className="px-3 py-3 text-left">Trace ID</th>
                      <th className="px-3 py-3 text-left">Simulated</th>
                      <th className="px-3 py-3 text-left">Upstream</th>
                      <th className="px-3 py-3 text-left">Region</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--fyxvo-border)]">
                    {data.items.map((item) => (
                      <tr
                        key={item.id}
                        className="cursor-pointer bg-[var(--fyxvo-bg)] transition hover:bg-[var(--fyxvo-panel-soft)]"
                        onClick={() => setSelected(item)}
                      >
                        <td className="px-3 py-3 text-[var(--fyxvo-text-muted)]">{formatRelativeDate(item.timestamp)}</td>
                        <td className="px-3 py-3">
                          <div className="font-mono text-xs text-[var(--fyxvo-text)]">{item.route}</div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone={item.mode === "priority" ? "warning" : "neutral"}>{item.mode ?? "n/a"}</Badge>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs text-[var(--fyxvo-text-muted)]">{formatDuration(item.latencyMs)}</td>
                        <td className="px-3 py-3">
                          <Badge tone={item.success ? "success" : "danger"}>{item.success ? "success" : "error"}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone={item.statusCode < 400 ? "success" : "warning"}>{item.statusCode}</Badge>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-[var(--fyxvo-text-muted)]">{item.apiKeyPrefix ?? "n/a"}</td>
                        <td className="px-3 py-3 font-mono text-xs text-[var(--fyxvo-text-muted)]">{item.traceId ? item.traceId.slice(0, 8) : "n/a"}</td>
                        <td className="px-3 py-3">{item.simulated ? "Yes" : "No"}</td>
                        <td className="px-3 py-3 text-[var(--fyxvo-text-muted)]">{item.upstreamNode ?? "Managed routing"}</td>
                        <td className="px-3 py-3 text-[var(--fyxvo-text-muted)]">{item.region ?? "Default"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div ref={exportAnchorRef} />
        </CardContent>
      </Card>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Trace ${selected.traceId ?? selected.id}` : "Request details"}
        {...(selected
          ? { description: "Full request record with trace lookup handoff and response metadata." }
          : {})}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-3">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Method</div>
                <div className="mt-2 font-mono text-sm text-[var(--fyxvo-text)]">{selected.route}</div>
              </div>
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-3">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Trace ID</div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <code className="truncate font-mono text-xs text-[var(--fyxvo-text)]">{selected.traceId ?? "Unavailable"}</code>
                  {selected.traceId ? <CopyButton value={selected.traceId} className="shrink-0" /> : null}
                </div>
              </div>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ["Timestamp", formatRelativeDate(selected.timestamp)],
                ["HTTP method", selected.httpMethod],
                ["Mode", selected.mode ?? "n/a"],
                ["Status code", String(selected.statusCode)],
                ["Latency", formatDuration(selected.latencyMs)],
                ["Simulated", selected.simulated ? "Yes" : "No"],
                ["Cache hit", selected.cacheHit == null ? "Unknown" : selected.cacheHit ? "Yes" : "No"],
                ["API key", selected.apiKeyPrefix ?? "n/a"],
                ["Request size", selected.requestSize != null ? `${formatInteger(selected.requestSize)} bytes` : "n/a"],
                ["Response size", selected.responseSize != null ? `${formatInteger(selected.responseSize)} bytes` : "n/a"],
                ["Upstream node", selected.upstreamNode ?? "Managed routing"],
                ["Region", selected.region ?? "Default"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-3">
                  <dt className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">{label}</dt>
                  <dd className="mt-2 text-sm text-[var(--fyxvo-text)]">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-3">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">fyxvo_hint</div>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-[var(--fyxvo-text-soft)]">{renderHint(selected.fyxvoHint)}</pre>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.traceId ? (
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/playground?method=traceLookup&traceId=${encodeURIComponent(selected.traceId)}`}>
                    Open trace lookup
                  </Link>
                </Button>
              ) : null}
              {selected.traceId ? <CopyButton value={selected.traceId} label="Copy trace ID" /> : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
