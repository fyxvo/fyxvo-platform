"use client";

import Link from "next/link";
import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";
import { PlaygroundRecipesPanel } from "../../components/playground-recipes-panel";
import { usePortal } from "../../components/portal-provider";
import { listWebhooks, testWebhook } from "../../lib/api";
import { webEnv } from "../../lib/env";
import type { PlaygroundRecipe } from "../../lib/types";

// ---------------------------------------------------------------------------
// RPC method catalogue
// ---------------------------------------------------------------------------

type MethodParam = {
  name: string;
  placeholder: string;
  required: boolean;
};

type MethodExample = {
  label: string;
  params: Record<string, string>;
};

type ResponseSchemaField = {
  key: string;
  type: string;
  description: string;
};

type RpcMethod = {
  method: string;
  category: string;
  description: string;
  params: MethodParam[];
  examples?: MethodExample[];
  responseSchema?: ResponseSchemaField[];
  isTraceLookup?: boolean;
  isBenchmark?: boolean;
  isWebhookTest?: boolean;
};

const RPC_METHODS: RpcMethod[] = [
  // Network
  {
    method: "getHealth",
    category: "Network",
    description: "Returns the current health of the node.",
    params: [],
    responseSchema: [{ key: "result", type: "string", description: '"ok" if healthy' }],
  },
  {
    method: "getVersion",
    category: "Network",
    description: "Returns the current Solana version running on the node.",
    params: [],
    responseSchema: [
      { key: "solana-core", type: "string", description: "Software version of solana-core" },
      { key: "feature-set", type: "number", description: "Unique identifier of the current software's feature set" },
    ],
  },
  {
    method: "getSlot",
    category: "Network",
    description: "Returns the slot that has reached the given or default commitment level.",
    params: [],
    responseSchema: [{ key: "result", type: "number", description: "Current slot number" }],
  },
  {
    method: "getBlockHeight",
    category: "Network",
    description: "Returns the current block height of the node.",
    params: [],
    responseSchema: [{ key: "result", type: "number", description: "Current block height" }],
  },
  {
    method: "getEpochInfo",
    category: "Network",
    description: "Returns information about the current epoch.",
    params: [],
    responseSchema: [
      { key: "absoluteSlot", type: "number", description: "Current slot" },
      { key: "blockHeight", type: "number", description: "Current block height" },
      { key: "epoch", type: "number", description: "Current epoch" },
      { key: "slotIndex", type: "number", description: "Current slot relative to epoch start" },
      { key: "slotsInEpoch", type: "number", description: "Number of slots in epoch" },
    ],
  },
  // Account
  {
    method: "getBalance",
    category: "Account",
    description: "Returns the lamport balance of the account.",
    params: [{ name: "pubkey", placeholder: "Base58 account public key", required: true }],
    examples: [
      { label: "Devnet faucet", params: { pubkey: "FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa" } },
    ],
    responseSchema: [
      { key: "value", type: "number", description: "Balance in lamports (divide by 1e9 for SOL)" },
      { key: "context.slot", type: "number", description: "Slot at which balance was retrieved" },
    ],
  },
  {
    method: "getAccountInfo",
    category: "Account",
    description: "Returns all information associated with the account.",
    params: [{ name: "pubkey", placeholder: "Base58 account public key", required: true }],
    examples: [
      { label: "Devnet faucet", params: { pubkey: "FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa" } },
    ],
    responseSchema: [
      { key: "value.lamports", type: "number", description: "Lamports assigned to account" },
      { key: "value.owner", type: "string", description: "Base58 pubkey of owning program" },
      { key: "value.executable", type: "boolean", description: "Whether account is executable" },
      { key: "value.rentEpoch", type: "number", description: "Epoch at which account will owe rent" },
    ],
  },
  {
    method: "getTokenAccountBalance",
    category: "Account",
    description: "Returns the token balance of an SPL Token account.",
    params: [{ name: "pubkey", placeholder: "SPL Token account public key", required: true }],
    responseSchema: [
      { key: "value.amount", type: "string", description: "Raw token amount as string" },
      { key: "value.decimals", type: "number", description: "Number of decimals in token amount" },
      { key: "value.uiAmount", type: "number | null", description: "Token amount as float (null if too large)" },
    ],
  },
  {
    method: "getProgramAccounts",
    category: "Account",
    description: "Returns all accounts owned by the provided program. Compute-heavy.",
    params: [{ name: "programId", placeholder: "Program public key", required: true }],
    examples: [
      { label: "Token program", params: { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" } },
    ],
    responseSchema: [
      { key: "[].pubkey", type: "string", description: "Account pubkey" },
      { key: "[].account.lamports", type: "number", description: "Lamports in account" },
      { key: "[].account.data", type: "object", description: "Account data (may be large)" },
    ],
  },
  // Transaction
  {
    method: "getTransaction",
    category: "Transaction",
    description: "Returns transaction details.",
    params: [{ name: "signature", placeholder: "Transaction signature (base58)", required: true }],
    responseSchema: [
      { key: "slot", type: "number", description: "Slot the transaction was processed in" },
      { key: "meta.fee", type: "number", description: "Fee in lamports" },
      { key: "meta.err", type: "object | null", description: "Error if transaction failed" },
      { key: "blockTime", type: "number | null", description: "Unix timestamp of block" },
    ],
  },
  {
    method: "getSignaturesForAddress",
    category: "Transaction",
    description: "Returns confirmed signatures for transactions involving an address.",
    params: [{ name: "pubkey", placeholder: "Base58 account public key", required: true }],
    examples: [
      { label: "Devnet faucet", params: { pubkey: "FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa" } },
    ],
    responseSchema: [
      { key: "[].signature", type: "string", description: "Transaction signature" },
      { key: "[].slot", type: "number", description: "Slot containing the transaction" },
      { key: "[].err", type: "object | null", description: "Transaction error, if any" },
      { key: "[].blockTime", type: "number | null", description: "Unix timestamp estimate" },
    ],
  },
  // Block
  {
    method: "getBlock",
    category: "Block",
    description: "Returns identity and transaction information about a confirmed block.",
    params: [{ name: "slot", placeholder: "Slot number (integer)", required: true }],
    responseSchema: [
      { key: "blockhash", type: "string", description: "Blockhash of this block" },
      { key: "previousBlockhash", type: "string", description: "Blockhash of parent block" },
      { key: "parentSlot", type: "number", description: "Parent slot" },
      { key: "transactions", type: "array", description: "List of transactions in block" },
    ],
  },
  {
    method: "getLatestBlockhash",
    category: "Block",
    description: "Returns the latest blockhash.",
    params: [],
    responseSchema: [
      { key: "value.blockhash", type: "string", description: "Latest blockhash" },
      { key: "value.lastValidBlockHeight", type: "number", description: "Last block height at which blockhash is valid" },
    ],
  },
  {
    method: "isBlockhashValid",
    category: "Block",
    description: "Returns whether a given blockhash is still valid.",
    params: [{ name: "blockhash", placeholder: "Blockhash string", required: true }],
    responseSchema: [{ key: "value", type: "boolean", description: "Whether the blockhash is still valid" }],
  },
  // Decode
  {
    method: "decodeTransaction",
    category: "Decode",
    description: "Decode a Solana transaction — view accounts, instructions, and program IDs",
    params: [{ name: "signature", placeholder: "Transaction signature (base58)", required: true }],
    responseSchema: [
      { key: "slot", type: "number", description: "Slot the transaction was processed in" },
      { key: "meta.fee", type: "number", description: "Fee in lamports" },
      { key: "transaction.message.accountKeys", type: "array", description: "Accounts involved in the transaction" },
      { key: "transaction.message.instructions", type: "array", description: "Instructions in the transaction" },
    ],
  },
  // Trace
  {
    method: "traceLookup",
    category: "Trace",
    description: "Look up a request by its X-Fyxvo-Trace-Id response header",
    params: [],
    isTraceLookup: true,
  },
  // Benchmark
  {
    method: "benchmark",
    category: "Benchmark",
    description: "Measure gateway latency across multiple requests",
    params: [],
    isBenchmark: true,
  },
  // Webhook
  {
    method: "webhookTest",
    category: "Webhook",
    description: "Test that a webhook URL receives events correctly",
    params: [],
    isWebhookTest: true,
  },
];

const CATEGORIES = [...new Set(RPC_METHODS.map((m) => m.category))];

// ---------------------------------------------------------------------------
// Solana RPC error code lookup
// ---------------------------------------------------------------------------

const SOLANA_RPC_ERRORS: Record<number, { name: string; explanation: string }> = {
  [-32700]: { name: "Parse error", explanation: "The JSON sent is not valid. Check your request body syntax." },
  [-32600]: { name: "Invalid request", explanation: "The JSON sent is not a valid JSON-RPC request object." },
  [-32601]: { name: "Method not found", explanation: "The RPC method does not exist. Check the method name for typos." },
  [-32602]: { name: "Invalid params", explanation: "Invalid method parameters — often a malformed account address or missing required field." },
  [-32603]: { name: "Internal error", explanation: "The node encountered an internal error. Try again or check the node's status." },
  [-32000]: { name: "Server error", explanation: "Generic server error. The node may be under load." },
  [-32004]: { name: "Block not found", explanation: "The requested block does not exist. It may have been pruned." },
  [-32005]: { name: "Node behind", explanation: "The node is behind. Wait for it to catch up." },
  [-32009]: { name: "Slot skipped", explanation: "The requested slot was skipped and has no block." },
  [-32010]: { name: "Epoch rewards period", explanation: "Request not allowed during epoch rewards distribution. Retry after the epoch boundary." },
  [-32015]: { name: "Transaction signature verification failed", explanation: "The transaction's signature is invalid. Re-sign the transaction." },
  [-32016]: { name: "Blockhash not found", explanation: "The blockhash is too old or was never valid. Fetch a fresh blockhash and retry." },
  [-32017]: { name: "Cluster maintenance", explanation: "The cluster is undergoing maintenance. Check status.solana.com." },
  [-32018]: { name: "SendTransactionPreflightFailure", explanation: "Transaction simulation failed. Check the transaction logs for the specific error." },
  [-32020]: { name: "Minimum context slot not reached", explanation: "The requested slot has not been reached yet. Wait and retry." },
  [-32021]: { name: "Token owner mismatch", explanation: "The token account does not belong to the expected owner." },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface HistoryItem {
  id: string;
  method: string;
  mode: "standard" | "priority";
  durationMs: number;
  statusCode: number;
  requestedAt: string;
}

function buildRpcBody(method: string, params: MethodParam[], paramValues: Record<string, string>) {
  const rpcParams: unknown[] = params.map((p) => {
    const v = paramValues[p.name] ?? "";
    if (p.name === "slot") return isNaN(Number(v)) ? v : Number(v);
    return v || undefined;
  }).filter((v) => v !== undefined);
  return JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: rpcParams.length > 0 ? rpcParams : undefined });
}

async function sendRpcRequest(
  gatewayBase: string,
  mode: "standard" | "priority",
  body: string,
  apiKeyPrefix?: string,
  simulate?: boolean
): Promise<{ text: string; status: number; durationMs: number }> {
  const basePath = mode === "priority" ? `${gatewayBase}/priority` : `${gatewayBase}/rpc`;
  const endpoint = simulate ? `${basePath}?simulate=true` : basePath;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKeyPrefix) headers["x-api-key"] = `${apiKeyPrefix}...`;
  const start = Date.now();
  const res = await fetch(endpoint, { method: "POST", headers, body });
  const elapsed = Date.now() - start;
  const text = await res.text();
  return { text, status: res.status, durationMs: elapsed };
}

function formatResponse(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw) as unknown, null, 2);
  } catch {
    return raw;
  }
}

// ---------------------------------------------------------------------------
// Decode helpers
// ---------------------------------------------------------------------------

const KNOWN_PROGRAMS: Record<string, string> = {
  "11111111111111111111111111111111": "System Program",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "Token Program (SPL)",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bv6": "Associated Token Program",
};

function truncateAddress(addr: string, start = 8, end = 4): string {
  if (addr.length <= start + end) return addr;
  return `${addr.slice(0, start)}…${addr.slice(-end)}`;
}

interface DecodedTransaction {
  fee: number | null;
  accounts: string[];
  programIds: string[];
}

function decodeTransactionResponse(raw: string): DecodedTransaction | null {
  try {
    const parsed = JSON.parse(raw) as {
      result?: {
        meta?: { fee?: number };
        transaction?: {
          message?: {
            accountKeys?: string[];
            instructions?: Array<{ programIdIndex?: number }>;
          };
        };
      };
    };
    const result = parsed?.result;
    if (!result) return null;
    const fee = result?.meta?.fee ?? null;
    const accountKeys = result?.transaction?.message?.accountKeys ?? [];
    const instructions = result?.transaction?.message?.instructions ?? [];
    const programIdxs = instructions
      .map((ix) => (typeof ix.programIdIndex === "number" ? ix.programIdIndex : null))
      .filter((i): i is number => i !== null);
    const programIds = [...new Set(programIdxs.map((i) => accountKeys[i]).filter((a): a is string => Boolean(a)))];
    return { fee, accounts: accountKeys, programIds };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Benchmark helpers
// ---------------------------------------------------------------------------

function computeStats(arr: number[]): { min: number; max: number; avg: number; median: number; p95: number } | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const avg = Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
  return { min, max, avg, median, p95 };
}

function parseTraceLookup(raw: string): null | {
  method?: string;
  route?: string;
  statusCode?: number;
  durationMs?: number;
  service?: string;
  upstreamNode?: string | null;
  region?: string | null;
  createdAt?: string;
} {
  try {
    return JSON.parse(raw) as {
      method?: string;
      route?: string;
      statusCode?: number;
      durationMs?: number;
      service?: string;
      upstreamNode?: string | null;
      region?: string | null;
      createdAt?: string;
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PlaygroundContent() {
  const portal = usePortal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = portal.walletPhase === "authenticated";

  const [selectedCategory, setSelectedCategory] = useState("Network");
  const [selectedMethod, setSelectedMethod] = useState<RpcMethod>(RPC_METHODS[0]!);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"standard" | "priority">("standard");
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareResponse, setCompareResponse] = useState<string | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareDurationMs, setCompareDurationMs] = useState<number | null>(null);

  // Decode view
  const [decodedView, setDecodedView] = useState<DecodedTransaction | "error" | null>(null);

  // Schema panel
  const [schemaOpen, setSchemaOpen] = useState(false);

  // Share copied
  const [shareCopied, setShareCopied] = useState(false);

  // Response time display
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);
  const [compareResponseTimeMs, setCompareResponseTimeMs] = useState<number | null>(null);

  // Simulation mode
  const [simulateMode, setSimulateMode] = useState(false);

  // Session request counter
  const [sessionRequestCount, setSessionRequestCount] = useState(0);

  // Error explanation derived from response
  const [errorExplanation, setErrorExplanation] = useState<{ name: string; explanation: string } | null>(null);

  // Trace lookup
  const [traceId, setTraceId] = useState("");

  // Benchmark
  const [benchmarkCount, setBenchmarkCount] = useState(10);
  const [benchmarkMethod, setBenchmarkMethod] = useState<"getSlot" | "getLatestBlockhash" | "getBalance" | "getAccountInfo">("getSlot");
  const [benchmarkResults, setBenchmarkResults] = useState<number[]>([]);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkNetworkAvg, setBenchmarkNetworkAvg] = useState<number | null>(null);

  // Webhook test
  const [projectWebhooks, setProjectWebhooks] = useState<
    Array<{ id: string; url: string; events: string[]; secret: string; active: boolean; lastTriggeredAt: string | null; createdAt: string }>
  >([]);
  const [selectedWebhookTarget, setSelectedWebhookTarget] = useState<string>("custom");
  const [webhookTestUrl, setWebhookTestUrl] = useState("");
  const [webhookTestEvent, setWebhookTestEvent] = useState("request.completed");
  const [webhookTestResponse, setWebhookTestResponse] = useState<{ status: number; body: string; latencyMs: number } | null>(null);
  const selectedProjectId = portal.selectedProject?.id ?? null;

  const initializedFromUrl = useRef(false);
  const [assistantInsertNotice, setAssistantInsertNotice] = useState<string | null>(null);

  // On mount, restore state from URL search params
  useEffect(() => {
    if (initializedFromUrl.current) return;
    initializedFromUrl.current = true;
    const methodName = searchParams.get("method");
    if (!methodName) return;
    const found = RPC_METHODS.find((m) => m.method === methodName);
    if (!found) return;
    setSelectedMethod(found);
    setSelectedCategory(found.category);
    const params: Record<string, string> = {};
    for (const p of found.params) {
      const val = searchParams.get(p.name);
      if (val) params[p.name] = val;
    }
    setParamValues(params);
    if (found.isTraceLookup) {
      const requestedTraceId = searchParams.get("traceId");
      if (requestedTraceId) {
        setTraceId(requestedTraceId);
      }
    }
    const requestedMode = searchParams.get("mode");
    if (requestedMode === "standard" || requestedMode === "priority") {
      setMode(requestedMode);
    }
    setSimulateMode(searchParams.get("simulate") === "true");
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("fyxvo.playground.assistantInsert");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        method?: string;
        params?: Record<string, string>;
        snippet?: string;
        mode?: "standard" | "priority";
        simulate?: boolean;
      };
      if (!parsed.method) return;
      const found = RPC_METHODS.find((method) => method.method === parsed.method);
      if (!found) return;
      setSelectedMethod(found);
      setSelectedCategory(found.category);
      setParamValues(parsed.params ?? {});
      if (parsed.mode) {
        setMode(parsed.mode);
      }
      setSimulateMode(Boolean(parsed.simulate));
      setAssistantInsertNotice(
        parsed.snippet ??
          `Inserted ${parsed.method} from the assistant${parsed.mode ? ` using ${parsed.mode} mode` : ""}${parsed.simulate ? " with simulation enabled" : ""}.`
      );
      window.sessionStorage.setItem(
        "fyxvo.assistant.returnNotice",
        `Returned from Playground with ${parsed.method} ready.`
      );
    } catch {
      // ignore malformed cache
    } finally {
      window.sessionStorage.removeItem("fyxvo.playground.assistantInsert");
    }
  }, []);

  const selectMethod = useCallback((m: RpcMethod) => {
    setSelectedMethod(m);
    setParamValues({});
    setTraceId("");
    setResponse(null);
    setCompareResponse(null);
    setError(null);
    setCompareError(null);
    setDurationMs(null);
    setCompareDurationMs(null);
    setSchemaOpen(false);
    setResponseTimeMs(null);
    setCompareResponseTimeMs(null);
    setErrorExplanation(null);
    setDecodedView(null);
    setBenchmarkResults([]);
    setWebhookTestResponse(null);
  }, []);

  // Derive error explanation from response
  useEffect(() => {
    if (!response) {
      setErrorExplanation(null);
      return;
    }
    try {
      const parsed = JSON.parse(response) as { error?: { code?: unknown } };
      const code = parsed?.error?.code;
      if (typeof code === "number" && code in SOLANA_RPC_ERRORS) {
        setErrorExplanation(SOLANA_RPC_ERRORS[code] ?? null);
      } else {
        setErrorExplanation(null);
      }
    } catch {
      setErrorExplanation(null);
    }
  }, [response]);

  useEffect(() => {
    if (!selectedMethod.isWebhookTest || !portal.token || !selectedProjectId) {
      setProjectWebhooks([]);
      setSelectedWebhookTarget("custom");
      return;
    }

    let cancelled = false;

    listWebhooks(selectedProjectId, portal.token)
      .then((data) => {
        if (cancelled) return;
        setProjectWebhooks(data.items);
        setSelectedWebhookTarget((current) =>
          current === "custom" || data.items.some((item) => item.id === current) ? current : "custom"
        );
      })
      .catch(() => {
        if (cancelled) return;
        setProjectWebhooks([]);
        setSelectedWebhookTarget("custom");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMethod.isWebhookTest, selectedProjectId, portal.token]);

  const activeApiKey = portal.apiKeys.find((k) => k.id === selectedKeyId && k.status === "ACTIVE") ??
    portal.apiKeys.find((k) => k.status === "ACTIVE");

  const gatewayBase = webEnv.apiBaseUrl.replace("/api", "").replace(":3001", ":3002");
  const traceLookupDetails = selectedMethod.isTraceLookup && response ? parseTraceLookup(response) : null;

  const loadRecipe = useCallback((recipe: PlaygroundRecipe) => {
    const found = RPC_METHODS.find((method) => method.method === recipe.method);
    if (!found) return;
    setSelectedMethod(found);
    setSelectedCategory(found.category);
    setParamValues(recipe.params);
    setMode(recipe.mode);
    setSimulateMode(recipe.simulationEnabled);
    setTraceId(recipe.method === "traceLookup" ? recipe.params.traceId ?? "" : "");
    setAssistantInsertNotice(`Loaded saved recipe "${recipe.name}" into the playground.`);
    setResponse(null);
    setCompareResponse(null);
    setError(null);
    setCompareError(null);
    setDurationMs(null);
    setCompareDurationMs(null);
    setDecodedView(null);
  }, []);

  function copyShareLink() {
    const params = new URLSearchParams({ method: selectedMethod.method });
    for (const [k, v] of Object.entries(paramValues)) {
      if (v) params.set(k, v);
    }
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    void navigator.clipboard.writeText(url);
    // Update URL without navigation
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  async function sendRequest() {
    if (!isAuthenticated) return;

    // Webhook test — send to a configured project webhook or a custom URL.
    if (selectedMethod.isWebhookTest) {
      const usingConfiguredWebhook =
        selectedWebhookTarget !== "custom" && portal.selectedProject && portal.token;

      if (!usingConfiguredWebhook && !webhookTestUrl.trim()) return;
      setLoading(true);
      setWebhookTestResponse(null);
      const start = Date.now();

      try {
        if (usingConfiguredWebhook && portal.selectedProject && portal.token) {
          const result = await testWebhook(
            portal.selectedProject.id,
            selectedWebhookTarget,
            portal.token
          );
          setTimeout(
            () =>
              setWebhookTestResponse({
                status: result.statusCode ?? 0,
                body: result.body ?? result.error ?? "(empty)",
                latencyMs: result.latencyMs ?? 0
              }),
            0
          );
          return;
        }

        const payload = JSON.stringify({
          event: webhookTestEvent,
          projectId: "test",
          timestamp: new Date().toISOString(),
          data: { method: "getSlot", latencyMs: 42, success: true },
        });
        const res = await fetch(webhookTestUrl.trim(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        const elapsed = Date.now() - start;
        const resBody = (await res.text()).slice(0, 500);
        setTimeout(() => setWebhookTestResponse({ status: res.status, body: resBody, latencyMs: elapsed }), 0);
      } catch (e) {
        const elapsed = Date.now() - start;
        const isCors = e instanceof TypeError;
        setTimeout(() => setWebhookTestResponse({
          status: 0,
          body: isCors
            ? "CORS blocked — test from your server or use a CORS-permissive webhook receiver like webhook.site"
            : (e instanceof Error ? e.message : "Network error"),
          latencyMs: elapsed,
        }), 0);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Trace lookup — hits API directly, bypasses gateway RPC path
    if (selectedMethod.isTraceLookup) {
      if (!traceId.trim() || !portal.selectedProject || !portal.token) return;
      setLoading(true);
      setError(null);
      setResponse(null);
      setDurationMs(null);
      setResponseTimeMs(null);
      try {
        const start = Date.now();
        const res = await fetch(
          `${webEnv.apiBaseUrl}/v1/projects/${portal.selectedProject.id}/requests/${traceId.trim()}`,
          { headers: { Authorization: `Bearer ${portal.token}` } }
        );
        const elapsed = Date.now() - start;
        const text = await res.text();
        setResponse(formatResponse(text));
        setDurationMs(elapsed);
        setResponseTimeMs(elapsed);
        addHistory("traceLookup", "standard", elapsed, res.status);
        setSessionRequestCount((c) => c + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
      } finally {
        setLoading(false);
      }
      return;
    }

    const isDecodeMethod = selectedMethod.method === "decodeTransaction";
    const body = isDecodeMethod
      ? JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTransaction",
          params: [paramValues["signature"] ?? "", { encoding: "json", maxSupportedTransactionVersion: 0 }],
        })
      : buildRpcBody(selectedMethod.method, selectedMethod.params, paramValues);

    setLoading(true);
    setError(null);
    setResponse(null);
    setCompareResponse(null);
    setCompareError(null);
    setDurationMs(null);
    setCompareDurationMs(null);
    setResponseTimeMs(null);
    setCompareResponseTimeMs(null);
    setDecodedView(null);

    try {
      if (compareMode) {
        const [standardResult, priorityResult] = await Promise.allSettled([
          sendRpcRequest(gatewayBase, "standard", body, activeApiKey?.prefix, simulateMode),
          sendRpcRequest(gatewayBase, "priority", body, activeApiKey?.prefix, simulateMode),
        ]);
        if (standardResult.status === "fulfilled") {
          setResponse(formatResponse(standardResult.value.text));
          setDurationMs(standardResult.value.durationMs);
          setResponseTimeMs(standardResult.value.durationMs);
          addHistory(selectedMethod.method, "standard", standardResult.value.durationMs, standardResult.value.status);
        } else {
          setError(standardResult.reason instanceof Error ? standardResult.reason.message : "Network error");
        }
        if (priorityResult.status === "fulfilled") {
          setCompareResponse(formatResponse(priorityResult.value.text));
          setCompareDurationMs(priorityResult.value.durationMs);
          setCompareResponseTimeMs(priorityResult.value.durationMs);
          addHistory(selectedMethod.method, "priority", priorityResult.value.durationMs, priorityResult.value.status);
        } else {
          setCompareError(priorityResult.reason instanceof Error ? priorityResult.reason.message : "Network error");
        }
        setSessionRequestCount((c) => c + 1);
      } else {
        const startMs = Date.now();
        const result = await sendRpcRequest(gatewayBase, mode, body, activeApiKey?.prefix, simulateMode);
        const elapsed = Date.now() - startMs;
        setDurationMs(result.durationMs);
        setResponseTimeMs(elapsed);
        const formatted = formatResponse(result.text);
        setResponse(formatted);
        if (isDecodeMethod) {
          const decoded = decodeTransactionResponse(result.text);
          setDecodedView(decoded ?? "error");
        }
        addHistory(selectedMethod.method, mode, result.durationMs, result.status);
        setSessionRequestCount((c) => c + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function addHistory(method: string, m: "standard" | "priority", dMs: number, statusCode: number) {
    setHistory((prev) => [
      {
        id: crypto.randomUUID(),
        method,
        mode: m,
        durationMs: dMs,
        statusCode,
        requestedAt: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 19),
    ]);
  }

  async function runBenchmark() {
    setBenchmarkRunning(true);
    setBenchmarkResults([]);
    setBenchmarkNetworkAvg(null);

    const BENCH_ADDRESS = "FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa";
    const methodParams: Record<string, unknown[]> = {
      getSlot: [],
      getLatestBlockhash: [],
      getBalance: [BENCH_ADDRESS],
      getAccountInfo: [BENCH_ADDRESS, { encoding: "base58" }],
    };
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: benchmarkMethod, params: methodParams[benchmarkMethod] ?? [] });

    // Fetch network stats concurrently with first batch
    const networkStatsPromise = fetch(`${webEnv.apiBaseUrl}/v1/network/stats`)
      .then((r) => r.ok ? r.json() as Promise<{ averageLatencyMs?: number }> : null)
      .catch(() => null);

    const BATCH_SIZE = 5;
    const collected: number[] = [];
    try {
      for (let i = 0; i < benchmarkCount; i += BATCH_SIZE) {
        const batchSize = Math.min(BATCH_SIZE, benchmarkCount - i);
        const batchPromises = Array.from({ length: batchSize }, () => {
          const start = Date.now();
          return sendRpcRequest(gatewayBase, mode, body, activeApiKey?.prefix, simulateMode)
            .then(() => Date.now() - start)
            .catch(() => null);
        });
        const results = await Promise.allSettled(batchPromises);
        for (const r of results) {
          if (r.status === "fulfilled" && r.value !== null) {
            collected.push(r.value);
          }
        }
        setBenchmarkResults([...collected]);
        if (i + BATCH_SIZE < benchmarkCount) {
          await new Promise<void>((resolve) => setTimeout(resolve, 200));
        }
      }
    } finally {
      setBenchmarkRunning(false);
      const statsData = await networkStatsPromise;
      if (typeof statsData?.averageLatencyMs === "number") {
        setBenchmarkNetworkAvg(statsData.averageLatencyMs);
      }
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Developer Tools"
        title="API Playground"
        description="Send live JSON-RPC requests to the Fyxvo gateway and inspect responses."
      />

      {!isAuthenticated && (
        <Notice tone="neutral" title="Connect a wallet to run requests">
          The playground works best with an API key from your project. Connect to get started.
        </Notice>
      )}

      {assistantInsertNotice ? (
        <Notice tone="success" title="Assistant example inserted">
          <div className="space-y-2">
            <p>The request builder was prefilled from the assistant response.</p>
            <pre className="max-h-32 overflow-auto rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3 text-xs text-[var(--fyxvo-text)]">
              <code>{assistantInsertNotice}</code>
            </pre>
          </div>
        </Notice>
      ) : null}

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-[300px_1fr_260px]">
        {/* Left: Method selector */}
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)] xl:self-start">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Methods</CardTitle>
              {sessionRequestCount > 0 && (
                <span className="text-xs text-[var(--fyxvo-text-muted)]">
                  {sessionRequestCount} request{sessionRequestCount !== 1 ? "s" : ""} this session
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex gap-1 overflow-x-auto whitespace-nowrap border-b border-[var(--fyxvo-border)] px-4 pb-0 pt-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 inline-block border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? "border-[var(--fyxvo-brand)] text-[var(--fyxvo-text)]"
                      : "border-transparent text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="space-y-0.5 p-2">
              {RPC_METHODS.filter((m) => m.category === selectedCategory).map((m) => (
                <button
                  key={m.method}
                  onClick={() => selectMethod(m)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedMethod.method === m.method
                      ? "bg-brand-500/10 text-[var(--fyxvo-text)] font-medium"
                      : "text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
                  }`}
                >
                  {m.method}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Center: Request builder + response */}
        <div className="space-y-4 min-w-0">
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="font-mono text-base">{selectedMethod.method}</CardTitle>
                    <Badge tone="neutral">{selectedMethod.category}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">{selectedMethod.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {/* Share URL */}
                  <button
                    onClick={copyShareLink}
                    title="Copy shareable link"
                    className="rounded border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-2 py-1 text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
                  >
                    {shareCopied ? "Copied!" : "Share"}
                  </button>
                  {/* Schema toggle */}
                  {selectedMethod.responseSchema && selectedMethod.responseSchema.length > 0 && (
                    <button
                      onClick={() => setSchemaOpen((v) => !v)}
                      className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
                        schemaOpen
                          ? "border-brand-500/50 bg-brand-500/10 text-[var(--fyxvo-text)]"
                          : "border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                      }`}
                    >
                      Schema
                    </button>
                  )}
                </div>
              </div>
              {/* Schema panel */}
              {schemaOpen && selectedMethod.responseSchema && (
                <div className="mt-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Response shape</p>
                  <div className="space-y-1.5">
                    {selectedMethod.responseSchema.map((field) => (
                      <div key={field.key} className="flex flex-wrap items-baseline gap-2">
                        <code className="font-mono text-xs text-brand-400">{field.key}</code>
                        <span className="rounded bg-[var(--fyxvo-panel-soft)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fyxvo-text-muted)]">{field.type}</span>
                        <span className="text-xs text-[var(--fyxvo-text-muted)]">{field.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Compare mode toggle */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Mode</p>
                  <div className="flex gap-2">
                    {!compareMode && (["standard", "priority"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                          mode === m
                            ? "border-brand-500/50 bg-brand-500/10 text-[var(--fyxvo-text)]"
                            : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                    {compareMode && (
                      <span className="rounded-lg border border-brand-500/50 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-[var(--fyxvo-text)]">
                        Standard vs Priority
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={compareMode}
                      onClick={() => { setCompareMode((v) => !v); setResponse(null); setCompareResponse(null); }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        compareMode ? "bg-brand-500" : "bg-[var(--fyxvo-border-strong)]"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${compareMode ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                    <span className="text-xs text-[var(--fyxvo-text-muted)]">Compare</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={simulateMode}
                      onClick={() => setSimulateMode((v) => !v)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        simulateMode ? "bg-amber-500" : "bg-[var(--fyxvo-border-strong)]"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${simulateMode ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                    <span className="text-xs text-[var(--fyxvo-text-muted)]">Simulate</span>
                  </div>
                </div>
              </div>

              {/* API key selector */}
              {portal.apiKeys.filter((k) => k.status === "ACTIVE").length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">API Key</p>
                  <select
                    value={selectedKeyId}
                    onChange={(e) => setSelectedKeyId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
                  >
                    <option value="">Auto-select active key</option>
                    {portal.apiKeys.filter((k) => k.status === "ACTIVE").map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.prefix}… {k.label ? `— ${k.label}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Params + Examples */}
              {selectedMethod.isWebhookTest ? (
                <div className="space-y-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Webhook Test</p>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--fyxvo-text)]">Destination</label>
                    <select
                      value={selectedWebhookTarget}
                      onChange={(e) => setSelectedWebhookTarget(e.target.value)}
                      className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
                    >
                      <option value="custom">Custom webhook URL</option>
                      {projectWebhooks.map((webhook) => (
                        <option key={webhook.id} value={webhook.id}>
                          {webhook.url}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedWebhookTarget !== "custom" ? (
                    <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-3 text-xs text-[var(--fyxvo-text-muted)]">
                      Send a signed test delivery to the selected project webhook and inspect its status,
                      latency, and first 500 response characters.
                    </div>
                  ) : null}
                  {selectedWebhookTarget === "custom" ? (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--fyxvo-text)]">
                        Webhook URL<span className="ml-1 text-rose-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={webhookTestUrl}
                        onChange={(e) => setWebhookTestUrl(e.target.value)}
                        placeholder="https://webhook.site/your-unique-id"
                        className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 font-mono text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
                      />
                    </div>
                  ) : null}
                  {selectedWebhookTarget === "custom" ? (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--fyxvo-text)]">Event type</label>
                      <select
                        value={webhookTestEvent}
                        onChange={(e) => setWebhookTestEvent(e.target.value)}
                        className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
                      >
                        <option value="request.completed">request.completed</option>
                        <option value="balance.low">balance.low</option>
                        <option value="rate_limit.warning">rate_limit.warning</option>
                        <option value="project.activated">project.activated</option>
                      </select>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void sendRequest()}
                    disabled={
                      loading ||
                      (selectedWebhookTarget === "custom"
                        ? !webhookTestUrl.trim()
                        : !portal.selectedProject || !portal.token)
                    }
                    className="w-full rounded-lg bg-[var(--fyxvo-brand)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                  >
                    {loading ? "Sending\u2026" : selectedWebhookTarget === "custom" ? "Send Test Webhook" : "Test Configured Webhook"}
                  </button>
                  {webhookTestResponse !== null && (
                    <div className="space-y-2 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-[var(--fyxvo-text-muted)]">HTTP status</span>
                        <span
                          className={`font-mono text-xs font-semibold ${
                            webhookTestResponse.status >= 200 && webhookTestResponse.status < 300
                              ? "text-emerald-500"
                              : webhookTestResponse.status === 0
                                ? "text-amber-500"
                                : "text-red-500"
                          }`}
                        >
                          {webhookTestResponse.status === 0 ? "CORS / Network" : webhookTestResponse.status}
                        </span>
                        <span className="ml-auto text-xs text-[var(--fyxvo-text-muted)]">{webhookTestResponse.latencyMs}ms</span>
                      </div>
                      <pre className="overflow-x-auto rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-3 text-xs text-[var(--fyxvo-text)]">
                        <code>{webhookTestResponse.body || "(empty)"}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ) : selectedMethod.isBenchmark ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--fyxvo-text)]">
                      RPC method
                    </label>
                    <select
                      value={benchmarkMethod}
                      onChange={(e) => setBenchmarkMethod(e.target.value as typeof benchmarkMethod)}
                      className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
                    >
                      <option value="getSlot">getSlot</option>
                      <option value="getLatestBlockhash">getLatestBlockhash</option>
                      <option value="getBalance">getBalance</option>
                      <option value="getAccountInfo">getAccountInfo</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--fyxvo-text)]">
                      Request count (5{"\u201350"})
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={benchmarkCount}
                      onChange={(e) => setBenchmarkCount(Math.min(50, Math.max(5, Number(e.target.value))))}
                      className="w-32 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void runBenchmark()}
                    disabled={benchmarkRunning || !isAuthenticated}
                    className="w-full rounded-lg bg-[var(--fyxvo-brand)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                  >
                    {benchmarkRunning ? `Running\u2026 (${benchmarkResults.length}/${benchmarkCount})` : "Run Benchmark"}
                  </button>
                  {benchmarkResults.length > 0 && (() => {
                    const maxVal = Math.max(...benchmarkResults);
                    const stats = computeStats(benchmarkResults);
                    const isFasterThanNetwork = benchmarkNetworkAvg !== null && stats !== null && stats.avg < benchmarkNetworkAvg;
                    return (
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                            Latency per request (ms)
                          </p>
                          <div className="overflow-x-auto">
                          <div
                            className="flex items-end gap-1 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3"
                            style={{ minHeight: "60px", minWidth: "400px" }}
                          >
                            {benchmarkResults.map((v, i) => (
                              <div
                                key={i}
                                title={`${v}ms`}
                                style={{
                                  width: "100%",
                                  height: `${Math.max(4, (v / (maxVal || 1)) * 40)}px`,
                                  background:
                                    v > (stats?.avg ?? 0) * 1.5
                                      ? "var(--fyxvo-accent)"
                                      : "var(--fyxvo-brand)",
                                  borderRadius: "2px",
                                  flexShrink: 0,
                                  minWidth: "4px",
                                }}
                              />
                            ))}
                          </div>
                          </div>
                        </div>
                        {stats ? (
                          <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <tbody className="divide-y divide-[var(--fyxvo-border)]">
                              {(
                                [
                                  ["Min", `${stats.min}ms`],
                                  ["Max", `${stats.max}ms`],
                                  ["Avg", `${stats.avg}ms`],
                                  ["Median", `${stats.median}ms`],
                                  ["P95", `${stats.p95}ms`],
                                ] as [string, string][]
                              ).map(([statLabel, value]) => (
                                <tr key={statLabel}>
                                  <td className="py-1.5 text-[var(--fyxvo-text-muted)]">{statLabel}</td>
                                  <td className="py-1.5 text-right font-mono font-medium text-[var(--fyxvo-text)]">
                                    {value}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          </div>
                        ) : null}
                        {stats ? (
                          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-3 space-y-1.5">
                            <p className="text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Comparison</p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[var(--fyxvo-text-muted)]">Your avg</span>
                              <span className="font-mono font-medium text-[var(--fyxvo-text)]">{stats.avg}ms</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[var(--fyxvo-text-muted)]">Network avg</span>
                              <span className="font-mono font-medium text-[var(--fyxvo-text)]">
                                {benchmarkNetworkAvg !== null ? `${benchmarkNetworkAvg}ms` : "—"}
                              </span>
                            </div>
                            {benchmarkNetworkAvg !== null ? (
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--fyxvo-border)]">
                                <span className="text-[var(--fyxvo-text-muted)]">Rating</span>
                                <span className={isFasterThanNetwork ? "text-emerald-500 font-medium" : "text-[var(--fyxvo-text-muted)]"}>
                                  {isFasterThanNetwork ? "Faster than average \u2713" : "Slower than average"}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              ) : selectedMethod.isTraceLookup ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Parameters</p>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--fyxvo-text)]">
                      Trace ID (UUID from X-Fyxvo-Trace-Id header)
                      <span className="ml-1 text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={traceId}
                      onChange={(e) => setTraceId(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 font-mono text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
                    />
                  </div>
                </div>
              ) : selectedMethod.method === "decodeTransaction" ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Parameters</p>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--fyxvo-text)]">
                      Transaction Signature (base58)
                      <span className="ml-1 text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={paramValues["signature"] ?? ""}
                      onChange={(e) => setParamValues((prev) => ({ ...prev, signature: e.target.value }))}
                      placeholder="Paste a base58 transaction signature"
                      className="w-full resize-none rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 font-mono text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
                    />
                  </div>
                </div>
              ) : selectedMethod.params.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Parameters</p>
                    {selectedMethod.examples && selectedMethod.examples.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[var(--fyxvo-text-muted)]">Examples:</span>
                        {selectedMethod.examples.map((ex) => (
                          <button
                            key={ex.label}
                            type="button"
                            onClick={() => setParamValues(ex.params)}
                            className="rounded border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-2 py-0.5 text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
                          >
                            {ex.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedMethod.params.map((param) => (
                    <div key={param.name}>
                      <label className="mb-1 block text-xs font-medium text-[var(--fyxvo-text)]">
                        {param.name}
                        {param.required && <span className="ml-1 text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={paramValues[param.name] ?? ""}
                        onChange={(e) => setParamValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
                        placeholder={param.placeholder}
                        className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 font-mono text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {!selectedMethod.isBenchmark && !selectedMethod.isWebhookTest && (
                <Button
                  onClick={() => void sendRequest()}
                  disabled={loading || !isAuthenticated}
                  className="w-full"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Sending&hellip;
                    </span>
                  ) : selectedMethod.isTraceLookup ? "Look Up Trace" : selectedMethod.method === "decodeTransaction" ? "Decode Transaction" : compareMode ? "Send (Standard + Priority)" : "Send Request"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Simulation mode banner */}
          {simulateMode && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
              <span className="font-semibold">Simulation mode is active.</span>
              {" "}Requests are free and not routed to Solana devnet. Real responses require a funded project balance.
            </div>
          )}

          {/* Loading progress bar */}
          {loading && (
            <div className="h-0.5 w-full overflow-hidden rounded-full bg-[var(--fyxvo-border)]">
              <div className="h-full animate-[progress_1.5s_ease-in-out_infinite] bg-[var(--fyxvo-brand,#7c3aed)] rounded-full" style={{ width: "60%" }} />
            </div>
          )}

          {/* Response(s) */}
          {(response !== null || error !== null || compareResponse !== null || compareError !== null) && (
            compareMode ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Standard response */}
                <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Standard</CardTitle>
                      <div className="flex items-center gap-2">
                        {responseTimeMs !== null && <span className="text-xs text-[var(--fyxvo-text-muted)]">{responseTimeMs}ms</span>}
                        {durationMs !== null && <Badge tone="neutral">{durationMs}ms</Badge>}
                        {response !== null && (
                          <button
                            onClick={() => void navigator.clipboard.writeText(response)}
                            className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {error ? (
                      <Notice tone="warning" title="Request failed">{error}</Notice>
                    ) : (
                      <div className="overflow-x-auto">
                        <pre className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-4 text-xs text-[var(--fyxvo-text)] max-h-80" style={{ wordBreak: "break-all" }}>
                          <code>{response}</code>
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
                {/* Priority response */}
                <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Priority</CardTitle>
                      <div className="flex items-center gap-2">
                        {compareResponseTimeMs !== null && <span className="text-xs text-[var(--fyxvo-text-muted)]">{compareResponseTimeMs}ms</span>}
                        {compareDurationMs !== null && (
                          <Badge tone={compareDurationMs < (durationMs ?? Infinity) ? "success" : "neutral"}>
                            {compareDurationMs}ms
                          </Badge>
                        )}
                        {compareResponse !== null && (
                          <button
                            onClick={() => void navigator.clipboard.writeText(compareResponse)}
                            className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {compareError ? (
                      <Notice tone="warning" title="Request failed">{compareError}</Notice>
                    ) : (
                      <div className="overflow-x-auto">
                        <pre className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-4 text-xs text-[var(--fyxvo-text)] max-h-80" style={{ wordBreak: "break-all" }}>
                          <code>{compareResponse}</code>
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Response</CardTitle>
                    <div className="flex items-center gap-2">
                      {responseTimeMs !== null && <span className="text-xs text-[var(--fyxvo-text-muted)]">{responseTimeMs}ms</span>}
                      {durationMs !== null && <Badge tone="neutral">{durationMs}ms</Badge>}
                      {response !== null && (
                        <button
                          onClick={() => void navigator.clipboard.writeText(response)}
                          className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {error ? (
                    <Notice tone="warning" title="Request failed">{error}</Notice>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <pre className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-4 text-xs text-[var(--fyxvo-text)] max-h-96" style={{ wordBreak: "break-all" }}>
                          <code>{response}</code>
                        </pre>
                      </div>
                      {errorExplanation && (
                        <div className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">{errorExplanation.name}</p>
                          <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">{errorExplanation.explanation}</p>
                        </div>
                      )}
                      {selectedMethod.isTraceLookup && traceLookupDetails ? (
                        <div className="mt-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => void navigator.clipboard.writeText(response ?? "")}
                              className="text-xs text-[var(--fyxvo-brand)] hover:text-brand-600"
                            >
                              Copy raw trace JSON
                            </button>
                            {portal.selectedProject ? (
                              <Link
                                href={`/projects/${portal.selectedProject.slug}`}
                                className="text-xs text-[var(--fyxvo-brand)] hover:text-brand-600"
                              >
                                Open related project request log entry
                              </Link>
                            ) : null}
                          </div>
                          <div className="grid gap-2 text-xs text-[var(--fyxvo-text-muted)] sm:grid-cols-2">
                            <div>Route: <span className="font-mono text-[var(--fyxvo-text)]">{traceLookupDetails.route ?? "—"}</span></div>
                            <div>Method: <span className="font-mono text-[var(--fyxvo-text)]">{traceLookupDetails.method ?? "—"}</span></div>
                            <div>Upstream node: <span className="text-[var(--fyxvo-text)]">{traceLookupDetails.upstreamNode ?? "Managed routing"}</span></div>
                            <div>Region: <span className="text-[var(--fyxvo-text)]">{traceLookupDetails.region ?? "Default region"}</span></div>
                            <div>Cache hit: <span className="text-[var(--fyxvo-text)]">Not recorded for this request log</span></div>
                            <div>Simulated: <span className="text-[var(--fyxvo-text)]">{traceLookupDetails.route?.includes("simulate") ? "Yes" : "No"}</span></div>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>
            )
          )}

          {/* Decoded view — only shown for decodeTransaction */}
          {decodedView !== null && (
            <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <CardTitle>Decoded View</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {decodedView === "error" ? (
                  <Notice tone="warning" title="Could not decode response">
                    The response could not be parsed into a decoded transaction view. Check the raw JSON above.
                  </Notice>
                ) : (
                  <>
                    <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-4 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Transaction Fee</p>
                      <p className="text-sm font-mono text-[var(--fyxvo-text)]">
                        {decodedView.fee !== null ? `${decodedView.fee.toLocaleString()} lamports` : "—"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                        Accounts Involved ({decodedView.accounts.length})
                      </p>
                      <div className="space-y-1">
                        {decodedView.accounts.map((addr, i) => {
                          const knownLabel = KNOWN_PROGRAMS[addr];
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-[var(--fyxvo-text-muted)] w-4">{i}</span>
                              <code className="text-xs font-mono text-[var(--fyxvo-text)]">
                                {truncateAddress(addr)}
                              </code>
                              {knownLabel ? (
                                <span className="text-xs text-[var(--fyxvo-brand)]">{knownLabel}</span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {decodedView.programIds.length > 0 && (
                      <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                          Program Labels
                        </p>
                        <div className="space-y-1.5">
                          {decodedView.programIds.map((id) => {
                            const programLabel = KNOWN_PROGRAMS[id];
                            return (
                              <div key={id} className="flex items-center gap-2">
                                <code className="text-xs font-mono text-[var(--fyxvo-text)]">{truncateAddress(id)}</code>
                                {programLabel ? (
                                  <span className="text-xs font-medium text-[var(--fyxvo-brand)]">{programLabel}</span>
                                ) : (
                                  <a
                                    href={`https://explorer.solana.com/address/${id}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] underline"
                                  >
                                    View on Explorer
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Recipes + Request history */}
        <div className="space-y-4 xl:self-start">
          <PlaygroundRecipesPanel
            projectId={selectedProjectId}
            token={portal.token ?? null}
            currentRecipe={{
              method: selectedMethod.method,
              mode,
              simulationEnabled: simulateMode,
              params: selectedMethod.isTraceLookup
                ? { traceId }
                : paramValues,
            }}
            onLoadRecipe={loadRecipe}
          />

          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>History</CardTitle>
                {history.length > 0 && (
                  <button
                    onClick={() => setHistory([])}
                    className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--fyxvo-text-muted)]">No requests yet</p>
              ) : (
                <div className="divide-y divide-[var(--fyxvo-border)]">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const m = RPC_METHODS.find((r) => r.method === item.method);
                        if (m) selectMethod(m);
                      }}
                      className="w-full px-4 py-3 text-left transition-colors hover:bg-[var(--fyxvo-panel-soft)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-xs font-medium text-[var(--fyxvo-text)]">{item.method}</span>
                        <Badge tone={item.statusCode < 300 ? "success" : "warning"}>{item.statusCode}</Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-[var(--fyxvo-text-muted)]">
                        <span>{item.durationMs}ms</span>
                        <span className="capitalize">{item.mode}</span>
                        <span>{item.requestedAt}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-[var(--fyxvo-panel-soft)]" />}>
      <PlaygroundContent />
    </Suspense>
  );
}
