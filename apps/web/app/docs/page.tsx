"use client";

import { useEffect, useState, useMemo } from "react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { CopyButton } from "../../components/copy-button";
import { PageHeader } from "../../components/page-header";
import { SocialLinkButtons } from "../../components/social-links";
import { ApiExplorer } from "../../components/api-explorer";
import { webEnv } from "../../lib/env";
import { PRICING_LAMPORTS } from "@fyxvo/config/pricing";

const NAV_SECTIONS = [
  { id: "introduction", label: "Introduction", keywords: "overview what is fyxvo devnet rpc relay product" },
  { id: "quickstart", label: "Quickstart", keywords: "start connect wallet create project fund api key request curl" },
  { id: "quickstarts", label: "Quickstarts", keywords: "framework nextjs react node nodejs python rust sdk guide quickstart" },
  { id: "authentication", label: "Authentication", keywords: "wallet auth challenge verify token jwt bearer solana phantom" },
  { id: "funding", label: "Funding", keywords: "sol lamports treasury deposit balance credits prepare sign transaction" },
  { id: "standard-rpc", label: "Standard RPC", keywords: "rpc request jsonrpc endpoint gateway x-api-key getHealth getSlot" },
  { id: "priority-relay", label: "Priority Relay", keywords: "priority relay high throughput fast latency /priority scope" },
  { id: "analytics", label: "Analytics", keywords: "analytics overview stats requests latency error rate monitoring project" },
  { id: "analytics-api", label: "Analytics API", keywords: "analytics stats requests latency error rate monitoring project" },
  { id: "public-stats", label: "Public Stats API", keywords: "public stats api curl node python fetch x-api-key backend service" },
  { id: "api-explorer", label: "API Explorer", keywords: "try it interactive request curl live test endpoint" },
  { id: "webhooks", label: "Webhooks", keywords: "webhook http callback post event funding apikey hmac signature" },
  { id: "team-collaboration", label: "Team Workflows", keywords: "team member invite wallet collaboration owner role notes runbook recipes alerts health archive restore" },
  { id: "playground", label: "Playground", keywords: "playground rpc methods test compare mode schema panel share url examples" },
  { id: "operations-guide", label: "Operations Guide", keywords: "operations monitoring alerts traces webhooks latency success rate cache hit request logs" },
  { id: "release-guide", label: "Release Guide", keywords: "release readiness zero to first request devnet simulation alerts logs health score mainnet preparation" },
  { id: "public-profiles", label: "Public Project Pages", keywords: "public profile page slug badge readme status latency" },
  { id: "sdk-reference", label: "SDK Reference", keywords: "sdk library reference types api endpoint paths" },
  { id: "rate-limits", label: "Rate Limits", keywords: "rate limit 429 throttle bandwidth quota scope" },
  { id: "simulation-mode", label: "Simulation Mode", keywords: "simulation mode simulate free devnet canned response getHealth getSlot getBalance getLatestBlockhash" },
  { id: "api-versioning", label: "API Versioning", keywords: "api versioning v1 breaking changes deprecation header x-fyxvo-api-version" },
  { id: "troubleshooting", label: "Troubleshooting", keywords: "error debug fix 401 403 402 500 403 common issues" },
  { id: "error-reference", label: "Error Reference", keywords: "error reference codes 401 403 402 429 503 gateway api errors" },
  { id: "ci-cd", label: "CI/CD Integration", keywords: "ci cd github actions continuous integration deploy environment variables secrets" },
  { id: "migration-guide", label: "Migration Guide", keywords: "migration guide migrate helius quicknode alchemy switch rpc provider 2-line change" },
  { id: "network-status", label: "Network Status", keywords: "status health uptime live devnet solana network" },
  { id: "status-api", label: "Status API", keywords: "health status capacity incidents calendar public api response monitoring ops" },
  { id: "changelog", label: "Changelog", keywords: "release updates version changes new features" },
  { id: "migration", label: "Migration (Legacy)", keywords: "migrate helius quicknode alchemy switch rpc provider 2-line change" },
  { id: "rate-limits-reference", label: "Rate Limits Reference", keywords: "rate limit table devnet requests per second 429" },
  { id: "error-codes", label: "Error Codes", keywords: "error codes 401 403 402 429 503 gateway api errors reference" },
  { id: "faq", label: "FAQ", keywords: "frequently asked questions faq devnet solana rpc gateway" },
  { id: "rpc-reference", label: "RPC Reference", keywords: "rpc methods reference getSlot getBalance getAccountInfo getBlock sendTransaction solana jsonrpc glossary" },
] as const;

function CodeBlock({ code, label }: { readonly code: string; readonly label?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
      {label ? (
        <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-4 py-2">
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
            {label}
          </span>
          <CopyButton value={code} />
        </div>
      ) : (
        <div className="flex justify-end border-b border-[var(--fyxvo-border)] px-3 py-1.5">
          <CopyButton value={code} />
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-xs leading-6 text-[var(--fyxvo-text-soft)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  readonly id: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
}) {
  return (
    <div className="mb-6">
      {eyebrow ? (
        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--fyxvo-brand)]">{eyebrow}</div>
      ) : null}
      <h2
        id={id}
        className="scroll-mt-24 font-display text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">{description}</p>
      ) : null}
    </div>
  );
}

const QUICKSTART_FRAMEWORKS = ["Next.js", "React", "Node.js", "Python", "Rust"] as const;
type QuickstartFramework = (typeof QUICKSTART_FRAMEWORKS)[number];

export default function DocsPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeQuickstart, setActiveQuickstart] = useState<QuickstartFramework>("Next.js");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const authChallengeCode = `curl -X POST ${webEnv.apiBaseUrl}/v1/auth/challenge \\
  -H "content-type: application/json" \\
  -d '{"walletAddress":"YOUR_WALLET"}'`;

  const authVerifyCode = `# 1. Get challenge — returns the exact message to sign
curl -X POST ${webEnv.apiBaseUrl}/v1/auth/challenge \\
  -H "content-type: application/json" \\
  -d '{"walletAddress":"YOUR_WALLET"}'

# Response: { "walletAddress": "...", "nonce": "...", "message": "fyxvo:YOUR_WALLET:NONCE" }

# 2. Sign the message with your wallet (browser, @solana/wallet-adapter-base)
const encoded = new TextEncoder().encode(message);
const signatureBytes = await wallet.signMessage(encoded);
const signature = bs58.encode(signatureBytes);

# 3. Verify signature and receive JWT
curl -X POST ${webEnv.apiBaseUrl}/v1/auth/verify \\
  -H "content-type: application/json" \\
  -d '{
    "walletAddress": "YOUR_WALLET",
    "message": "<message-from-step-1>",
    "signature": "<base58-signature>"
  }'

# Response: { "token": "eyJ...", "user": { "id": "...", "walletAddress": "...", "role": "MEMBER" } }`;

  const fundingCode = [
    `# 1. Prepare the unsigned funding transaction`,
    `curl -X POST ${webEnv.apiBaseUrl}/v1/projects/YOUR_PROJECT_ID/funding/prepare \\`,
    `  -H "authorization: Bearer YOUR_JWT" \\`,
    `  -H "content-type: application/json" \\`,
    `  -d '{"asset":"SOL","amountLamports":100000000,"funderWalletAddress":"YOUR_WALLET"}'`,
    ``,
    `# Response: { "item": { "id": "FUNDING_ID", "transactionBase64": "<unsigned-tx>", "amount": "100000000" } }`,
    ``,
    `# 2. Decode, sign, and broadcast (using @solana/web3.js)`,
    `import { Transaction, Connection } from "@solana/web3.js";`,
    ``,
    `const fundingItem = response.item;`,
    `const tx = Transaction.from(Buffer.from(fundingItem.transactionBase64, "base64"));`,
    `const signed = await wallet.signTransaction(tx);`,
    `const connection = new Connection("https://api.devnet.solana.com");`,
    `const sig = await connection.sendRawTransaction(signed.serialize());`,
    `await connection.confirmTransaction(sig, "confirmed");`,
    ``,
    `# 3. Verify the confirmed transaction with the API`,
    `curl -X POST ${webEnv.apiBaseUrl}/v1/projects/YOUR_PROJECT_ID/funding/FUNDING_ID/verify \\`,
    `  -H "authorization: Bearer YOUR_JWT" \\`,
    `  -H "content-type: application/json" \\`,
    `  -d '{"signature": "<tx-signature>"}'`,
  ].join("\n");

  const standardRpcCode = `# Standard relay — requires rpc:request scope
curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "content-type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot","params":[]}'

# Also accepts Authorization: Bearer
curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "content-type: application/json" \\
  -H "authorization: Bearer YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getLatestBlockhash","params":[{"commitment":"confirmed"}]}'`;

  const priorityRelayCode = `# Priority relay — requires rpc:request AND priority:relay scopes
curl -X POST ${webEnv.gatewayBaseUrl}/priority \\
  -H "content-type: application/json" \\
  -H "x-api-key: YOUR_PRIORITY_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"sendTransaction","params":["<base64-tx>",{"encoding":"base64","skipPreflight":false}]}'`;

  const analyticsOverviewCode = `curl ${webEnv.apiBaseUrl}/v1/analytics/overview \\
  -H "authorization: Bearer YOUR_JWT"

# Response shape:
# {
#   "item": {
#     "totals": { "projects": 3, "apiKeys": 5, "fundingRequests": 2, "requestLogs": 14200 },
#     "latency": { "averageMs": 42, "maxMs": 312 },
#     "requestsByService": [{ "service": "gateway", "count": 14200 }]
#   }
# }`;

  const analyticsProjectCode = `curl ${webEnv.apiBaseUrl}/v1/analytics/projects/YOUR_PROJECT_ID?range=24h \\
  -H "authorization: Bearer YOUR_JWT"

# Range options: 1h | 6h | 24h | 7d | 30d (default: all time)
# Response shape:
# {
#   "item": {
#     "totals": { "requestLogs": 4800, "apiKeys": 2, "fundingRequests": 1 },
#     "latency": { "averageMs": 38, "maxMs": 210, "p95Ms": 95 },
#     "statusCodes": [{ "statusCode": 200, "count": 4750 }, { "statusCode": 429, "count": 50 }],
#     "recentRequests": [{ "route": "/rpc", "method": "POST", "statusCode": 200, "durationMs": 38 }]
#   }
# }`;

  const sdkInstallNpmCode = `npm install @fyxvo/sdk`;
  const sdkInstallYarnCode = `yarn add @fyxvo/sdk`;
  const sdkInstallPnpmCode = `pnpm add @fyxvo/sdk`;

  const sdkClientCode = `import { createFyxvoClient } from "@fyxvo/sdk";

const client = createFyxvoClient({
  baseUrl: "${webEnv.gatewayBaseUrl}",
  apiKey: process.env.FYXVO_API_KEY,
});`;

  const sdkRpcCode = `// Standard RPC request
const health = await client.rpc({
  id: 1,
  method: "getHealth",
});

// With params
const blockhash = await client.rpc({
  id: 2,
  method: "getLatestBlockhash",
  params: [{ commitment: "confirmed" }],
});

console.log(blockhash.result.value.blockhash);`;

  const sdkPriorityCode = `// Priority relay request (requires priority:relay scoped key)
// Pass the /priority path via the options second argument
const slot = await client.rpc(
  { id: 1, method: "getSlot" },
  { path: "/priority" }
);

if ("result" in slot) {
  const slotNumber = slot.result as number;
  // use slotNumber
}`;

  const sdkErrorCode = `import { FyxvoError, FyxvoApiError } from "@fyxvo/sdk";

try {
  const result = await client.rpc({ id: 1, method: "getHealth" });
} catch (err) {
  if (err instanceof FyxvoApiError) {
    // HTTP-level error from the gateway (4xx / 5xx)
    // err.status holds the HTTP status code, err.message has the description
    const status: number | undefined = err.status;
    const message: string = err.message;
    void status; void message;
  } else if (err instanceof FyxvoError) {
    // SDK-level error (network, timeout, config)
    const message: string = err.message;
    void message;
  }
}`;

  const rateLimitCode = `# The gateway returns 429 when a key exceeds its rate window.
# Response headers include:
#   x-ratelimit-limit:     <requests per window>
#   x-ratelimit-remaining: <remaining in current window>
#   x-ratelimit-reset:     <unix timestamp when the window resets>

# Standard path (rpc:request scope) — 300 req / 60 s per key
# Priority path (priority:relay scope) — 60 req / 60 s per key

# Retry with backoff after a 429:
async function withRetry(fn, maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err?.statusCode === 429 && attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }
}`;

  const pythonRpcCode = `import requests

response = requests.post(
    "https://rpc.fyxvo.com/rpc",
    headers={"x-api-key": "YOUR_KEY", "Content-Type": "application/json"},
    json={"jsonrpc": "2.0", "id": 1, "method": "getHealth", "params": []}
)
print(response.json())`;

  const tsAuthCode = `import { createFyxvoClient } from "@fyxvo/sdk";

// Step 1 — request a challenge
const api = createFyxvoClient({ baseUrl: "${webEnv.apiBaseUrl}" });
const challenge = await api.request<{ message: string; nonce: string }>({
  method: "POST",
  path: "/v1/auth/challenge",
  body: { walletAddress: "YOUR_WALLET_ADDRESS" },
});

// Step 2 — sign the message with your wallet
const encoded = new TextEncoder().encode(challenge.message);
const sigBytes = await wallet.signMessage(encoded);
const signature = bs58.encode(sigBytes);

// Step 3 — verify and receive a JWT
const session = await api.request<{ token: string }>({
  method: "POST",
  path: "/v1/auth/verify",
  body: {
    walletAddress: "YOUR_WALLET_ADDRESS",
    message: challenge.message,
    signature,
  },
});

// Step 4 — use the JWT as a bearer token for subsequent calls
const authedClient = createFyxvoClient({
  baseUrl: "${webEnv.apiBaseUrl}",
  headers: { authorization: \`Bearer \${session.token}\` },
});`;

  const tsApiKeyCode = `// Create a gateway relay API key (requires JWT from auth flow)
const authedClient = createFyxvoClient({
  baseUrl: "${webEnv.apiBaseUrl}",
  headers: { authorization: "Bearer YOUR_JWT" },
});

const created = await authedClient.request<{
  item: { id: string; prefix: string; scopes: string[] };
  plainTextKey: string;
}>({
  method: "POST",
  path: "/v1/api-keys",
  body: { label: "my-relay-key", scopes: ["rpc:request"] },
});

const apiKey = created.plainTextKey;`;

  const tsRpcCode = `import { createFyxvoClient, type RpcResponse } from "@fyxvo/sdk";

// Gateway client — use your relay API key here
const gateway = createFyxvoClient({
  baseUrl: "${webEnv.gatewayBaseUrl}",
  apiKey: process.env.FYXVO_API_KEY,
});

// Standard RPC call
const health = await gateway.rpc<string>({ method: "getHealth" });

// With typed params
interface BlockhashResult {
  blockhash: string;
  lastValidBlockHeight: number;
}
const response: RpcResponse<{ value: BlockhashResult }> = await gateway.rpc({
  id: 1,
  method: "getLatestBlockhash",
  params: [{ commitment: "confirmed" }],
});

if ("result" in response) {
  const blockhash: string = response.result.value.blockhash;
  void blockhash;
}`;

  const healthCheckCode = `# API health
curl ${webEnv.apiBaseUrl}/health
# { "status": "ok", "timestamp": "..." }

# Gateway health
curl ${webEnv.gatewayBaseUrl}/health
# { "status": "ok" }

# Gateway full status (metrics, node count, pricing)
curl ${webEnv.gatewayBaseUrl}/v1/status

# Status page
open ${webEnv.statusPageUrl}`;

  const statusApiHealthCode = `curl ${webEnv.apiBaseUrl}/health

# Public
# Use when you want the fastest readiness check for the control plane.
# Returns service, version, timestamp, and assistant availability.`;

  const statusApiStatusCode = `curl ${webEnv.apiBaseUrl}/v1/status

# Public
# Use when you want richer API runtime context like environment, dependencies,
# and assistant availability for dashboards or release checks.`;

  const statusApiIncidentsCode = `curl ${webEnv.apiBaseUrl}/v1/incidents

# Public
# Use when you want the current incident list and timeline updates for each incident.`;

  const statusApiNetworkCode = `curl ${webEnv.apiBaseUrl}/v1/network/stats
curl ${webEnv.apiBaseUrl}/v1/network/capacity
curl ${webEnv.apiBaseUrl}/v1/network/health-calendar

# Public
# Use for high-level usage, capacity posture, and recent health history.`;

  const statusApiPublicProjectCode = `curl ${webEnv.apiBaseUrl}/v1/projects/YOUR_PROJECT_ID/stats/public \\
  -H "x-api-key: YOUR_API_KEY"

# Authenticated with a project API key
# Use from backend services when you want public-safe project usage stats.`;

  const statusSnapshotCode = `# Status snapshot sharing
# Open ${webEnv.statusPageUrl}
# Use "Copy snapshot" to capture current API health, gateway health,
# protocol readiness, and active incident count as shareable text.`;

  const visibleSections = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return NAV_SECTIONS.map((s) => s.id);
    return NAV_SECTIONS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.keywords.toLowerCase().includes(q)
    ).map((s) => s.id);
  }, [debouncedQuery]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="relative">
      <div className="lg:flex lg:gap-10 xl:gap-14">
        {/* Sidebar — lg+ only */}
        <aside className="hidden lg:block lg:w-56 xl:w-60 shrink-0">
          <div className="sticky top-24 space-y-3">
            <div className="relative">
              <input
                type="search"
                placeholder="Search sections…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-[var(--fyxvo-bg)] transition"
              />
            </div>
            <nav className="flex flex-col gap-0.5">
              {NAV_SECTIONS.map((section) => {
                const visible = visibleSections.includes(section.id);
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollTo(section.id)}
                    className={[
                      "rounded-lg px-3 py-1.5 text-left text-sm transition",
                      visible
                        ? "text-[var(--fyxvo-text-soft)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
                        : "text-[var(--fyxvo-text-muted)] opacity-40 cursor-default",
                    ].join(" ")}
                    disabled={!visible}
                  >
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 space-y-14">
          {/* Page header */}
          <PageHeader
            eyebrow="Docs"
            title="Start from wallet auth to first request in minutes."
            description="This guide covers the full self-serve path on Fyxvo devnet. Wallet auth, project activation, SOL funding, relay usage, analytics, and SDK reference — all in one place."
          />

          <Notice tone="neutral" title="Devnet only">
            Fyxvo is live on Solana devnet today. SOL is the active funding path. USDC remains
            intentionally configuration-gated until it is explicitly enabled for a deployment.
          </Notice>

          <Notice tone="neutral" title="Need a direct line while integrating?">
            For launch-fit questions, issue reports, or managed rollout conversations, use the
            community paths below or the contact page.
            <div className="mt-4">
              <SocialLinkButtons />
            </div>
          </Notice>

          {/* ── Introduction ─────────────────────────────────────── */}
          <section id="introduction">
            <SectionHeading
              id="introduction"
              eyebrow="Section 1"
              title="Introduction"
              description="What Fyxvo is, who it is for, and what is live on devnet today."
            />
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
                <CardHeader>
                  <CardTitle>What is Fyxvo</CardTitle>
                  <CardDescription>
                    A developer platform for Solana teams that need a real, funded RPC relay path —
                    not a mock dashboard.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                  Fyxvo provides wallet-authenticated project management, on-chain SOL funding, a
                  standard relay, a separate priority relay path, per-project analytics, and a public
                  status surface. Everything connects from wallet identity to observable traffic in a
                  single controlled flow.
                </CardContent>
              </Card>
              <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
                <CardHeader>
                  <CardTitle>Who it is for</CardTitle>
                  <CardDescription>
                    Solana teams validating funded RPC, priority relay, and analytics before widening
                    traffic.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                  Use Fyxvo if you want to confirm wallet-authenticated project control, SOL-funded
                  gateway access, priority routing behavior, request analytics, and a managed launch
                  path without building your own infrastructure first.
                </CardContent>
              </Card>
              <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
                <CardHeader>
                  <CardTitle>What is live today</CardTitle>
                  <CardDescription>
                    The full devnet path is active: wallet auth, project activation, SOL funding,
                    standard relay, priority relay, analytics, and public status.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                  USDC remains gated and the current operator topology is managed infrastructure —
                  not an open external operator marketplace. Both limits are stated explicitly
                  throughout the product and in these docs.
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ── Quickstart ───────────────────────────────────────── */}
          <section id="quickstart">
            <SectionHeading
              id="quickstart"
              eyebrow="Section 2"
              title="Quickstart"
              description="The four-step path from wallet connect to first confirmed relay request."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  step: "Step 1",
                  title: "Connect a wallet",
                  body: "Open the dashboard. The app requests a challenge from the API, asks the connected wallet to sign it, and exchanges that signature for a JWT-backed API session. Phantom is the most direct path for browser-first devnet usage.",
                },
                {
                  step: "Step 2",
                  title: "Create and activate a project",
                  body: "Project creation prepares the on-chain activation transaction immediately. The project becomes usable as soon as the wallet signs and devnet confirms it. The API derives the PDA and prepares everything — you only need to sign.",
                },
                {
                  step: "Step 3",
                  title: "Fund with SOL",
                  body: "Prepare a SOL funding transaction from the project page, review the lamport amount, sign it in the wallet, and wait for API verification. The API then refreshes the project's on-chain balance view so the gateway can accept traffic.",
                },
                {
                  step: "Step 4",
                  title: "Issue a key and send traffic",
                  body: "Generate a relay key scoped to rpc:request. Copy the /rpc endpoint and send a small JSON-RPC request. That first request should appear in project analytics and on the status surface within seconds.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5"
                >
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                    {item.step}
                  </div>
                  <div className="mt-2 text-base font-semibold text-[var(--fyxvo-text)]">
                    {item.title}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Five Minute Quickstart */}
          <section id="five-minute-quickstart" className="rounded-[1.5rem] border border-[var(--fyxvo-brand)]/20 bg-[var(--fyxvo-brand-subtle)] p-6 space-y-5">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--fyxvo-brand)] mb-1">Complete working example</div>
              <h3 className="text-xl font-semibold text-[var(--fyxvo-text)]">Five Minute Quickstart</h3>
              <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">
                From zero to a live devnet relay request using curl only. No SDK required.
              </p>
            </div>
            <CodeBlock
              label="Step 1 — Request an auth challenge"
              code={`curl -s -X POST ${webEnv.apiBaseUrl}/v1/auth/challenge \\
  -H "content-type: application/json" \\
  -d '{"walletAddress":"YOUR_WALLET_ADDRESS_BASE58"}'

# Save the nonce and message from the response
# { "walletAddress": "...", "nonce": "abc123", "message": "Fyxvo Authentication\\nWallet: ...\\nNonce: abc123\\n..." }`}
            />
            <CodeBlock
              label="Step 2 — Sign the message with your wallet CLI (e.g. solana-keygen)"
              code={`# Sign the exact message string returned from the challenge endpoint.
# Using the Solana CLI (base58 output):
echo -n "Fyxvo Authentication\\nWallet: YOUR_WALLET\\nNonce: abc123\\n..." | \\
  solana sign-offchain-message - --keypair ~/.config/solana/id.json

# Or use @solana/wallet-adapter-base in the browser:
# const sig = await wallet.signMessage(Buffer.from(message));
# const sigBase58 = bs58.encode(sig);`}
            />
            <CodeBlock
              label="Step 3 — Verify and get your JWT"
              code={`curl -s -X POST ${webEnv.apiBaseUrl}/v1/auth/verify \\
  -H "content-type: application/json" \\
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS_BASE58",
    "message": "THE_EXACT_CHALLENGE_MESSAGE",
    "signature": "YOUR_BASE58_SIGNATURE"
  }'

# { "token": "eyJhbGci...", "user": { "walletAddress": "...", "role": "MEMBER" } }
export JWT="eyJhbGci..."`}
            />
            <CodeBlock
              label="Step 4 — Issue an API key (after creating and funding a project in the dashboard)"
              code={`curl -s -X POST ${webEnv.apiBaseUrl}/v1/projects/YOUR_PROJECT_ID/api-keys \\
  -H "authorization: Bearer $JWT" \\
  -H "content-type: application/json" \\
  -d '{"label":"my-key","scopes":["project:read","rpc:request"]}'

# { "item": { "id": "...", "prefix": "fyxvo_live_...", ... }, "plainTextKey": "fyxvo_live_...secret" }
export API_KEY="fyxvo_live_...secret"`}
            />
            <CodeBlock
              label="Step 5 — Send your first relay request"
              code={`curl -s -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "content-type: application/json" \\
  -H "x-api-key: $API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# { "jsonrpc": "2.0", "result": "ok", "id": 1 }

# Priority relay (requires priority:relay scope):
curl -s -X POST ${webEnv.gatewayBaseUrl}/priority \\
  -H "content-type: application/json" \\
  -H "x-api-key: $API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}'`}
            />
            <Notice tone="success" title="That's it">
              Your first request is now in the relay logs. Check the Analytics page to see it appear within seconds. Fund more SOL to increase capacity — {PRICING_LAMPORTS.standard.toLocaleString()} lamports per standard request, {PRICING_LAMPORTS.computeHeavy.toLocaleString()} per compute-heavy, {PRICING_LAMPORTS.priority.toLocaleString()} per priority.
            </Notice>
          </section>

          {/* ── Framework Quickstarts ────────────────────────────── */}
          <section id="quickstarts">
            <SectionHeading
              id="quickstarts"
              eyebrow="Quickstarts"
              title="Framework Quickstarts"
              description="Ready-to-run examples for the most common Solana development environments."
            />
            <div className="flex gap-1 border-b border-[var(--fyxvo-border)] mb-6">
              {QUICKSTART_FRAMEWORKS.map((fw) => (
                <button
                  key={fw}
                  type="button"
                  onClick={() => setActiveQuickstart(fw)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeQuickstart === fw
                      ? "border-b-2 border-[var(--fyxvo-brand)] text-[var(--fyxvo-text)]"
                      : "text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                  }`}
                >
                  {fw}
                </button>
              ))}
            </div>

            {activeQuickstart === "Next.js" && (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  Server component example using <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs">@solana/web3.js</code> in a Next.js App Router route handler.
                </p>
                <CodeBlock
                  label="app/api/solana/route.ts"
                  code={`// app/api/solana/route.ts
import { Connection } from "@solana/web3.js";

const connection = new Connection(
  \`https://rpc.fyxvo.com/rpc?api-key=\${process.env.FYXVO_API_KEY}\`
);

export async function GET() {
  const slot = await connection.getSlot();
  return Response.json({ slot });
}`}
                />
              </div>
            )}

            {activeQuickstart === "React" && (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  Client component using the JSON-RPC protocol directly with <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs">fetch</code> and Vite environment variables.
                </p>
                <CodeBlock
                  label="SlotDisplay.tsx"
                  code={`import { useEffect, useState } from "react";

const RPC_URL = \`https://rpc.fyxvo.com/rpc?api-key=\${import.meta.env.VITE_FYXVO_API_KEY}\`;

export function SlotDisplay() {
  const [slot, setSlot] = useState<number | null>(null);

  useEffect(() => {
    fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSlot", params: [] }),
    })
      .then((r) => r.json())
      .then((d) => setSlot(d.result as number));
  }, []);

  return <div>Current slot: {slot ?? "loading..."}</div>;
}`}
                />
              </div>
            )}

            {activeQuickstart === "Node.js" && (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  TypeScript Node.js script using the Fyxvo SDK to fetch the latest blockhash.
                </p>
                <CodeBlock
                  label="index.ts"
                  code={`import { FyxvoClient } from "@fyxvo/sdk";

const client = new FyxvoClient({ apiKey: process.env.FYXVO_API_KEY! });

async function main() {
  const response = await client.rpc({
    id: 1,
    method: "getLatestBlockhash",
    params: [],
  });
  console.log(response);
}

main();`}
                />
              </div>
            )}

            {activeQuickstart === "Python" && (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  Python script using <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs">requests</code> to call the Fyxvo RPC endpoint.
                </p>
                <CodeBlock
                  label="main.py"
                  code={`import requests
import os

response = requests.post(
    "https://rpc.fyxvo.com/rpc",
    headers={"x-api-key": os.getenv("FYXVO_API_KEY")},
    json={"jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash", "params": []},
)
print(response.json())`}
                />
              </div>
            )}

            {activeQuickstart === "Rust" && (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  Rust async example using <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs">reqwest</code> and <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs">serde_json</code>.
                </p>
                <CodeBlock
                  label="src/main.rs"
                  code={`use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let mut headers = HeaderMap::new();
    headers.insert("x-api-key", HeaderValue::from_str(&std::env::var("FYXVO_API_KEY")?)?);
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

    let body = json!({"jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash", "params": []});

    let resp = client
        .post("https://rpc.fyxvo.com/rpc")
        .headers(headers)
        .json(&body)
        .send()
        .await?;

    println!("{}", resp.text().await?);
    Ok(())
}`}
                />
              </div>
            )}
          </section>

          {/* ── Authentication ───────────────────────────────────── */}
          <section id="authentication">
            <SectionHeading
              id="authentication"
              eyebrow="Section 3"
              title="Authentication"
              description="Wallet-signed JWT flow: challenge, sign, verify."
            />
            <div className="space-y-5">
              <Notice tone="neutral" title="How the wallet session works">
                The API issues a short-lived challenge string. The wallet signs it off-chain. The
                signed payload is exchanged for a JWT. That JWT becomes the bearer token for all
                authenticated API actions: project management, funding, analytics, and key
                management.
              </Notice>
              <CodeBlock code={authChallengeCode} label="Step 1 — Request a challenge" />
              <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  Step 2 — Sign in the browser
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  Use <code className="text-[var(--fyxvo-brand)]">wallet.signMessage(Buffer.from(challenge))</code> from{" "}
                  <code className="text-[var(--fyxvo-brand)]">@solana/wallet-adapter-base</code>. Convert the
                  resulting{" "}
                  <code className="text-[var(--fyxvo-brand)]">Uint8Array</code> signature to base58 before
                  sending.
                </p>
              </div>
              <CodeBlock code={authVerifyCode} label="Full auth flow" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Notice tone="neutral" title="JWT expiry">
                  Tokens expire after 24 hours. Re-authenticate by repeating the challenge + verify
                  flow. There is no refresh token endpoint; the wallet signs a new challenge each
                  time.
                </Notice>
                <Notice tone="neutral" title="Supported wallets">
                  Phantom, Solflare, Backpack, and any Wallet Standard compatible wallet work through
                  the Solana wallet adapter layer. Phantom is the fastest for browser-first devnet
                  usage.
                </Notice>
              </div>
            </div>
          </section>

          {/* ── Funding ──────────────────────────────────────────── */}
          <section id="funding">
            <SectionHeading
              id="funding"
              eyebrow="Section 4"
              title="Funding"
              description="SOL funding flow on devnet — prepare, sign, verify."
            />
            <div className="space-y-5">
              <Notice tone="success" title="SOL is live on devnet">
                The full SOL funding path is active. Fund your devnet wallet first (via the Solana
                faucet), then fund the project through Fyxvo. That keeps the control plane, Anchor
                program, and gateway aligned before you scale request volume.
              </Notice>
              <CodeBlock code={fundingCode} label="Prepare, sign, and verify a funding transaction" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Notice tone="neutral" title="Unsigned transaction review">
                  The API returns the unsigned transaction encoded in base64. Decode and inspect it
                  before signing. This keeps the funding flow explicit and auditable.
                </Notice>
                <Notice tone="neutral" title="USDC stays gated">
                  USDC funding exists in the protocol but is configuration-gated. It will not accept
                  USDC transfers until the deployment explicitly enables it via runtime config.
                </Notice>
              </div>
            </div>
          </section>

          {/* ── Standard RPC ─────────────────────────────────────── */}
          <section id="standard-rpc">
            <SectionHeading
              id="standard-rpc"
              eyebrow="Section 5"
              title="Standard RPC"
              description="Send standard JSON-RPC traffic through the /rpc relay endpoint."
            />
            <div className="space-y-5">
              <Notice tone="neutral" title="Required scope">
                Keys used on the standard path must carry the{" "}
                <code className="text-[var(--fyxvo-brand)]">rpc:request</code> scope. Under-scoped keys receive
                a 403, not silent broad access.
              </Notice>
              <CodeBlock code={standardRpcCode} label="Standard relay request" />
              <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  What the gateway does
                </div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  <li>Validates the API key and checks its scope</li>
                  <li>Checks the project's funded SOL balance against the request cost</li>
                  <li>Routes to the upstream Solana RPC node pool with fallback</li>
                  <li>Logs the request, latency, and result for analytics rollups</li>
                  <li>Deducts the lamport cost from the project balance</li>
                </ul>
              </div>
              <Notice tone="neutral" title="Endpoint">
                Standard path: <code className="text-[var(--fyxvo-brand)]">{webEnv.gatewayBaseUrl}/rpc</code>
              </Notice>
            </div>
          </section>

          {/* ── Priority Relay ───────────────────────────────────── */}
          <section id="priority-relay">
            <SectionHeading
              id="priority-relay"
              eyebrow="Section 6"
              title="Priority Relay"
              description="Latency-sensitive traffic on the /priority endpoint with a separately scoped key."
            />
            <div className="space-y-5">
              <Notice tone="neutral" title="Required scope">
                Priority keys must carry both <code className="text-[var(--fyxvo-brand)]">rpc:request</code>{" "}
                and <code className="text-[var(--fyxvo-brand)]">priority:relay</code> scopes. Sending a standard
                key to <code className="text-[var(--fyxvo-brand)]">/priority</code> returns 403.
              </Notice>
              <CodeBlock code={priorityRelayCode} label="Priority relay request" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)] mb-3">
                    Standard vs priority
                  </div>
                  <table className="w-full text-sm text-[var(--fyxvo-text-soft)]">
                    <thead>
                      <tr className="border-b border-[var(--fyxvo-border)]">
                        <th className="pb-2 text-left font-medium text-[var(--fyxvo-text)]">
                          Property
                        </th>
                        <th className="pb-2 text-left font-medium text-[var(--fyxvo-text)]">
                          Standard
                        </th>
                        <th className="pb-2 text-left font-medium text-[var(--fyxvo-text)]">
                          Priority
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--fyxvo-border)]">
                      <tr>
                        <td className="py-2">Endpoint</td>
                        <td className="py-2">/rpc</td>
                        <td className="py-2">/priority</td>
                      </tr>
                      <tr>
                        <td className="py-2">Scope</td>
                        <td className="py-2">rpc:request</td>
                        <td className="py-2">+ priority:relay</td>
                      </tr>
                      <tr>
                        <td className="py-2">Rate limit</td>
                        <td className="py-2">300 / min</td>
                        <td className="py-2">60 / min</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <Notice tone="neutral" title="Why they are separate">
                  Keeping standard and priority traffic on separate paths gives teams clearer pricing,
                  independent rate windows, and better operational discipline. A single key cannot
                  accidentally consume the priority budget.
                </Notice>
              </div>
            </div>
          </section>

          {/* ── Analytics ────────────────────────────────────────── */}
          <section id="analytics">
            <SectionHeading
              id="analytics"
              eyebrow="Section 7"
              title="Analytics"
              description="Monitor request volume, latency, and errors across your Fyxvo projects."
            />
            <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              Fyxvo provides a two-level analytics surface: an overview endpoint that aggregates totals across all your projects, and a per-project endpoint that surfaces method breakdowns, latency percentiles, status code distributions, and recent error events. Both endpoints require a valid JWT and respect the standard rate limit window.
            </p>
          </section>

          {/* ── Analytics API ────────────────────────────────────── */}
          <section id="analytics-api">
            <SectionHeading
              id="analytics-api"
              eyebrow="Section 7"
              title="Analytics API"
              description="Fetch usage data across all projects or drill into a specific project."
            />
            <div className="space-y-5">
              <CodeBlock
                code={analyticsOverviewCode}
                label={`GET ${webEnv.apiBaseUrl}/v1/analytics/overview`}
              />
              <CodeBlock
                code={analyticsProjectCode}
                label={`GET ${webEnv.apiBaseUrl}/v1/analytics/projects/:id`}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: "Overview endpoint",
                    body: "Aggregates totals across all projects owned by the authenticated wallet: total requests, success rate, average latency, and 24-hour rolling count.",
                  },
                  {
                    label: "Project endpoint",
                    body: "Returns per-project metrics including method breakdown, recent error log, and latency percentiles for both standard and priority paths.",
                  },
                  {
                    label: "Auth required",
                    body: "Both endpoints require a valid JWT Bearer token in the Authorization header. Use the wallet auth flow to obtain one.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
                  >
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                      {item.label}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="public-stats">
            <SectionHeading
              id="public-stats"
              eyebrow="Project API"
              title="Public Stats API"
              description="Read project-level public stats with a project-scoped API key from your backend services."
            />
            <div className="space-y-5">
              <Notice tone="warning" title="Keep keys off the client">
                Pass <code className="font-mono text-xs">x-api-key</code> from a backend service, serverless function, or CI job. Do not ship project keys in browser bundles.
              </Notice>
              <CodeBlock
                label="curl"
                code={`curl ${webEnv.apiBaseUrl}/v1/projects/YOUR_PROJECT_ID/stats/public \\
  -H "x-api-key: $FYXVO_API_KEY"`}
              />
              <CodeBlock
                label="JavaScript fetch (server-side)"
                code={`const response = await fetch("${webEnv.apiBaseUrl}/v1/projects/YOUR_PROJECT_ID/stats/public", {
  headers: {
    "x-api-key": process.env.FYXVO_API_KEY!,
  },
  cache: "no-store",
});

const stats = await response.json();
console.log(stats);`}
              />
              <CodeBlock
                label="Node.js"
                code={`import process from "node:process";

const response = await fetch("${webEnv.apiBaseUrl}/v1/projects/YOUR_PROJECT_ID/stats/public", {
  headers: {
    "x-api-key": process.env.FYXVO_API_KEY ?? "",
  },
});

console.log(await response.json());`}
              />
              <CodeBlock
                label="Python"
                code={`import os
import requests

response = requests.get(
    "${webEnv.apiBaseUrl}/v1/projects/YOUR_PROJECT_ID/stats/public",
    headers={"x-api-key": os.environ["FYXVO_API_KEY"]},
    timeout=10,
)

print(response.json())`}
              />
            </div>
          </section>

          {/* ── API Explorer ────────────────────────────────────── */}
          <section id="api-explorer">
            <SectionHeading
              id="api-explorer"
              eyebrow="Interactive"
              title="API Explorer"
              description="Try live API endpoints directly from the docs. Paste your JWT token to test authenticated routes."
            />
            <ApiExplorer />
          </section>

          {/* ── Webhooks ────────────────────────────────────── */}
          <section id="webhooks">
            <SectionHeading
              id="webhooks"
              eyebrow="Platform"
              title="Webhooks"
              description="Receive HTTP POST callbacks when events happen in your project."
            />
            <div className="space-y-5">
              <p className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                Webhooks let you integrate Fyxvo events into your own systems. Every delivery includes an{" "}
                <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs">x-fyxvo-signature</code> header
                with format <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs">sha256={"<hex>"}</code>.
              </p>
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Supported events</p>
                <div className="flex flex-wrap gap-2">
                  {["funding.confirmed", "apikey.created", "apikey.revoked", "balance.low", "project.activated"].map((e) => (
                    <code key={e} className="rounded border border-[var(--fyxvo-border)] px-2 py-0.5 text-xs text-[var(--fyxvo-text-soft)] font-mono">{e}</code>
                  ))}
                </div>
              </div>
              <CodeBlock
                label="Create a webhook"
                code={`curl -X POST ${webEnv.apiBaseUrl}/v1/projects/YOUR_PROJECT_ID/webhooks \\
  -H "authorization: Bearer YOUR_JWT" \\
  -H "content-type: application/json" \\
  -d '{"url":"https://your-server.example.com/webhook","events":["funding.confirmed","balance.low"]}'`}
              />
              <CodeBlock
                label="Test a webhook"
                code={`curl -X POST ${webEnv.apiBaseUrl}/v1/projects/YOUR_PROJECT_ID/webhooks/WEBHOOK_ID/test \\
  -H "authorization: Bearer YOUR_JWT"`}
              />
              <CodeBlock
                label="Signature verification (Node.js)"
                code={`const crypto = require('crypto');
const sig = req.headers['x-fyxvo-signature'];
const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
if (sig !== computed) return res.status(401).send('Unauthorized');`}
              />
              <Notice tone="neutral" title="Need to debug a signature mismatch?">
                Open the webhook signature debugger in project settings to paste the payload, secret, and{" "}
                <code className="font-mono text-xs">x-fyxvo-signature</code> header, verify the computed HMAC, and copy Node.js or Python validation snippets without leaving Fyxvo.
              </Notice>
              <Notice tone="neutral" title="Retry behavior">
                If your endpoint is unreachable, Fyxvo retries once after 30 seconds. After two failures the webhook remains active but{" "}
                <code className="font-mono text-xs">lastTriggeredAt</code> is not updated. URLs must be HTTPS — localhost and private IP ranges are blocked.
              </Notice>
            </div>
          </section>

          {/* ── Team Collaboration ────────────────────────────────────── */}
          <section id="team-collaboration">
            <SectionHeading
              id="team-collaboration"
              eyebrow="Platform"
              title="Team Collaboration"
              description="Invite team members to your project by Solana wallet address."
            />
            <div className="space-y-5">
              <p className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                Project owners can invite other Fyxvo users by wallet address. Invitations are pending until the invitee accepts via{" "}
                <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs">PATCH /v1/projects/:id/members/:memberId/accept</code>.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Notice tone="neutral" title="Member permissions">
                  Members can view analytics and API keys but cannot delete the project or change ownership. Only the project owner can invite or remove members.
                </Notice>
                <Notice tone="neutral" title="Team management">
                  Team management is in Settings → Team on the project page. Pending invitations are shown until accepted or removed.
                </Notice>
              </div>
              <CodeBlock
                label="Invite a member"
                code={`curl -X POST ${webEnv.apiBaseUrl}/v1/projects/YOUR_PROJECT_ID/members/invite \\
  -H "authorization: Bearer YOUR_JWT" \\
  -H "content-type: application/json" \\
  -d '{"walletAddress":"MEMBER_WALLET_ADDRESS"}'`}
              />
              <CodeBlock
                label="List members"
                code={`curl ${webEnv.apiBaseUrl}/v1/projects/YOUR_PROJECT_ID/members \\
  -H "authorization: Bearer YOUR_JWT"`}
              />
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: "Use notes as the runbook",
                    body: "Keep overview, owner notes, runbook steps, known issues, and links in Project settings so the whole team shares the same operational handbook.",
                  },
                  {
                    title: "Share playground recipes safely",
                    body: "Use saved recipes for debugging, benchmarks, balance checks, or webhooks, then share the project-scoped recipe link with teammates who already belong to the project.",
                  },
                  {
                    title: "Operate from alerts",
                    body: "Treat the alert center as a shared inbox: acknowledge an alert when someone is investigating it, resolve it when the condition clears, and keep the history visible for later review.",
                  },
                  {
                    title: "Interpret health honestly",
                    body: "The project health score is a readiness checklist, not a vanity score. Use the breakdown and weekly trend to see whether activation, funding, keys, traffic, webhook health, and team setup are improving.",
                  },
                  {
                    title: "Manage API keys safely",
                    body: "Label keys clearly, add expiries when a client should have a bounded lifetime, rotate compromised keys immediately, and export metadata instead of sharing raw secrets.",
                  },
                  {
                    title: "Archive and restore deliberately",
                    body: "Archive a project when traffic has stopped or ownership has changed. Restore it when the team is ready to operate it again, and let the activity timeline capture that handoff.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                    <div className="text-sm font-semibold text-[var(--fyxvo-text)]">{item.title}</div>
                    <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Public Project Pages ────────────────────────────────────── */}
          <section id="public-profiles">
            <SectionHeading
              id="public-profiles"
              eyebrow="Platform"
              title="Public Project Pages"
              description="Share your project's aggregate stats publicly — no API key required."
            />
            <div className="space-y-5">
              <p className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                Enable a public URL for your project from Settings → Project settings → Public profile. The public page at{" "}
                <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs">/p/[your-slug]</code>{" "}
                shows total requests and average latency. No API keys or balances are shown.
              </p>
              <Notice tone="neutral" title="README badge">
                Add a live status badge to your GitHub README. The badge shows latency and updates every 5 minutes via CDN cache.
              </Notice>
              <CodeBlock
                label="README badge markdown"
                code={`[![Fyxvo Status](https://api.fyxvo.com/badge/project/YOUR_SLUG)](https://www.fyxvo.com/p/YOUR_SLUG)`}
              />
            </div>
          </section>

          {/* ── Playground ────────────────────────────────────── */}
          <section id="playground" className="scroll-mt-20">
            <h2 className="mb-4 text-xl font-semibold text-[var(--fyxvo-text)]">Playground</h2>
            <p className="mb-4 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
              The <a href="/playground" className="text-[var(--fyxvo-brand)] underline">API Playground</a> lets you send live JSON-RPC requests to the Fyxvo gateway and inspect responses without writing any code.
            </p>
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <h3 className="mb-2 text-sm font-semibold text-[var(--fyxvo-text)]">Compare Mode</h3>
                <p className="text-xs leading-5 text-[var(--fyxvo-text-muted)]">Toggle Compare in the request builder to run the same request on both the standard and priority paths simultaneously. The priority response badge turns green when it is faster.</p>
              </div>
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <h3 className="mb-2 text-sm font-semibold text-[var(--fyxvo-text)]">Schema Panel</h3>
                <p className="text-xs leading-5 text-[var(--fyxvo-text-muted)]">Click Schema next to any method to see the expected response shape — field names, types, and descriptions — before you send the request.</p>
              </div>
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <h3 className="mb-2 text-sm font-semibold text-[var(--fyxvo-text)]">Shareable URLs</h3>
                <p className="text-xs leading-5 text-[var(--fyxvo-text-muted)]">Click Share to encode the current method and parameters into the URL. Send the link to a colleague and they will land on the same request configuration.</p>
              </div>
            </div>
          </section>

          <section id="operations-guide">
            <SectionHeading
              id="operations-guide"
              eyebrow="Runbook"
              title="Operations Guide"
              description="Use these habits and product surfaces to operate a real integration day to day."
            />
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: "Monitor gateway health",
                    body: `Watch ${webEnv.siteUrl}/status for API and gateway condition, then compare that signal with your project-level request log explorer when an integration starts failing.`,
                  },
                  {
                    title: "Read status page signals",
                    body: "Treat incidents and component changes as broad infrastructure signals. Treat project analytics, request logs, and alert center entries as your integration-specific signal.",
                  },
                  {
                    title: "Investigate webhook failures",
                    body: "Start in Settings or the alert center, inspect the delivery attempt, compare the next retry time, and replay with the playground webhook tester before changing server code.",
                  },
                  {
                    title: "Use trace IDs",
                    body: "Copy the X-Fyxvo-Trace-Id header from a request response, then open Trace Lookup in the playground or the request log explorer to inspect upstream node, region, latency, and status.",
                  },
                  {
                    title: "Interpret latency, success rate, and cache hit rate",
                    body: "Latency trends tell you when standard routing is enough, success rate tells you whether the integration is healthy, and cache hits show when repeated reads are being served efficiently.",
                  },
                  {
                    title: "Debug balance-related issues",
                    body: "If traffic stops unexpectedly, check spendable SOL credits first, then funding history, then request logs for 402-style or gateway funding errors before assuming the RPC itself is down.",
                  },
                  {
                    title: "Use simulation mode safely",
                    body: "Simulation mode is ideal for payload validation, teammate onboarding, and reproducing read-only examples without burning funded credits. Switch it off before validating real throughput or funding posture.",
                  },
                  {
                    title: "Use request logs and the alert center together",
                    body: "Use the alert center to spot what changed, then jump into request logs filtered by method, key, status, or mode to isolate the exact project traffic behind the alert.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
                  >
                    <div className="text-sm font-semibold text-[var(--fyxvo-text)]">{item.title}</div>
                    <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.body}</p>
                  </div>
                ))}
              </div>
              <Notice tone="neutral" title="Good operator loop">
                Start with status, confirm the project and time range, inspect request logs, follow a trace when needed, verify funding posture, then replay or simulate the request in the playground before making code changes.
              </Notice>
            </div>
          </section>

          <section id="release-guide">
            <SectionHeading
              id="release-guide"
              eyebrow="Release"
              title="Release Guide"
              description="A practical path from first wallet connection to a stable devnet integration that the team can actually operate."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Run a paid devnet beta first",
                  body: "The next honest commercial step is a managed paid beta on devnet: pre-funded project credits, budgets, hard stops, alerts, and direct operator support before any mainnet claim.",
                },
                {
                  title: "Go from zero to first request",
                  body: "Connect a wallet, create a project, activate it, fund it with a small devnet SOL amount, create one API key, and send one standard RPC request through the hosted gateway.",
                },
                {
                  title: "Fund and test safely on devnet",
                  body: "Use small amounts, treat devnet funding as workflow validation, and confirm that analytics, request logs, and alerts respond before trying larger evaluation traffic.",
                },
                {
                  title: "Use simulation before real request flow",
                  body: "Run the request shape through simulation mode first when onboarding a teammate or verifying payload structure, then switch to live funded flow when you need real routing and accounting.",
                },
                {
                  title: "Monitor once traffic starts",
                  body: "Keep the status page, alert center, request logs, and project health score open together so you can separate platform incidents from integration-specific issues quickly.",
                },
                {
                  title: "Use alerts, request logs, and health score together",
                  body: "Alerts tell you what changed, request logs show which traffic caused it, and the health score summarizes whether the project is still operationally ready for the team.",
                },
                {
                  title: "Prepare for mainnet honestly",
                  body: "Treat the current devnet phase as operational rehearsal: tighten runbooks, scopes, alerts, and collaboration habits now so the product and your integration are better prepared for future mainnet work.",
                },
                {
                  title: "Use a conservative beta reserve",
                  body: "A calm limited mainnet beta should be planned with reserve, not hope. A practical founder starting point is about 100 SOL total across traffic liquidity, ops buffer, and treasury/reconciliation safety margin.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
                >
                  <div className="text-sm font-semibold text-[var(--fyxvo-text)]">{item.title}</div>
                  <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.body}</p>
                </div>
              ))}
            </div>
            <Notice tone="neutral" title="Release habit">
              Before any larger rollout, confirm live status, funded balance, request logs, alert thresholds, webhook handling, and one real request in the authenticated product — not just local code or mock traffic.
            </Notice>
            <Notice tone="warning" title="Mainnet gate">
              Do not treat deployment alone as launch readiness. Mainnet beta should wait for governed authority control, reviewed treasury operations, migration discipline, verified incident handling, and a support model that is repeatable without manual founder intervention.
            </Notice>
          </section>

          {/* ── SDK Reference ────────────────────────────────────── */}
          <section id="sdk-reference">
            <SectionHeading
              id="sdk-reference"
              eyebrow="Section 8"
              title="SDK Reference"
              description="@fyxvo/sdk — TypeScript SDK for the Fyxvo gateway and control-plane API."
            />
            <div className="space-y-5">
              <Notice tone="neutral" title="SDK install">
                Install {"@fyxvo/sdk"} with npm, yarn, or pnpm. The package exposes a typed client for the gateway and API. Use the curl / fetch examples in the Standard RPC and Priority Relay sections if you prefer to integrate without the SDK.
              </Notice>
              <div className="space-y-2">
                <CodeBlock code={sdkInstallNpmCode} label="npm" />
                <CodeBlock code={sdkInstallYarnCode} label="yarn" />
                <CodeBlock code={sdkInstallPnpmCode} label="pnpm" />
              </div>
              <CodeBlock code={sdkClientCode} label="Create a client" />
              <CodeBlock code={sdkRpcCode} label="client.rpc() — standard relay" />
              <CodeBlock code={sdkPriorityCode} label="client.rpc() with /priority path — priority relay" />
              <CodeBlock code={sdkErrorCode} label="Error handling" />
              <CodeBlock code={tsAuthCode} label="TypeScript — full wallet auth flow" />
              <CodeBlock code={tsApiKeyCode} label="TypeScript — create an API key" />
              <CodeBlock code={tsRpcCode} label="TypeScript — typed gateway RPC call" />
              <CodeBlock code={pythonRpcCode} label="Python (requests) — gateway RPC call" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Notice tone="neutral" title="FyxvoError">
                  Base class for all SDK errors. Covers network failures, timeouts, and
                  configuration issues. Always catch this as a fallback.
                </Notice>
                <Notice tone="neutral" title="FyxvoApiError">
                  Extends FyxvoError with an HTTP statusCode. Thrown when the gateway or API returns
                  a 4xx or 5xx response. Check statusCode === 429 for rate limit handling.
                </Notice>
              </div>
            </div>
          </section>

          {/* ── Rate Limits ──────────────────────────────────────── */}
          <section id="rate-limits">
            <SectionHeading
              id="rate-limits"
              eyebrow="Section 9"
              title="Rate Limits"
              description="Per-key limits for standard and priority paths, and how to handle 429 responses."
            />
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)] mb-3">
                    Standard path
                  </div>
                  <div className="space-y-2 text-sm text-[var(--fyxvo-text-soft)]">
                    <p>
                      <span className="font-medium text-[var(--fyxvo-text)]">Limit:</span> 300
                      requests per 60-second window
                    </p>
                    <p>
                      <span className="font-medium text-[var(--fyxvo-text)]">Scope:</span>{" "}
                      rpc:request
                    </p>
                    <p>
                      <span className="font-medium text-[var(--fyxvo-text)]">Enforcement:</span>{" "}
                      Redis-backed, per API key
                    </p>
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)] mb-3">
                    Priority path
                  </div>
                  <div className="space-y-2 text-sm text-[var(--fyxvo-text-soft)]">
                    <p>
                      <span className="font-medium text-[var(--fyxvo-text)]">Limit:</span> 60
                      requests per 60-second window
                    </p>
                    <p>
                      <span className="font-medium text-[var(--fyxvo-text)]">Scope:</span>{" "}
                      priority:relay
                    </p>
                    <p>
                      <span className="font-medium text-[var(--fyxvo-text)]">Enforcement:</span>{" "}
                      Separate window from standard
                    </p>
                  </div>
                </div>
              </div>
              <CodeBlock code={rateLimitCode} label="429 handling with exponential backoff" />
              <Notice tone="neutral" title="Rate limit headers">
                Every response includes <code className="text-[var(--fyxvo-brand)]">x-ratelimit-limit</code>,{" "}
                <code className="text-[var(--fyxvo-brand)]">x-ratelimit-remaining</code>, and{" "}
                <code className="text-[var(--fyxvo-brand)]">x-ratelimit-reset</code> headers. Use these to
                implement adaptive backoff without waiting for a 429.
              </Notice>
            </div>
          </section>

          {/* ── Simulation Mode ──────────────────────────────────── */}
          <section id="simulation-mode">
            <SectionHeading
              id="simulation-mode"
              eyebrow="Gateway"
              title="Simulation Mode"
              description="Test against the gateway without using your project balance or touching Solana devnet."
            />
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)] mb-3">
                    What simulation mode does
                  </div>
                  <ul className="space-y-1.5 text-sm text-[var(--fyxvo-text-soft)]">
                    <li>Requests are free — no lamports are deducted.</li>
                    <li>Traffic is not forwarded to Solana devnet.</li>
                    <li>The gateway returns canned, deterministic responses.</li>
                    <li>Useful for SDK integration tests and CI pipelines.</li>
                  </ul>
                </div>
                <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)] mb-3">
                    Supported methods
                  </div>
                  <ul className="space-y-1.5 text-sm font-mono text-[var(--fyxvo-text-soft)]">
                    <li>getHealth</li>
                    <li>getSlot</li>
                    <li>getBalance</li>
                    <li>getLatestBlockhash</li>
                  </ul>
                  <p className="mt-3 text-xs text-[var(--fyxvo-text-muted)]">
                    Other methods may pass through or return a stub error in simulation mode.
                  </p>
                </div>
              </div>
              <CodeBlock
                label="Enable simulation mode — append ?simulate=true"
                code={`# Standard path with simulation enabled
curl -X POST "${webEnv.gatewayBaseUrl}/rpc?simulate=true" \\
  -H "content-type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth","params":[]}'

# Response (canned — not from devnet):
# {"jsonrpc":"2.0","id":1,"result":"ok"}`}
              />
              <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-5">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-warning)] mb-2">
                  Production integrations
                </div>
                <p className="text-sm text-[var(--fyxvo-text-soft)]">
                  Simulation mode is intended for development and testing only. Production
                  integrations must omit the <code className="font-mono text-xs">?simulate=true</code>{" "}
                  parameter to ensure requests are routed to Solana devnet and fees are applied
                  correctly against your project balance.
                </p>
              </div>
            </div>
          </section>

          {/* ── API Versioning ───────────────────────────────────── */}
          <section id="api-versioning">
            <SectionHeading
              id="api-versioning"
              eyebrow="Reference"
              title="API Versioning"
              description="How Fyxvo versions its REST API and what counts as a breaking change."
            />
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)] mb-3">
                    Current version
                  </div>
                  <div className="space-y-2 text-sm text-[var(--fyxvo-text-soft)]">
                    <p>
                      <span className="font-medium text-[var(--fyxvo-text)]">Version:</span>{" "}
                      <code className="font-mono text-xs">v1</code>
                    </p>
                    <p>
                      <span className="font-medium text-[var(--fyxvo-text)]">Base path:</span>{" "}
                      <code className="font-mono text-xs">/v1/</code>
                    </p>
                    <p>
                      <span className="font-medium text-[var(--fyxvo-text)]">Version header:</span>{" "}
                      <code className="font-mono text-xs">X-Fyxvo-API-Version: v1</code>
                    </p>
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)] mb-3">
                    Version detection
                  </div>
                  <p className="text-sm text-[var(--fyxvo-text-soft)]">
                    Every API response includes the{" "}
                    <code className="font-mono text-xs">X-Fyxvo-API-Version: v1</code> header.
                    Check this header in your client to detect version mismatches before they cause
                    silent behavior changes.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)] mb-3">
                    Breaking changes
                  </div>
                  <ul className="space-y-1.5 text-sm text-[var(--fyxvo-text-soft)]">
                    <li>Changes to existing response field shapes or types</li>
                    <li>Removal of response fields</li>
                    <li>Changes to the authentication mechanism</li>
                    <li>Changes to required request fields</li>
                    <li>Removal of existing endpoints</li>
                  </ul>
                </div>
                <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)] mb-3">
                    Non-breaking changes
                  </div>
                  <ul className="space-y-1.5 text-sm text-[var(--fyxvo-text-soft)]">
                    <li>Adding new optional response fields</li>
                    <li>Adding new endpoints</li>
                    <li>Adding new optional query parameters</li>
                    <li>Adding new optional request body fields</li>
                    <li>Expanding enum values in new fields</li>
                  </ul>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)] mb-3">
                  Deprecations
                </div>
                <p className="text-sm text-[var(--fyxvo-text-soft)]">
                  Deprecations are announced via a{" "}
                  <code className="font-mono text-xs">Deprecation</code> header in affected
                  API responses and in the{" "}
                  <a href="/changelog" className="text-[var(--fyxvo-brand)] underline">changelog</a>.
                  Deprecated endpoints remain available for a minimum of 90 days after the
                  announcement. Watch the{" "}
                  <code className="font-mono text-xs">Deprecation</code> header in your HTTP
                  client to catch these early.
                </p>
              </div>
              <CodeBlock
                label="Detecting the API version in your client"
                code={`// After any fetch call, check the version header:
const response = await fetch("${webEnv.apiBaseUrl}/v1/...", { /* ... */ });
const apiVersion = response.headers.get("X-Fyxvo-API-Version");
if (apiVersion && apiVersion !== "v1") {
  // Version mismatch — review the changelog for migration steps
}

// curl: observe the header in verbose output
curl -I ${webEnv.apiBaseUrl}/health
# X-Fyxvo-API-Version: v1`}
              />
            </div>
          </section>

          {/* ── Troubleshooting ──────────────────────────────────── */}
          <section id="troubleshooting">
            <SectionHeading
              id="troubleshooting"
              eyebrow="Section 10"
              title="Troubleshooting"
              description="A detailed diagnostic guide for the most common failure categories."
            />
            <div className="space-y-6">

              {/* ---- Authentication Errors ---- */}
              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[var(--fyxvo-border)] px-5 py-4">
                  <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-rose-500">401 / 403</span>
                  <h3 className="text-sm font-semibold text-[var(--fyxvo-text)]">Authentication Errors</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <p className="text-sm text-[var(--fyxvo-text-soft)]">The gateway or API rejected your credentials. This covers both missing-token (401) and insufficient-scope (403) failures.</p>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Causes</p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-[var(--fyxvo-text-soft)]">
                      <li>JWT has expired (tokens expire after 24 hours)</li>
                      <li>API key was revoked or does not exist</li>
                      <li>Key is missing required scope (<code className="font-mono text-xs">rpc:request</code> for standard, <code className="font-mono text-xs">priority:relay</code> for priority)</li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Diagnosis</p>
                    <p className="text-sm text-[var(--fyxvo-text-soft)]">Check the <code className="font-mono text-xs">error.code</code> field in the response body. Code <code className="font-mono text-xs">TOKEN_EXPIRED</code> means re-authenticate. Code <code className="font-mono text-xs">INSUFFICIENT_SCOPE</code> means generate a new key with the right scopes.</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Fix</p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-[var(--fyxvo-text-soft)]">
                      <li>Re-authenticate via <code className="font-mono text-xs">POST /v1/auth/challenge</code> + <code className="font-mono text-xs">POST /v1/auth/verify</code></li>
                      <li>Generate a new API key from the API Keys page with the required scopes</li>
                      <li>Confirm the <code className="font-mono text-xs">X-Api-Key</code> or <code className="font-mono text-xs">Authorization: Bearer</code> header is present and correctly formatted</li>
                    </ul>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer select-none text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors">Example: re-authenticate</summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3 text-xs leading-5 text-[var(--fyxvo-text-soft)] whitespace-pre-wrap">
                      <code>{`# Step 1 — get a challenge
curl -X POST ${webEnv.apiBaseUrl}/v1/auth/challenge \\
  -H "content-type: application/json" \\
  -d '{"walletAddress":"YOUR_WALLET"}'

# Step 2 — sign the returned message with your wallet and verify
curl -X POST ${webEnv.apiBaseUrl}/v1/auth/verify \\
  -H "content-type: application/json" \\
  -d '{"walletAddress":"YOUR_WALLET","message":"<from-step-1>","signature":"<base58-sig>"}'`}</code>
                    </pre>
                  </details>
                </div>
              </div>

              {/* ---- Connection Errors ---- */}
              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[var(--fyxvo-border)] px-5 py-4">
                  <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-500">network</span>
                  <h3 className="text-sm font-semibold text-[var(--fyxvo-text)]">Connection Errors</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <p className="text-sm text-[var(--fyxvo-text-soft)]">The request never reaches the gateway or returns a non-JSON response.</p>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Causes</p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-[var(--fyxvo-text-soft)]">
                      <li>Wrong endpoint URL (common: using API base instead of gateway base)</li>
                      <li>No internet access or DNS resolution failure</li>
                      <li>Gateway is temporarily unavailable (planned maintenance or incident)</li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Fix</p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-[var(--fyxvo-text-soft)]">
                      <li>Verify the RPC endpoint: <code className="font-mono text-xs">{webEnv.gatewayBaseUrl}/rpc</code></li>
                      <li>Check <a href={webEnv.statusPageUrl} className="text-[var(--fyxvo-brand)] hover:underline" target="_blank" rel="noopener noreferrer">status.fyxvo.com</a> for active incidents</li>
                    </ul>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer select-none text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors">Example: health check</summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3 text-xs leading-5 text-[var(--fyxvo-text-soft)] whitespace-pre-wrap">
                      <code>{`curl https://rpc.fyxvo.com/health
# Expected: {"status":"ok"}

curl ${webEnv.apiBaseUrl}/health
# Expected: {"status":"ok"}`}</code>
                    </pre>
                  </details>
                </div>
              </div>

              {/* ---- Rate Limit Errors ---- */}
              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[var(--fyxvo-border)] px-5 py-4">
                  <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-500">429</span>
                  <h3 className="text-sm font-semibold text-[var(--fyxvo-text)]">Rate Limit Errors</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <p className="text-sm text-[var(--fyxvo-text-soft)]">The gateway returned a 429 Too Many Requests. Your project has exceeded its per-minute request quota.</p>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Causes</p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-[var(--fyxvo-text-soft)]">
                      <li>Burst of requests exceeded the per-minute limit for your tier</li>
                      <li>Multiple clients sharing the same API key concurrently</li>
                      <li>Missing backoff logic causing retry storms</li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Diagnosis</p>
                    <p className="text-sm text-[var(--fyxvo-text-soft)]">Check the <code className="font-mono text-xs">X-RateLimit-Remaining</code> and <code className="font-mono text-xs">Retry-After</code> headers on the 429 response.</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Fix</p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-[var(--fyxvo-text-soft)]">
                      <li>Implement exponential backoff using the <code className="font-mono text-xs">Retry-After</code> header value</li>
                      <li>Consider upgrading to the Priority tier for higher throughput limits</li>
                      <li>Deduplicate requests and use batch methods where available</li>
                    </ul>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer select-none text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors">Example: check rate limit headers</summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3 text-xs leading-5 text-[var(--fyxvo-text-soft)] whitespace-pre-wrap">
                      <code>{`curl -i -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot","params":[]}'

# Look for: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After`}</code>
                    </pre>
                  </details>
                </div>
              </div>

              {/* ---- Balance Errors ---- */}
              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[var(--fyxvo-border)] px-5 py-4">
                  <span className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-orange-500">402</span>
                  <h3 className="text-sm font-semibold text-[var(--fyxvo-text)]">Balance Errors</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <p className="text-sm text-[var(--fyxvo-text-soft)]">A 402 Payment Required means the project does not have enough SOL credits to cover the relay request.</p>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Causes</p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-[var(--fyxvo-text-soft)]">
                      <li>Project treasury balance has been exhausted</li>
                      <li>Funding transaction was sent but not yet verified by the API</li>
                      <li>Using a key from a different project with an empty treasury</li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Fix</p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-[var(--fyxvo-text-soft)]">
                      <li>Fund the project at <a href="/funding" className="text-[var(--fyxvo-brand)] hover:underline">fyxvo.com/funding</a></li>
                      <li>Verify a pending funding transaction using <code className="font-mono text-xs">POST /v1/projects/:id/funding/:fid/verify</code></li>
                    </ul>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer select-none text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors">Example: check balance via API</summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3 text-xs leading-5 text-[var(--fyxvo-text-soft)] whitespace-pre-wrap">
                      <code>{`curl ${webEnv.apiBaseUrl}/v1/me/balance \\
  -H "authorization: Bearer YOUR_JWT"

# Returns: { "availableSolCredits": "...", "totalSolFunded": "..." }`}</code>
                    </pre>
                  </details>
                </div>
              </div>

              {/* ---- Unexpected RPC Errors ---- */}
              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[var(--fyxvo-border)] px-5 py-4">
                  <span className="rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--fyxvo-text-muted)]">RPC</span>
                  <h3 className="text-sm font-semibold text-[var(--fyxvo-text)]">Unexpected RPC Errors</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <p className="text-sm text-[var(--fyxvo-text-soft)]">The gateway reached Solana devnet but the RPC call itself failed. Check the <code className="font-mono text-xs">fyxvo_hint</code> field in the error response for a human-readable diagnosis.</p>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Causes</p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-[var(--fyxvo-text-soft)]">
                      <li>Solana devnet node under load or temporarily unavailable</li>
                      <li>Blockhash has expired before the transaction was submitted (use <code className="font-mono text-xs">getLatestBlockhash</code> again)</li>
                      <li>Transaction simulation failed due to an account constraint or insufficient lamports</li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Common codes</p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-[var(--fyxvo-text-soft)]">
                      <li><code className="font-mono text-xs">-32002</code> — Transaction simulation failed: check transaction logs in the response</li>
                      <li><code className="font-mono text-xs">-32003</code> — Blockhash expired: fetch a fresh blockhash and re-sign</li>
                      <li><code className="font-mono text-xs">-32016</code> — Blockhash not found: same resolution as -32003</li>
                    </ul>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer select-none text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors">Example: inspect fyxvo_hint</summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3 text-xs leading-5 text-[var(--fyxvo-text-soft)] whitespace-pre-wrap">
                      <code>{`# A Fyxvo error response looks like:
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32002,
    "message": "Transaction simulation failed",
    "fyxvo_hint": "The transaction failed simulation. Check that the fee payer has enough SOL and all accounts are valid."
  }
}`}</code>
                    </pre>
                  </details>
                </div>
              </div>

            </div>
          </section>

          {/* ── Error Reference ──────────────────────────────────── */}
          <section id="error-reference">
            <SectionHeading
              id="error-reference"
              eyebrow="Reference"
              title="Error Reference"
              description="A quick reference for every error code returned by the Fyxvo API and gateway."
            />
            <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              All Fyxvo API errors follow the shape <code className="font-mono text-xs">{"{ error: string, message: string }"}</code>. HTTP status codes map directly to problem categories: 400 for validation, 401 for auth, 402 for insufficient balance, 403 for scope or role issues, 429 for rate limits, and 503 for protocol unavailability. See the Error Codes table below for the full list with resolution guidance.
            </p>
          </section>

          {/* ── CI/CD Integration ────────────────────────────────── */}
          <section id="ci-cd">
            <SectionHeading
              id="ci-cd"
              eyebrow="Reference"
              title="CI/CD Integration"
              description="How to use Fyxvo API keys safely in automated pipelines."
            />
            <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              Store your API key in an environment secret (e.g. <code className="font-mono text-xs">FYXVO_API_KEY</code>) and pass it as the <code className="font-mono text-xs">X-Api-Key</code> header. In GitHub Actions, use <code className="font-mono text-xs">{"${{ secrets.FYXVO_API_KEY }}"}</code>. Never commit keys directly. Use separate keys per environment so you can revoke CI access without affecting production.
            </p>
          </section>

          {/* ── Migration Guide ───────────────────────────────────── */}
          <section id="migration-guide">
            <SectionHeading
              id="migration-guide"
              eyebrow="Reference"
              title="Migration Guide"
              description="Switch to Fyxvo from Helius, QuickNode, or any other Solana RPC provider."
            />
            <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              Fyxvo is a drop-in replacement for any standard Solana JSON-RPC provider. Replace your existing endpoint URL with the Fyxvo gateway URL and add an <code className="font-mono text-xs">X-Api-Key</code> header containing your relay key. No SDK changes are required — any library that speaks JSON-RPC over HTTP works without modification.
            </p>
          </section>

          {/* ── Network Status ───────────────────────────────────── */}
          <section id="network-status">
            <SectionHeading
              id="network-status"
              eyebrow="Section 11"
              title="Network Status"
              description="How to check the live condition of the API, gateway, and protocol."
            />
            <div className="space-y-5">
              <CodeBlock code={healthCheckCode} label="Health check commands" />
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: "status.fyxvo.com",
                    url: webEnv.statusPageUrl,
                    body: "Public status page. Combines API health, gateway health, and protocol readiness into a single honest surface. Share this with teammates during evaluation.",
                  },
                  {
                    label: "API health",
                    url: `${webEnv.apiBaseUrl}/health`,
                    body: 'Returns { "status": "ok" } when the control plane, database, and Redis are operational. Include this in your monitoring setup.',
                  },
                  {
                    label: "Gateway status",
                    url: `${webEnv.gatewayBaseUrl}/v1/status`,
                    body: "Returns the full gateway state: node count, upstream availability, pricing config, scope enforcement status, and live relay metrics.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5"
                  >
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                      {item.label}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="break-all text-xs text-[var(--fyxvo-brand)]">{item.url}</code>
                      <CopyButton value={item.url} className="shrink-0" />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
              <Notice tone="neutral" title="Interpreting a degraded status">
                If the status page shows degraded, check individual health endpoints to isolate
                whether the issue is the API, gateway, or Solana devnet itself. If devnet is healthy
                but the gateway is degraded, contact support before scaling traffic.
              </Notice>
            </div>
          </section>

          <section id="status-api">
            <SectionHeading
              id="status-api"
              eyebrow="Reference"
              title="Status API"
              description="Public status and network endpoints you can wire into internal dashboards, smoke tests, release checks, or lightweight uptime monitoring."
            />
            <div className="space-y-5">
              <div className="grid gap-4 xl:grid-cols-2">
                {[
                  {
                    title: "GET /health",
                    code: statusApiHealthCode,
                    body: "Public. Best for quick release smoke tests and simple uptime checks. Returns overall status, service name, version, timestamp, and assistant availability.",
                  },
                  {
                    title: "GET /v1/status",
                    code: statusApiStatusCode,
                    body: "Public. Best for richer diagnostics. Use this for admin readouts, deployment checks, and environment-level status summaries.",
                  },
                  {
                    title: "GET /v1/incidents",
                    code: statusApiIncidentsCode,
                    body: "Public. Returns active and historical incidents with timeline updates, affected services, and resolution timestamps. Use this to link platform incidents to project-level alerts.",
                  },
                  {
                    title: "GET /v1/network/stats, /capacity, /health-calendar",
                    code: statusApiNetworkCode,
                    body: "Public. Use these for high-level usage trends, capacity posture, and recent service-health history without requiring an authenticated session.",
                  },
                  {
                    title: "Project public stats endpoints",
                    code: statusApiPublicProjectCode,
                    body: "API-key authenticated. Use from backend services when you want public-safe project usage stats without exposing a dashboard session.",
                  },
                  {
                    title: "Status snapshot sharing",
                    code: statusSnapshotCode,
                    body: "Human-readable handoff, not a separate API endpoint. Use the status page snapshot copy action when you need to share the current platform state quickly in chat, docs, or support threads.",
                  },
                ].map((item) => (
                  <Card key={item.title} className="fyxvo-surface border-[color:var(--fyxvo-border)]">
                    <CardHeader>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>{item.body}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <CodeBlock code={item.code} />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Notice tone="neutral" title="Common operational uses">
                Use <code className="font-mono text-xs">/health</code> in deploy smoke tests, <code className="font-mono text-xs">/v1/status</code> in richer admin dashboards, <code className="font-mono text-xs">/v1/incidents</code> to explain alert spikes, and the network endpoints when you want public operational context without exposing private project data.
              </Notice>
            </div>
          </section>

          {/* ── Changelog ────────────────────────────────────────── */}
          <section id="changelog">
            <SectionHeading
              id="changelog"
              eyebrow="Section 12"
              title="Changelog"
              description="What shipped in each version of the Fyxvo devnet platform."
            />
            <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CardTitle>Version 0.1.0</CardTitle>
                  <Badge tone="brand">current</Badge>
                </div>
                <CardDescription>Initial devnet launch release</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      title: "Wallet authentication",
                      body: "Challenge–sign–verify JWT flow. Supports Phantom, Solflare, Backpack, and Wallet Standard adapters.",
                    },
                    {
                      title: "Project activation",
                      body: "On-chain project account creation via Anchor PDA derivation. Wallet signs the activation transaction; API verifies confirmation.",
                    },
                    {
                      title: "SOL funding",
                      body: "API-prepared unsigned transactions for SOL deposits into the Anchor-managed project vault. Includes verify endpoint for balance refresh.",
                    },
                    {
                      title: "Standard relay",
                      body: "JSON-RPC relay at /rpc with API key validation, funded balance enforcement, multi-node routing, and fallback.",
                    },
                    {
                      title: "Priority relay",
                      body: "Separate /priority path with priority:relay scope requirement, independent rate window, and distinct pricing from standard.",
                    },
                    {
                      title: "Analytics",
                      body: "Overview endpoint for cross-project totals and per-project endpoint for method breakdown, latency, and error log.",
                    },
                    {
                      title: "Per-key analytics",
                      body: "Request counts and success rates broken down by individual API key so teams can trace which key is responsible for traffic.",
                    },
                    {
                      title: "Method breakdown",
                      body: "Analytics surface includes per-method request counts and average latency to identify expensive or high-volume RPC methods.",
                    },
                    {
                      title: "Error log",
                      body: "Recent error events surfaced in the analytics API with timestamps, error codes, and affected project identifiers.",
                    },
                    {
                      title: "Notifications",
                      body: "In-product notification surface for balance warnings, rate limit events, and project status changes.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
                    >
                      <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                        {item.title}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Full changelog link */}
          <div className="text-center">
            <a
              href="/changelog"
              className="text-sm text-[var(--fyxvo-brand)] hover:underline"
            >
              View the full changelog →
            </a>
          </div>

          {/* ── Migration Guide ──────────────────────────────────────── */}
          <section id="migration">
            <SectionHeading
              id="migration"
              eyebrow="Migration"
              title="Migrating from Helius or QuickNode"
              description="Switch to Fyxvo in two lines of code. No SDK changes required."
            />
            <div className="space-y-4">
              <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                Fyxvo is a drop-in Solana RPC provider. Replace the endpoint URL and add your API key header. Everything else stays the same.
              </p>
              <CodeBlock
                label="Before (Helius / QuickNode / any provider)"
                code={`const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=YOUR_KEY");
// or
const connection = new Connection("https://solana-mainnet.quiknode.pro/YOUR_KEY/");`}
              />
              <CodeBlock
                label="After (Fyxvo)"
                code={`const connection = new Connection("${webEnv.gatewayBaseUrl}/rpc", {
  httpHeaders: { "X-Api-Key": "fyxvo_live_YOUR_KEY" }
});`}
              />
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 space-y-2">
                <p className="text-sm font-medium text-[var(--fyxvo-text)]">What stays the same</p>
                <ul className="text-sm leading-6 text-[var(--fyxvo-text-soft)] space-y-1 list-disc list-inside">
                  <li>All Solana JSON-RPC methods work identically</li>
                  <li>@solana/web3.js, solana-py, and all standard clients</li>
                  <li>Transaction signing and submission flows</li>
                  <li>WebSocket subscriptions are not part of the hosted alpha surface yet</li>
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 space-y-2">
                <p className="text-sm font-medium text-[var(--fyxvo-text)]">What is different</p>
                <ul className="text-sm leading-6 text-[var(--fyxvo-text-soft)] space-y-1 list-disc list-inside">
                  <li>Authentication uses a per-project API key in the <code className="font-mono text-xs">X-Api-Key</code> header (not a URL query param)</li>
                  <li>Billing is on-chain: SOL credits are funded directly to your project treasury</li>
                  <li>Currently devnet only — mainnet is on the roadmap</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ── Rate Limits Reference ──────────────────────────────── */}
          <section id="rate-limits-reference">
            <SectionHeading
              id="rate-limits-reference"
              eyebrow="Reference"
              title="Rate limits reference"
              description="Per-key rate limits on devnet. Limits will increase as the network scales."
            />
            <div className="overflow-hidden rounded-xl border border-[var(--fyxvo-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Path</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Scope required</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Limit</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Window</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fyxvo-border)]">
                  {[
                    { path: "/rpc (standard)", scope: "rpc:request", limit: "300 req", window: "60 s" },
                    { path: "/priority (priority)", scope: "priority:relay", limit: "60 req", window: "60 s" },
                    { path: "API (auth, projects)", scope: "n/a (JWT)", limit: "120 req", window: "60 s" },
                    { path: "API (analytics)", scope: "n/a (JWT)", limit: "120 req", window: "60 s" },
                  ].map((row) => (
                    <tr key={row.path} className="bg-[var(--fyxvo-bg)] hover:bg-[var(--fyxvo-panel-soft)] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[var(--fyxvo-text)]">{row.path}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--fyxvo-text-muted)]">{row.scope}</td>
                      <td className="px-4 py-3 text-sm text-[var(--fyxvo-text)]">{row.limit}</td>
                      <td className="px-4 py-3 text-sm text-[var(--fyxvo-text-muted)]">{row.window}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[var(--fyxvo-text-muted)]">
              Rate limit headers: <code className="font-mono">x-ratelimit-limit</code>, <code className="font-mono">x-ratelimit-remaining</code>, <code className="font-mono">x-ratelimit-reset</code>. On 429, wait for the reset timestamp before retrying.
            </p>
          </section>

          {/* ── Error Codes ──────────────────────────────────────────── */}
          <section id="error-codes">
            <SectionHeading
              id="error-codes"
              eyebrow="Reference"
              title="Error codes reference"
              description="Common error codes returned by the API and gateway."
            />
            <div className="overflow-hidden rounded-xl border border-[var(--fyxvo-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">HTTP</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Code</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Meaning</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fyxvo-border)]">
                  {[
                    { http: "400", code: "validation_error", meaning: "Request body failed schema validation", fix: "Check the details field for which fields are invalid" },
                    { http: "400", code: "invalid_message", meaning: "Auth challenge message does not match", fix: "Request a new challenge and sign the exact returned message" },
                    { http: "401", code: "unauthorized", meaning: "No JWT token provided", fix: "Include Authorization: Bearer <token> header" },
                    { http: "401", code: "invalid_token", meaning: "JWT is malformed or expired", fix: "Re-authenticate via /v1/auth/challenge + /v1/auth/verify" },
                    { http: "401", code: "invalid_signature", meaning: "Wallet signature verification failed", fix: "Sign with the correct wallet and the exact challenge message" },
                    { http: "401", code: "session_expired", meaning: "Session version has been rotated", fix: "Re-authenticate to get a fresh JWT" },
                    { http: "402", code: "insufficient_balance", meaning: "Project has no spendable SOL credits", fix: "Fund the project treasury and wait for confirmation" },
                    { http: "403", code: "forbidden", meaning: "Action requires elevated privileges", fix: "Check your account role in Settings" },
                    { http: "403", code: "scope_missing", meaning: "API key lacks the required scope", fix: "Revoke the key and create a new one with the correct scopes" },
                    { http: "404", code: "not_found", meaning: "Project, key, or resource not found", fix: "Verify the ID is correct and belongs to your account" },
                    { http: "409", code: "project_already_activated", meaning: "Activation transaction already confirmed", fix: "The project is already active — no action needed" },
                    { http: "429", code: "rate_limited", meaning: "Rate limit exceeded for this window", fix: "Back off and retry after x-ratelimit-reset timestamp" },
                    { http: "503", code: "protocol_not_ready", meaning: "Fyxvo program not ready on chain", fix: "Check /status for protocol readiness details" },
                  ].map((row) => (
                    <tr key={row.code} className="bg-[var(--fyxvo-bg)] hover:bg-[var(--fyxvo-panel-soft)] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[var(--fyxvo-text)]">{row.http}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--fyxvo-brand)]">{row.code}</td>
                      <td className="px-4 py-3 text-xs text-[var(--fyxvo-text-soft)]">{row.meaning}</td>
                      <td className="px-4 py-3 text-xs text-[var(--fyxvo-text-muted)]">{row.fix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── FAQ ──────────────────────────────────────────────────── */}
          <section id="faq">
            <SectionHeading
              id="faq"
              eyebrow="FAQ"
              title="Frequently asked questions"
              description="Real questions from developers integrating with Fyxvo."
            />
            <div className="space-y-4">
              {[
                {
                  q: "Is Fyxvo production-ready for mainnet?",
                  a: "Not yet. Fyxvo is currently a private devnet alpha. Mainnet support is on the roadmap. Devnet-graduated projects will have a clear migration path when mainnet launches.",
                },
                {
                  q: "What happens if my SOL balance runs out?",
                  a: "Gateway requests will return a 402 Insufficient Balance error until you fund the project treasury. Your project data, API keys, and analytics are preserved — only relay access is paused.",
                },
                {
                  q: "Can I use Fyxvo without a wallet?",
                  a: "No. Wallet ownership is the authentication anchor. You need a Solana wallet (Phantom, Backpack, etc.) to create a project, fund the treasury, and receive a session JWT.",
                },
                {
                  q: "How do I get more devnet SOL for testing?",
                  a: "Use the Solana devnet faucet: `solana airdrop 2 YOUR_WALLET --url devnet`. You can also use https://faucet.solana.com. Note: devnet SOL has no real value.",
                },
                {
                  q: "What RPC methods are compute-heavy and cost more?",
                  a: "The following methods cost 3,000 lamports instead of 1,000: getProgramAccounts, getLargestAccounts, getSignaturesForAddress, getSignaturesForAddress2, getTokenLargestAccounts. These are expensive upstream queries that require heavier node compute.",
                },
                {
                  q: "Can I have multiple projects?",
                  a: "Yes. Each project is an independent on-chain account with its own treasury, API keys, and analytics. Create additional projects from the Dashboard.",
                },
                {
                  q: "How do volume discounts work?",
                  a: "Discounts apply to your billing rate: ≥1M requests/month → 20% off standard rate; ≥10M requests/month → 40% off. During devnet alpha, contact the team to apply volume pricing manually.",
                },
                {
                  q: "Why does the gateway return a 401 even with a valid API key?",
                  a: "The most common causes: (1) the key was revoked, (2) the key lacks the required scope (rpc:request for standard, priority:relay for priority), or (3) the X-Api-Key header is missing or misspelled.",
                },
                {
                  q: "Can I use Fyxvo with languages other than JavaScript?",
                  a: "Yes. Any HTTP client works. Use the X-Api-Key header and POST JSON-RPC to the gateway endpoint. Python, Rust, Go, and curl all work identically.",
                },
                {
                  q: "How do I withdraw unused SOL from my project treasury?",
                  a: "Treasury withdrawal is not yet available via the dashboard UI. During the devnet alpha, contact the team to initiate a withdrawal. Mainnet will have a self-serve withdrawal flow.",
                },
              ].map((item) => (
                <div key={item.q} className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                  <p className="text-sm font-semibold text-[var(--fyxvo-text)]">{item.q}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── RPC Reference ─────────────────────────────────────── */}
          <section id="rpc-reference">
            <SectionHeading
              id="rpc-reference"
              eyebrow="Reference"
              title="RPC Reference"
              description="A glossary of key Solana JSON-RPC methods routed through the Fyxvo gateway."
            />
            <div className="space-y-6">
              {(
                [
                  {
                    category: "Account & Balance",
                    methods: [
                      {
                        name: "getBalance",
                        description: "Returns the lamport balance of the account at the given public key.",
                        tier: "Standard",
                        heavy: false,
                        params: "[pubkey]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getBalance","params":["FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa"]}'`,
                      },
                      {
                        name: "getAccountInfo",
                        description: "Returns all information associated with the account at the given public key.",
                        tier: "Standard",
                        heavy: false,
                        params: "[pubkey]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa",{"encoding":"base58"}]}'`,
                      },
                      {
                        name: "getMultipleAccounts",
                        description: "Get info for multiple accounts at once.",
                        tier: "Standard",
                        heavy: false,
                        params: "[pubkeys[]]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getMultipleAccounts","params":[["PUBKEY1","PUBKEY2"],{"encoding":"base58"}]}'`,
                      },
                      {
                        name: "getTokenAccountBalance",
                        description: "Get token account balance for an SPL Token account.",
                        tier: "Standard",
                        heavy: false,
                        params: "[pubkey]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getTokenAccountBalance","params":["TOKEN_ACCOUNT_PUBKEY"]}'`,
                      },
                      {
                        name: "getTokenAccountsByOwner",
                        description: "Get all token accounts owned by an address, filtered by mint or program ID.",
                        tier: "Standard",
                        heavy: false,
                        params: "[ownerAddress, { mint | programId }]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getTokenAccountsByOwner","params":["OWNER_PUBKEY",{"programId":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},{"encoding":"jsonParsed"}]}'`,
                      },
                      {
                        name: "getTokenLargestAccounts",
                        description: "Get the 20 largest token accounts for a given mint.",
                        tier: "Standard",
                        heavy: false,
                        params: "[mintAddress]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getTokenLargestAccounts","params":["MINT_ADDRESS"]}'`,
                      },
                      {
                        name: "getTokenSupply",
                        description: "Get the total supply of an SPL Token mint.",
                        tier: "Standard",
                        heavy: false,
                        params: "[mintAddress]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getTokenSupply","params":["MINT_ADDRESS"]}'`,
                      },
                      {
                        name: "getProgramAccounts",
                        description: "Get all accounts owned by a program. Compute-heavy — use filters to narrow results.",
                        tier: "Standard",
                        heavy: true,
                        params: "[programId]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getProgramAccounts","params":["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"]}'`,
                      },
                    ],
                  },
                  {
                    category: "Block & Slot",
                    methods: [
                      {
                        name: "getSlot",
                        description: "Returns the slot that has reached the given or default commitment level.",
                        tier: "Standard",
                        heavy: false,
                        params: "none",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot","params":[]}'`,
                      },
                      {
                        name: "getBlock",
                        description: "Returns identity and transaction information about a confirmed block in the ledger. Compute-heavy.",
                        tier: "Standard",
                        heavy: true,
                        params: "[slot]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getBlock","params":[SLOT_NUMBER,{"encoding":"json","maxSupportedTransactionVersion":0}]}'`,
                      },
                      {
                        name: "getLatestBlockhash",
                        description: "Returns the latest blockhash and the last block height at which it is valid.",
                        tier: "Standard",
                        heavy: false,
                        params: "none",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getLatestBlockhash","params":[{"commitment":"confirmed"}]}'`,
                      },
                      {
                        name: "getBlockHeight",
                        description: "Returns the current block height of the node.",
                        tier: "Standard",
                        heavy: false,
                        params: "none",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getBlockHeight","params":[]}'`,
                      },
                      {
                        name: "getBlockTime",
                        description: "Get estimated production time of a block, as Unix timestamp.",
                        tier: "Standard",
                        heavy: false,
                        params: "[slot]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getBlockTime","params":[SLOT_NUMBER]}'`,
                      },
                      {
                        name: "getBlocks",
                        description: "Get confirmed blocks in a slot range.",
                        tier: "Standard",
                        heavy: false,
                        params: "[startSlot, endSlot?]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getBlocks","params":[START_SLOT,END_SLOT]}'`,
                      },
                      {
                        name: "getFirstAvailableBlock",
                        description: "Get the slot of the lowest confirmed block that has not been purged from the ledger.",
                        tier: "Standard",
                        heavy: false,
                        params: "none",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getFirstAvailableBlock","params":[]}'`,
                      },
                    ],
                  },
                  {
                    category: "Transaction",
                    methods: [
                      {
                        name: "sendTransaction",
                        description: "Submits a signed transaction to the cluster for processing.",
                        tier: "Priority",
                        heavy: false,
                        params: "[encodedTransaction]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/priority \\
  -H "x-api-key: YOUR_PRIORITY_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"sendTransaction","params":["<base64-signed-tx>",{"encoding":"base64","skipPreflight":false}]}'`,
                      },
                      {
                        name: "simulateTransaction",
                        description: "Simulate sending a transaction without actually submitting it to the network.",
                        tier: "Priority",
                        heavy: false,
                        params: "[transaction]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/priority \\
  -H "x-api-key: YOUR_PRIORITY_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"simulateTransaction","params":["<base64-tx>",{"encoding":"base64","sigVerify":false}]}'`,
                      },
                      {
                        name: "getTransaction",
                        description: "Returns transaction details for a confirmed transaction.",
                        tier: "Standard",
                        heavy: false,
                        params: "[signature]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getTransaction","params":["SIGNATURE",{"encoding":"json","maxSupportedTransactionVersion":0}]}'`,
                      },
                      {
                        name: "getTransactions",
                        description: "Get details for multiple transactions by signature array.",
                        tier: "Standard",
                        heavy: false,
                        params: "[signatures[]]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getTransactions","params":[["SIG1","SIG2"],{"encoding":"json","maxSupportedTransactionVersion":0}]}'`,
                      },
                      {
                        name: "getSignaturesForAddress",
                        description: "Get confirmed signatures for transactions involving an address.",
                        tier: "Standard",
                        heavy: false,
                        params: "[address]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getSignaturesForAddress","params":["FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa",{"limit":10}]}'`,
                      },
                      {
                        name: "getSignatureStatuses",
                        description: "Returns the statuses of a list of transaction signatures.",
                        tier: "Standard",
                        heavy: false,
                        params: "[signatures[]]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getSignatureStatuses","params":[["SIG1","SIG2"],{"searchTransactionHistory":false}]}'`,
                      },
                    ],
                  },
                  {
                    category: "Network",
                    methods: [
                      {
                        name: "getHealth",
                        description: "Returns the current health of the node \u2014 \u201cok\u201d if healthy.",
                        tier: "Standard",
                        heavy: false,
                        params: "none",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth","params":[]}'`,
                      },
                      {
                        name: "getVersion",
                        description: "Returns the current Solana version running on the node.",
                        tier: "Standard",
                        heavy: false,
                        params: "none",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion","params":[]}'`,
                      },
                      {
                        name: "getEpochInfo",
                        description: "Returns information about the current epoch including slot index and epoch number.",
                        tier: "Standard",
                        heavy: false,
                        params: "none",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getEpochInfo","params":[]}'`,
                      },
                      {
                        name: "getEpochSchedule",
                        description: "Get epoch schedule information from the cluster\u2019s genesis config.",
                        tier: "Standard",
                        heavy: false,
                        params: "none",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getEpochSchedule","params":[]}'`,
                      },
                      {
                        name: "getGenesisHash",
                        description: "Returns the genesis hash of the ledger.",
                        tier: "Standard",
                        heavy: false,
                        params: "none",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getGenesisHash","params":[]}'`,
                      },
                      {
                        name: "getClusterNodes",
                        description: "Get information about all cluster nodes participating in the network.",
                        tier: "Standard",
                        heavy: false,
                        params: "none",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getClusterNodes","params":[]}'`,
                      },
                      {
                        name: "getLeaderSchedule",
                        description: "Get the leader schedule for the current or a specific epoch.",
                        tier: "Standard",
                        heavy: false,
                        params: "none",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getLeaderSchedule","params":[]}'`,
                      },
                      {
                        name: "getMinimumBalanceForRentExemption",
                        description: "Get minimum balance required to make account rent exempt for a given data size.",
                        tier: "Standard",
                        heavy: false,
                        params: "[dataSize]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getMinimumBalanceForRentExemption","params":[128]}'`,
                      },
                      {
                        name: "getRecentPerformanceSamples",
                        description: "Get recent performance samples showing transactions and slots per second.",
                        tier: "Standard",
                        heavy: false,
                        params: "[limit?]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getRecentPerformanceSamples","params":[5]}'`,
                      },
                      {
                        name: "getStakeActivation",
                        description: "Get epoch activation information for a stake account.",
                        tier: "Standard",
                        heavy: false,
                        params: "[pubkey]",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getStakeActivation","params":["STAKE_ACCOUNT_PUBKEY"]}'`,
                      },
                      {
                        name: "getVoteAccounts",
                        description: "Get account info and stake for all voting accounts in the current bank.",
                        tier: "Standard",
                        heavy: false,
                        params: "none",
                        example: `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getVoteAccounts","params":[]}'`,
                      },
                    ],
                  },
                ] as Array<{ category: string; methods: Array<{ name: string; description: string; tier: string; heavy: boolean; params: string; example: string }> }>
              ).map(({ category, methods }) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">{category}</h3>
                  <div className="divide-y divide-[var(--fyxvo-border)] rounded-xl border border-[var(--fyxvo-border)] overflow-hidden">
                    {methods.map((m) => (
                      <div key={m.name} className="bg-[var(--fyxvo-panel-soft)] p-4">
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                          <code className="font-mono text-sm font-semibold text-[var(--fyxvo-text)]">{m.name}</code>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${m.tier === "Priority" ? "bg-amber-500/15 text-amber-500" : "bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-brand)]"}`}>
                            {m.tier}
                          </span>
                          {m.heavy && (
                            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-500">
                              ⚡ Heavy
                            </span>
                          )}
                          {m.params !== "none" && (
                            <span className="font-mono text-[10px] text-[var(--fyxvo-text-muted)]">{m.params}</span>
                          )}
                        </div>
                        <p className="text-sm leading-5 text-[var(--fyxvo-text-soft)] mb-2">{m.description}</p>
                        <details className="text-xs">
                          <summary className="cursor-pointer select-none text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors">
                            Example
                          </summary>
                          <pre className="mt-2 overflow-x-auto rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3 text-xs leading-5 text-[var(--fyxvo-text-soft)] whitespace-pre-wrap">
                            <code>{m.example}</code>
                          </pre>
                        </details>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer notice */}
          <Notice tone="neutral" title="Still have questions?">
            Docs cover the fastest self-serve path. For launch-fit questions, issue reports, or
            managed rollout conversations, use the community paths or the contact page.
            <div className="mt-4">
              <SocialLinkButtons />
            </div>
          </Notice>
        </main>
      </div>
    </div>
  );
}
