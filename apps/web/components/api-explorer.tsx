"use client";

import { useState } from "react";
import { Button } from "@fyxvo/ui";
import { webEnv } from "../lib/env";
import { CopyButton } from "./copy-button";

interface EndpointGroup {
  label: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  requiresAuth: boolean;
  bodyTemplate?: string;
}

const ENDPOINT_GROUPS: EndpointGroup[] = [
  {
    label: "Health check",
    method: "GET",
    path: "/health",
    description: "Check API service health and database connectivity.",
    requiresAuth: false,
  },
  {
    label: "Auth challenge",
    method: "POST",
    path: "/v1/auth/challenge",
    description: "Get a sign challenge for a wallet address.",
    requiresAuth: false,
    bodyTemplate: JSON.stringify({ walletAddress: "YOUR_WALLET_ADDRESS" }, null, 2),
  },
  {
    label: "List projects",
    method: "GET",
    path: "/v1/projects",
    description: "List all projects owned by the authenticated user.",
    requiresAuth: true,
  },
  {
    label: "Analytics overview",
    method: "GET",
    path: "/v1/analytics/overview",
    description: "Get aggregate request counts, latency, and service breakdown.",
    requiresAuth: true,
  },
  {
    label: "Network stats",
    method: "GET",
    path: "/v1/network/stats",
    description: "Get public network statistics (no auth required).",
    requiresAuth: false,
  },
  {
    label: "Service status",
    method: "GET",
    path: "/v1/status",
    description: "Get gateway status including pricing, nodes, and protocol readiness.",
    requiresAuth: false,
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "text-[var(--fyxvo-success)] bg-emerald-500/10",
  POST: "text-blue-500 bg-blue-500/10",
  PATCH: "text-[var(--fyxvo-warning)] bg-amber-500/10",
  DELETE: "text-[var(--fyxvo-danger)] bg-rose-500/10",
};

export function ApiExplorer({ token }: { token?: string }) {
  const [selected, setSelected] = useState<EndpointGroup>(ENDPOINT_GROUPS[0]!);
  const [bearerToken, setBearerToken] = useState(token ?? "");
  const [body, setBody] = useState(selected.bodyTemplate ?? "");
  const [response, setResponse] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  function selectEndpoint(ep: EndpointGroup) {
    setSelected(ep);
    setBody(ep.bodyTemplate ?? "");
    setResponse(null);
    setStatus(null);
    setDurationMs(null);
  }

  async function runRequest() {
    setLoading(true);
    setResponse(null);
    setStatus(null);
    setDurationMs(null);
    const start = Date.now();
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (selected.requiresAuth && bearerToken) {
        headers["authorization"] = `Bearer ${bearerToken}`;
      }
      const fetchInit: RequestInit = {
        method: selected.method,
        headers,
      };
      if (selected.method !== "GET" && body) {
        fetchInit.body = body;
      }
      const res = await fetch(new URL(selected.path, webEnv.apiBaseUrl), fetchInit);
      const ms = Date.now() - start;
      setDurationMs(ms);
      setStatus(res.status);
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const json: unknown = await res.json();
        setResponse(JSON.stringify(json, null, 2));
      } else {
        setResponse(await res.text());
      }
    } catch (err) {
      setDurationMs(Date.now() - start);
      setResponse(err instanceof Error ? err.message : "Request failed");
      setStatus(0);
    } finally {
      setLoading(false);
    }
  }

  const curlSnippet = [
    `curl ${new URL(selected.path, webEnv.apiBaseUrl).href}`,
    selected.method !== "GET" ? `  -X ${selected.method}` : null,
    `  -H "Content-Type: application/json"`,
    selected.requiresAuth ? `  -H "Authorization: Bearer YOUR_TOKEN"` : null,
    selected.method !== "GET" && body ? `  -d '${body.replace(/\n/g, " ")}'` : null,
  ]
    .filter(Boolean)
    .join(" \\\n");

  return (
    <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] overflow-hidden">
      <div className="border-b border-[var(--fyxvo-border)] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">API Explorer</p>
      </div>
      <div className="grid lg:grid-cols-[240px_1fr]">
        {/* Endpoint list */}
        <div className="border-b lg:border-b-0 lg:border-r border-[var(--fyxvo-border)] p-3 space-y-1">
          {ENDPOINT_GROUPS.map((ep) => (
            <button
              key={ep.path}
              type="button"
              onClick={() => selectEndpoint(ep)}
              className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                selected.path === ep.path
                  ? "bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-text)]"
                  : "text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-bg)] hover:text-[var(--fyxvo-text)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${METHOD_COLORS[ep.method] ?? ""}`}>
                  {ep.method}
                </span>
                <span className="text-xs font-medium truncate">{ep.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Request / response pane */}
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-2.5">
              <span className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${METHOD_COLORS[selected.method] ?? ""}`}>
                {selected.method}
              </span>
              <code className="flex-1 text-sm text-[var(--fyxvo-text)] truncate">{selected.path}</code>
              {status !== null && (
                <span className={`text-xs font-mono font-semibold ${status >= 200 && status < 300 ? "text-emerald-500" : "text-rose-500"}`}>
                  {status} {durationMs !== null ? `· ${durationMs}ms` : ""}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-[var(--fyxvo-text-muted)]">{selected.description}</p>
          </div>

          {selected.requiresAuth && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--fyxvo-text-muted)]">Bearer token</label>
              <input
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="Paste your JWT token here"
                className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2 font-mono text-xs text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
              />
            </div>
          )}

          {selected.bodyTemplate !== undefined && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--fyxvo-text-muted)]">Request body (JSON)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2 font-mono text-xs text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)] resize-none"
              />
            </div>
          )}

          <Button size="sm" onClick={() => void runRequest()} disabled={loading || (selected.requiresAuth && !bearerToken)}>
            {loading ? "Sending…" : "Send request"}
          </Button>

          {response !== null && (
            <div className="overflow-hidden rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]">
              <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-4 py-2">
                <span className="text-xs text-[var(--fyxvo-text-muted)]">Response</span>
                <CopyButton value={response} />
              </div>
              <pre className="max-h-64 overflow-auto p-4 text-xs leading-5 text-[var(--fyxvo-text-soft)]">
                {response}
              </pre>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-medium text-[var(--fyxvo-text-muted)]">curl</p>
            <div className="overflow-hidden rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]">
              <div className="flex justify-end border-b border-[var(--fyxvo-border)] px-3 py-1.5">
                <CopyButton value={curlSnippet} />
              </div>
              <pre className="overflow-x-auto p-4 text-xs leading-5 text-[var(--fyxvo-text-soft)]">
                {curlSnippet}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
