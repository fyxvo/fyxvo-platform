"use client";

import { useState, useEffect } from "react";

const STANDARD_URL = "https://rpc.fyxvo.com/rpc";
const PRIORITY_URL = "https://rpc.fyxvo.com/priority";

// ---------------------------------------------------------------------------
// RPC method groups
// ---------------------------------------------------------------------------

const METHOD_GROUPS = [
  {
    label: "Account & Balance",
    methods: ["getAccountInfo", "getBalance", "getTokenAccountBalance", "getMultipleAccounts"],
  },
  {
    label: "Block & Slot",
    methods: ["getBlock", "getBlockHeight", "getSlot", "getLatestBlockhash"],
  },
  {
    label: "Transaction",
    methods: ["getTransaction", "sendTransaction", "simulateTransaction"],
  },
  {
    label: "Network",
    methods: ["getVersion", "getHealth", "getClusterNodes", "getRecentPrioritizationFees"],
  },
];

interface ResponsePanel {
  readonly status: number | null;
  readonly body: string | null;
  readonly latencyMs: number | null;
  readonly loading: boolean;
  readonly error: string | null;
}

const EMPTY_PANEL: ResponsePanel = {
  status: null,
  body: null,
  latencyMs: null,
  loading: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Build JSON-RPC params from method + field values
// ---------------------------------------------------------------------------

function buildParams(
  method: string,
  pubkey: string,
  slot: string,
  sig: string,
  genericJson: string
): unknown[] {
  switch (method) {
    case "getAccountInfo":
    case "getBalance":
    case "getTokenAccountBalance":
      return pubkey ? [pubkey] : [];
    case "getMultipleAccounts":
      return pubkey ? [pubkey.split(",").map((s) => s.trim())] : [[]];
    case "getBlock":
      return slot ? [parseInt(slot, 10)] : [];
    case "getTransaction":
      return sig ? [sig] : [];
    case "sendTransaction":
    case "simulateTransaction":
      return sig ? [sig, { encoding: "base64" }] : [];
    default:
      try {
        return genericJson ? (JSON.parse(genericJson) as unknown[]) : [];
      } catch {
        return [];
      }
  }
}

// ---------------------------------------------------------------------------
// Send a single RPC request
// ---------------------------------------------------------------------------

async function sendRpc(
  method: string,
  params: unknown[],
  relayPath: "standard" | "priority",
  apiKey: string,
  simulate: boolean
): Promise<{ status: number; body: string; latencyMs: number }> {
  const url = `${relayPath === "priority" ? PRIORITY_URL : STANDARD_URL}${simulate ? "?simulate=true" : ""}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const start = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const latencyMs = Date.now() - start;
  const text = await res.text();
  let body: string;
  try {
    body = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    body = text;
  }
  return { status: res.status, body, latencyMs };
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { readonly status: number }) {
  const color =
    status >= 200 && status < 300
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : status >= 400
        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
        : "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return (
    <span
      className={`inline-block rounded-lg px-2 py-0.5 text-xs font-mono font-semibold border ${color}`}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Response panel component
// ---------------------------------------------------------------------------

function ResponseView({
  panel,
  label,
}: {
  readonly panel: ResponsePanel;
  readonly label?: string;
}) {
  return (
    <div className="flex flex-col h-full">
      {label && (
        <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-2">
          {label}
        </p>
      )}
      {panel.loading && (
        <div className="flex-1 flex items-center justify-center text-[#64748b] text-sm">
          Sending request…
        </div>
      )}
      {!panel.loading && panel.error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
          {panel.error}
        </div>
      )}
      {!panel.loading && !panel.error && panel.body === null && (
        <div className="flex-1 flex items-center justify-center text-[#64748b] text-sm">
          Response will appear here
        </div>
      )}
      {!panel.loading && panel.body !== null && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex items-center gap-3">
            {panel.status !== null && <StatusBadge status={panel.status} />}
            {panel.latencyMs !== null && (
              <span className="text-xs text-[#64748b]">{panel.latencyMs}ms</span>
            )}
          </div>
          <pre className="flex-1 overflow-x-auto overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-xs font-mono text-[#f1f5f9] min-h-0 max-h-[500px]">
            {panel.body}
          </pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PlaygroundPage() {
  const [selectedMethod, setSelectedMethod] = useState("getBalance");
  const [pubkey, setPubkey] = useState("");
  const [slot, setSlot] = useState("");
  const [sig, setSig] = useState("");
  const [genericJson, setGenericJson] = useState("[]");
  const [relayPath, setRelayPath] = useState<"standard" | "priority">("standard");
  const [apiKey, setApiKey] = useState("");
  const [simulate, setSimulate] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [panelA, setPanelA] = useState<ResponsePanel>(EMPTY_PANEL);
  const [panelB, setPanelB] = useState<ResponsePanel>(EMPTY_PANEL);

  // Reset param fields when method changes
  useEffect(() => {
    setPubkey("");
    setSlot("");
    setSig("");
    setGenericJson("[]");
  }, [selectedMethod]);

  // Handle share URL parsing
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const m = params.get("method");
    if (m) setSelectedMethod(m);
    const p = params.get("params");
    if (p) setGenericJson(p);
  }, []);

  function handleShare() {
    const params = new URLSearchParams({ method: selectedMethod });
    const builtParams = buildParams(selectedMethod, pubkey, slot, sig, genericJson);
    if (builtParams.length > 0) {
      params.set("params", JSON.stringify(builtParams));
    }
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    void navigator.clipboard.writeText(url);
  }

  async function handleSend() {
    const params = buildParams(selectedMethod, pubkey, slot, sig, genericJson);
    setPanelA({ ...EMPTY_PANEL, loading: true });
    if (compareMode) setPanelB({ ...EMPTY_PANEL, loading: true });

    try {
      const result = await sendRpc(selectedMethod, params, relayPath, apiKey, simulate);
      setPanelA({
        status: result.status,
        body: result.body,
        latencyMs: result.latencyMs,
        loading: false,
        error: null,
      });
    } catch (err) {
      setPanelA({
        ...EMPTY_PANEL,
        loading: false,
        error: err instanceof Error ? err.message : "Request failed",
      });
    }

    if (compareMode) {
      const altPath = relayPath === "standard" ? "priority" : "standard";
      try {
        const result = await sendRpc(selectedMethod, params, altPath, apiKey, simulate);
        setPanelB({
          status: result.status,
          body: result.body,
          latencyMs: result.latencyMs,
          loading: false,
          error: null,
        });
      } catch (err) {
        setPanelB({
          ...EMPTY_PANEL,
          loading: false,
          error: err instanceof Error ? err.message : "Request failed",
        });
      }
    }
  }

  const needsPubkey = [
    "getAccountInfo",
    "getBalance",
    "getTokenAccountBalance",
    "getMultipleAccounts",
  ].includes(selectedMethod);
  const needsSlot = ["getBlock"].includes(selectedMethod);
  const needsSig = ["getTransaction", "sendTransaction", "simulateTransaction"].includes(
    selectedMethod
  );
  const needsGeneric = !needsPubkey && !needsSlot && !needsSig;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#f1f5f9] mb-2">Playground</h1>
          <p className="text-[#64748b]">
            Build and test Solana RPC requests against the Fyxvo relay gateway.
          </p>
        </div>

        {/* Three-panel grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_1fr] gap-5 items-start">
          {/* LEFT PANEL — Method selector */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">Methods</p>
            {METHOD_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-[#64748b] mb-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {group.methods.map((method) => (
                    <button
                      key={method}
                      onClick={() => setSelectedMethod(method)}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-sm font-mono transition-colors ${
                        selectedMethod === method
                          ? "bg-[#f97316]/10 text-[#f97316]"
                          : "text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/[0.05]"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* CENTER PANEL — Request builder */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#f1f5f9] font-mono">
                {selectedMethod}
              </h2>
              <button
                onClick={handleShare}
                className="text-xs px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#64748b] hover:text-[#f1f5f9] transition-colors"
              >
                Share
              </button>
            </div>

            {/* Dynamic params */}
            {needsPubkey && (
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">
                  {selectedMethod === "getMultipleAccounts"
                    ? "Public keys (comma-separated)"
                    : "Public key"}
                </label>
                <input
                  type="text"
                  value={pubkey}
                  onChange={(e) => setPubkey(e.target.value)}
                  placeholder="Solana public key"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-mono text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#f97316]/50"
                />
              </div>
            )}

            {needsSlot && (
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">
                  Slot number
                </label>
                <input
                  type="number"
                  value={slot}
                  onChange={(e) => setSlot(e.target.value)}
                  placeholder="e.g. 123456789"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-mono text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#f97316]/50"
                />
              </div>
            )}

            {needsSig && (
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">
                  {selectedMethod === "sendTransaction" || selectedMethod === "simulateTransaction"
                    ? "Transaction (base64)"
                    : "Signature"}
                </label>
                <input
                  type="text"
                  value={sig}
                  onChange={(e) => setSig(e.target.value)}
                  placeholder={
                    selectedMethod === "sendTransaction"
                      ? "Base64-encoded transaction"
                      : "Transaction signature"
                  }
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-mono text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#f97316]/50"
                />
              </div>
            )}

            {needsGeneric && (
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">
                  Parameters (JSON array)
                </label>
                <textarea
                  value={genericJson}
                  onChange={(e) => setGenericJson(e.target.value)}
                  rows={4}
                  placeholder="[]"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-mono text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#f97316]/50 resize-y"
                />
              </div>
            )}

            {/* Relay path toggle */}
            <div>
              <p className="text-xs font-medium text-[#64748b] mb-2">Relay path</p>
              <div className="flex gap-2">
                {(["standard", "priority"] as const).map((path) => (
                  <button
                    key={path}
                    onClick={() => setRelayPath(path)}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                      relayPath === path
                        ? "border-[#f97316]/50 bg-[#f97316]/10 text-[#f97316]"
                        : "border-white/[0.08] bg-white/[0.03] text-[#64748b] hover:text-[#f1f5f9]"
                    }`}
                  >
                    {path.charAt(0).toUpperCase() + path.slice(1)}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-[#64748b]">
                {relayPath === "standard" ? STANDARD_URL : PRIORITY_URL}
              </p>
            </div>

            {/* API key */}
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1">
                API key (optional)
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="fyxvo_..."
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-mono text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#f97316]/50"
              />
            </div>

            {/* Toggles */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulate}
                  onChange={(e) => setSimulate(e.target.checked)}
                  className="rounded border-white/[0.08] bg-white/[0.04] accent-[#f97316]"
                />
                <span className="text-xs text-[#64748b]">Simulate</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compareMode}
                  onChange={(e) => setCompareMode(e.target.checked)}
                  className="rounded border-white/[0.08] bg-white/[0.04] accent-[#f97316]"
                />
                <span className="text-xs text-[#64748b]">Compare paths</span>
              </label>
            </div>

            {/* Send button */}
            <button
              onClick={() => void handleSend()}
              disabled={panelA.loading}
              className="w-full rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ea6c0a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {panelA.loading ? "Sending…" : "Send request"}
            </button>
          </div>

          {/* RIGHT PANEL — Response viewer */}
          {compareMode ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                Responses
              </p>
              <div className="grid grid-cols-2 gap-4">
                <ResponseView
                  panel={panelA}
                  label={`Standard (${relayPath === "standard" ? "selected" : "alt"})`}
                />
                <ResponseView
                  panel={panelB}
                  label={`Priority (${relayPath === "priority" ? "selected" : "alt"})`}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-4">
                Response
              </p>
              <ResponseView panel={panelA} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
