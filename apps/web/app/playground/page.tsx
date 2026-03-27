"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@fyxvo/ui";
import { CopyButton } from "../../components/copy-button";
import { webEnv } from "../../lib/env";

// ---------------------------------------------------------------------------
// RPC method catalogue
// ---------------------------------------------------------------------------

type MethodParam = {
  name: string;
  required: boolean;
};

type RpcMethod = {
  method: string;
  params: MethodParam[];
  description: string;
  responseDescription: string;
};

const RPC_METHODS: RpcMethod[] = [
  {
    method: "getHealth",
    params: [],
    description: "Returns the current health of the node.",
    responseDescription: "Returns a string result of \"ok\" when the node is healthy.",
  },
  {
    method: "getSlot",
    params: [{ name: "commitment", required: false }],
    description: "Returns the slot that has reached the given or default commitment level.",
    responseDescription: "Returns a number representing the current slot.",
  },
  {
    method: "getBlockHeight",
    params: [{ name: "commitment", required: false }],
    description: "Returns the current block height of the node.",
    responseDescription: "Returns a number representing the current block height.",
  },
  {
    method: "getLatestBlockhash",
    params: [{ name: "commitment", required: false }],
    description: "Returns the latest blockhash.",
    responseDescription:
      "Returns an object with value.blockhash (string) and value.lastValidBlockHeight (number).",
  },
  {
    method: "getBalance",
    params: [
      { name: "pubkey", required: true },
      { name: "commitment", required: false },
    ],
    description: "Returns the lamport balance of the account at the given public key.",
    responseDescription:
      "Returns value as a number in lamports and context.slot indicating when the balance was read.",
  },
  {
    method: "getAccountInfo",
    params: [
      { name: "pubkey", required: true },
      { name: "encoding", required: false },
      { name: "commitment", required: false },
    ],
    description: "Returns all information associated with the account of the given public key.",
    responseDescription:
      "Returns value containing lamports, owner, executable flag, rentEpoch, and data fields.",
  },
  {
    method: "getTransaction",
    params: [
      { name: "signature", required: true },
      { name: "encoding", required: false },
      { name: "commitment", required: false },
      { name: "maxSupportedTransactionVersion", required: false },
    ],
    description: "Returns transaction details for a confirmed transaction.",
    responseDescription:
      "Returns slot, blockTime, meta (including fee and err), and the full transaction object.",
  },
  {
    method: "getSignaturesForAddress",
    params: [
      { name: "address", required: true },
      { name: "limit", required: false },
      { name: "before", required: false },
      { name: "until", required: false },
    ],
    description: "Returns confirmed signatures for transactions involving the given address.",
    responseDescription:
      "Returns an array of objects each containing signature, slot, err, and blockTime.",
  },
  {
    method: "sendTransaction",
    params: [
      { name: "transaction", required: true },
      { name: "encoding", required: false },
      { name: "skipPreflight", required: false },
    ],
    description: "Submits a signed transaction to the cluster for processing.",
    responseDescription:
      "Returns the transaction signature as a base58 string on success.",
  },
  {
    method: "getTokenAccountsByOwner",
    params: [
      { name: "owner", required: true },
      { name: "filter", required: true },
      { name: "encoding", required: false },
    ],
    description: "Returns all SPL Token accounts owned by the given wallet.",
    responseDescription:
      "Returns an array of token account objects each with pubkey and account data.",
  },
  {
    method: "getProgramAccounts",
    params: [
      { name: "programId", required: true },
      { name: "filters", required: false },
      { name: "encoding", required: false },
    ],
    description: "Returns all accounts owned by the given program. This is a compute-heavy call.",
    responseDescription:
      "Returns an array of objects each containing pubkey and the account's lamports and data.",
  },
  {
    method: "getRecentPerformanceSamples",
    params: [{ name: "limit", required: false }],
    description: "Returns a list of recent performance samples.",
    responseDescription:
      "Returns an array of samples each containing numTransactions, numSlots, and samplePeriodSecs.",
  },
  {
    method: "getEpochInfo",
    params: [{ name: "commitment", required: false }],
    description: "Returns information about the current epoch.",
    responseDescription:
      "Returns absoluteSlot, blockHeight, epoch, slotIndex, and slotsInEpoch.",
  },
  {
    method: "getVoteAccounts",
    params: [{ name: "commitment", required: false }],
    description: "Returns the account info and associated stake for all voting accounts.",
    responseDescription:
      "Returns current and delinquent arrays of vote account objects.",
  },
  {
    method: "getMinimumBalanceForRentExemption",
    params: [{ name: "dataSize", required: true }],
    description: "Returns the minimum lamport balance required for rent exemption.",
    responseDescription: "Returns a number representing the minimum lamports required.",
  },
];

// ---------------------------------------------------------------------------
// URL state inner component (uses useSearchParams inside Suspense)
// ---------------------------------------------------------------------------

function PlaygroundInner() {
  const searchParams = useSearchParams();

  const [method, setMethod] = useState<string>(() => {
    return searchParams.get("method") ?? "getHealth";
  });
  const [params, setParams] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith("param_")) {
        initial[key.slice(6)] = value;
      }
    });
    return initial;
  });
  const [mode, setMode] = useState<"standard" | "priority">("standard");
  const [apiKey, setApiKey] = useState("");
  const [response, setResponse] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simulationMode, setSimulationMode] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareResponse, setCompareResponse] = useState<{
    standard: unknown;
    priority: unknown;
    standardMs: number;
    priorityMs: number;
  } | null>(null);
  const [traceId, setTraceId] = useState("");
  const [traceResponse, setTraceResponse] = useState<unknown>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const gatewayBaseUrl = webEnv.gatewayBaseUrl;
  const standardUrl = `${gatewayBaseUrl}/rpc`;
  const priorityUrl = `${gatewayBaseUrl}/priority`;

  const currentMethod = RPC_METHODS.find((m) => m.method === method) ?? RPC_METHODS[0]!;

  // Reset params when method changes
  useEffect(() => {
    setParams({});
    setResponse(null);
    setCompareResponse(null);
    setError(null);
    setLatencyMs(null);
    setShareUrl(null);
  }, [method]);

  function buildBody() {
    const paramValues = currentMethod.params
      .map((p) => params[p.name] ?? "")
      .filter((v) => v.trim())
      .map((v) => {
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      });

    return {
      jsonrpc: "2.0",
      id: 1,
      method,
      params: paramValues.length > 0 ? paramValues : [],
    };
  }

  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (apiKey.trim()) headers["x-api-key"] = apiKey.trim();
    return headers;
  }

  async function sendSingleRequest(
    url: string,
    body: unknown,
  ): Promise<{ data: unknown; ms: number }> {
    const start = performance.now();
    const res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    const ms = Math.round(performance.now() - start);
    const data = await res.json();
    return { data, ms };
  }

  async function sendRequest() {
    setLoading(true);
    setError(null);
    setResponse(null);
    setLatencyMs(null);
    setCompareResponse(null);
    setShareUrl(null);

    const body = buildBody();
    const url = mode === "standard" ? standardUrl : priorityUrl;
    const finalUrl = simulationMode ? `${url}?simulate=true` : url;

    const start = performance.now();
    try {
      const res = await fetch(finalUrl, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(body),
      });
      setLatencyMs(Math.round(performance.now() - start));
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setLatencyMs(Math.round(performance.now() - start));
    } finally {
      setLoading(false);
    }
  }

  async function runCompare() {
    setLoading(true);
    setError(null);
    setResponse(null);
    setLatencyMs(null);
    setShareUrl(null);

    const body = buildBody();
    const [standardResult, priorityResult] = await Promise.allSettled([
      sendSingleRequest(simulationMode ? `${standardUrl}?simulate=true` : standardUrl, body),
      sendSingleRequest(simulationMode ? `${priorityUrl}?simulate=true` : priorityUrl, body),
    ]);

    setCompareResponse({
      standard: standardResult.status === "fulfilled" ? standardResult.value.data : null,
      priority: priorityResult.status === "fulfilled" ? priorityResult.value.data : null,
      standardMs: standardResult.status === "fulfilled" ? standardResult.value.ms : -1,
      priorityMs: priorityResult.status === "fulfilled" ? priorityResult.value.ms : -1,
    });

    setLoading(false);
  }

  function generateShareUrl() {
    const u = new URL(window.location.href);
    u.searchParams.set("method", method);
    Object.entries(params).forEach(([k, v]) => {
      if (v) u.searchParams.set(`param_${k}`, v);
    });
    setShareUrl(u.toString());
  }

  async function lookupTrace() {
    if (!traceId.trim()) return;
    setTraceLoading(true);
    try {
      const res = await fetch(new URL(`/v1/trace/${traceId.trim()}`, webEnv.apiBaseUrl));
      const data = await res.json();
      setTraceResponse(data);
    } catch {
      setTraceResponse({ error: "Trace not found or request failed" });
    } finally {
      setTraceLoading(false);
    }
  }

  const compareDelta =
    compareResponse && compareResponse.standardMs >= 0 && compareResponse.priorityMs >= 0
      ? compareResponse.standardMs - compareResponse.priorityMs
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
          RPC Playground
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
          Build and send JSON-RPC requests to the Fyxvo gateway. Compare standard and priority relay
          paths side by side.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left panel: request builder */}
        <div className="w-full lg:w-[420px] lg:flex-shrink-0 space-y-4">
          {/* Method selector */}
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <label className="block text-xs font-medium text-[var(--fyxvo-text-muted)] mb-2">
              Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-3 py-2 text-sm text-[var(--fyxvo-text)] focus:outline-none focus:ring-2 focus:ring-[var(--fyxvo-brand)]/40"
            >
              {RPC_METHODS.map((m) => (
                <option key={m.method} value={m.method}>
                  {m.method}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-5 text-[var(--fyxvo-text-muted)]">
              {currentMethod.description}
            </p>
          </div>

          {/* Parameter inputs */}
          {currentMethod.params.length > 0 && (
            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5 space-y-3">
              <p className="text-xs font-medium text-[var(--fyxvo-text-muted)]">Parameters</p>
              {currentMethod.params.map((p) => (
                <div key={p.name}>
                  <label className="block text-xs text-[var(--fyxvo-text-muted)] mb-1">
                    {p.name}
                    {p.required ? (
                      <span className="ml-1 text-[var(--fyxvo-warning)]">required</span>
                    ) : (
                      <span className="ml-1 opacity-50">optional</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={params[p.name] ?? ""}
                    onChange={(e) =>
                      setParams((prev) => ({ ...prev, [p.name]: e.target.value }))
                    }
                    placeholder={p.name}
                    className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-3 py-2 font-mono text-xs text-[var(--fyxvo-text)] placeholder-[var(--fyxvo-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--fyxvo-brand)]/40"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Mode toggle */}
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <p className="text-xs font-medium text-[var(--fyxvo-text-muted)] mb-3">Relay path</p>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("standard")}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  mode === "standard"
                    ? "border-[var(--fyxvo-brand)] bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-brand)]"
                    : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                }`}
              >
                Standard relay
              </button>
              <button
                onClick={() => setMode("priority")}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  mode === "priority"
                    ? "border-[var(--fyxvo-brand)] bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-brand)]"
                    : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                }`}
              >
                Priority relay
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--fyxvo-text-muted)]">
              {mode === "standard"
                ? "Standard relay uses the default routing path and costs 1000 lamports per request."
                : "Priority relay uses dedicated high-priority nodes and costs 3000 lamports per request."}
            </p>
          </div>

          {/* API key */}
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <label className="block text-xs font-medium text-[var(--fyxvo-text-muted)] mb-2">
              API key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="fxk_..."
              className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-3 py-2 font-mono text-xs text-[var(--fyxvo-text)] placeholder-[var(--fyxvo-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--fyxvo-brand)]/40"
            />
            <p className="mt-2 text-xs leading-5 text-[var(--fyxvo-text-muted)]">
              Sent as the X-Api-Key header. Leave blank to send an unauthenticated request.
            </p>
          </div>

          {/* Simulation mode */}
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={simulationMode}
                onChange={(e) => setSimulationMode(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--fyxvo-border)] accent-[var(--fyxvo-brand)]"
              />
              <div>
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">
                  Simulation mode
                </span>
                <p className="text-xs leading-5 text-[var(--fyxvo-text-muted)]">
                  Appends ?simulate=true to the request. No lamports are deducted and the request is
                  not forwarded to the upstream node.
                </p>
              </div>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={sendRequest}
              disabled={loading}
              className="flex-1 rounded-lg bg-[var(--fyxvo-brand)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading && !compareMode ? "Sending..." : "Send request"}
            </button>
            <button
              onClick={() => {
                setCompareMode(true);
                runCompare();
              }}
              disabled={loading}
              className="flex-1 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-4 py-2.5 text-sm font-medium text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] disabled:opacity-50 transition-colors"
            >
              {loading && compareMode ? "Comparing..." : "Compare paths"}
            </button>
          </div>

          {/* Share button */}
          <div className="flex gap-2">
            <button
              onClick={generateShareUrl}
              className="flex-1 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2 text-xs font-medium text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
            >
              Generate share URL
            </button>
          </div>

          {shareUrl && (
            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
              <p className="text-xs font-medium text-[var(--fyxvo-text-muted)] mb-2">Share URL</p>
              <div className="flex items-start gap-2">
                <p className="flex-1 break-all font-mono text-xs text-[var(--fyxvo-text-soft)]">
                  {shareUrl}
                </p>
                <CopyButton value={shareUrl} label="Copy" />
              </div>
            </div>
          )}

          {/* Request JSON preview */}
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <p className="text-xs font-medium text-[var(--fyxvo-text-muted)] mb-2">
              Request body
            </p>
            <pre className="overflow-x-auto rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4 font-mono text-xs leading-6 text-[var(--fyxvo-text-soft)]">
              {JSON.stringify(buildBody(), null, 2)}
            </pre>
          </div>
        </div>

        {/* Right panel: response */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Response header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--fyxvo-text)]">Response</h2>
            <div className="flex items-center gap-3">
              {latencyMs !== null && !compareResponse && (
                <span className="font-mono text-xs text-[var(--fyxvo-text-soft)]">
                  {latencyMs}ms
                </span>
              )}
              {simulationMode && (
                <Badge tone="warning" className="text-xs">
                  Simulated
                </Badge>
              )}
              {mode === "priority" && !compareResponse && (
                <Badge tone="brand" className="text-xs">
                  Priority
                </Badge>
              )}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
              <p className="text-sm font-medium text-rose-400">Request failed</p>
              <p className="mt-1 font-mono text-xs text-rose-400/80">{error}</p>
            </div>
          )}

          {/* Compare mode output */}
          {compareResponse && (
            <div className="space-y-4">
              {compareDelta !== null && (
                <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                  <p className="text-sm text-[var(--fyxvo-text)]">
                    {compareDelta > 0
                      ? `Priority was ${compareDelta}ms faster`
                      : compareDelta < 0
                        ? `Standard was ${Math.abs(compareDelta)}ms faster`
                        : "Both paths responded in the same time"}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[var(--fyxvo-text-muted)]">Standard</p>
                      <p className="font-mono text-lg font-semibold text-[var(--fyxvo-text)]">
                        {compareResponse.standardMs >= 0 ? `${compareResponse.standardMs}ms` : "Failed"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--fyxvo-text-muted)]">Priority</p>
                      <p className="font-mono text-lg font-semibold text-[var(--fyxvo-text)]">
                        {compareResponse.priorityMs >= 0 ? `${compareResponse.priorityMs}ms` : "Failed"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-[var(--fyxvo-text-muted)] mb-2">
                    Standard response
                  </p>
                  <pre className="overflow-x-auto rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4 font-mono text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                    {compareResponse.standard
                      ? JSON.stringify(compareResponse.standard, null, 2)
                      : "No response"}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--fyxvo-text-muted)] mb-2">
                    Priority response
                  </p>
                  <pre className="overflow-x-auto rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4 font-mono text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                    {compareResponse.priority
                      ? JSON.stringify(compareResponse.priority, null, 2)
                      : "No response"}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Single response output */}
          {!compareResponse && response !== null && (
            <pre className="overflow-x-auto rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4 font-mono text-xs leading-6 text-[var(--fyxvo-text-soft)]">
              {JSON.stringify(response, null, 2)}
            </pre>
          )}

          {/* Empty state */}
          {!compareResponse && response === null && !error && !loading && (
            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-10 text-center">
              <p className="text-sm text-[var(--fyxvo-text-muted)]">
                Send a request to see the response here.
              </p>
            </div>
          )}

          {loading && (
            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-10 text-center">
              <p className="text-sm text-[var(--fyxvo-text-muted)]">Waiting for response...</p>
            </div>
          )}

          {/* Schema description */}
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <p className="text-xs font-medium text-[var(--fyxvo-text-muted)] mb-2">
              Expected response structure
            </p>
            <p className="text-sm leading-6 text-[var(--fyxvo-text-muted)]">
              {currentMethod.responseDescription}
            </p>
          </div>

          {/* Endpoint info */}
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <p className="text-xs font-medium text-[var(--fyxvo-text-muted)] mb-2">Endpoint</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto font-mono text-xs text-[var(--fyxvo-text-soft)]">
                {mode === "standard" ? standardUrl : priorityUrl}
                {simulationMode ? "?simulate=true" : ""}
              </code>
              <CopyButton
                value={`${mode === "standard" ? standardUrl : priorityUrl}${simulationMode ? "?simulate=true" : ""}`}
                label="Copy"
              />
            </div>
          </div>

          {/* Trace lookup */}
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <p className="text-xs font-medium text-[var(--fyxvo-text-muted)] mb-2">
              Trace lookup
            </p>
            <p className="mb-3 text-xs leading-5 text-[var(--fyxvo-text-muted)]">
              Look up a past request by the X-Fyxvo-Trace-Id value returned in response headers.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={traceId}
                onChange={(e) => setTraceId(e.target.value)}
                placeholder="Trace ID"
                className="flex-1 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-3 py-2 font-mono text-xs text-[var(--fyxvo-text)] placeholder-[var(--fyxvo-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--fyxvo-brand)]/40"
                onKeyDown={(e) => e.key === "Enter" && lookupTrace()}
              />
              <button
                onClick={lookupTrace}
                disabled={traceLoading || !traceId.trim()}
                className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-3 py-2 text-xs font-medium text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] disabled:opacity-50 transition-colors"
              >
                {traceLoading ? "Looking up..." : "Lookup"}
              </button>
            </div>
            {traceResponse !== null && (
              <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4 font-mono text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                {JSON.stringify(traceResponse, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export (wraps inner component in Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-8 w-48 rounded-lg bg-[var(--fyxvo-panel-soft)] animate-pulse" />
        </div>
      }
    >
      <PlaygroundInner />
    </Suspense>
  );
}
