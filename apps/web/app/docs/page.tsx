"use client";

import { useEffect, useState, useMemo } from "react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { CopyButton } from "../../components/copy-button";
import { PageHeader } from "../../components/page-header";
import { SocialLinkButtons } from "../../components/social-links";
import { ApiExplorer } from "../../components/api-explorer";
import { webEnv } from "../../lib/env";
import { PRICING_LAMPORTS } from "@fyxvo/config";

const NAV_SECTIONS = [
  { id: "introduction", label: "Introduction", keywords: "overview what is fyxvo devnet rpc relay product" },
  { id: "quickstart", label: "Quickstart", keywords: "start connect wallet create project fund api key request curl" },
  { id: "authentication", label: "Authentication", keywords: "wallet auth challenge verify token jwt bearer solana phantom" },
  { id: "funding", label: "Funding", keywords: "sol lamports treasury deposit balance credits prepare sign transaction" },
  { id: "standard-rpc", label: "Standard RPC", keywords: "rpc request jsonrpc endpoint gateway x-api-key getHealth getSlot" },
  { id: "priority-relay", label: "Priority Relay", keywords: "priority relay high throughput fast latency /priority scope" },
  { id: "analytics-api", label: "Analytics API", keywords: "analytics stats requests latency error rate monitoring project" },
  { id: "api-explorer", label: "API Explorer", keywords: "try it interactive request curl live test endpoint" },
  { id: "webhooks", label: "Webhooks", keywords: "webhook http callback post event funding apikey hmac signature" },
  { id: "team-collaboration", label: "Team Collaboration", keywords: "team member invite wallet collaboration owner role" },
  { id: "public-profiles", label: "Public Project Pages", keywords: "public profile page slug badge readme status latency" },
  { id: "sdk-reference", label: "SDK Reference", keywords: "sdk library reference types api endpoint paths" },
  { id: "rate-limits", label: "Rate Limits", keywords: "rate limit 429 throttle bandwidth quota scope" },
  { id: "troubleshooting", label: "Troubleshooting", keywords: "error debug fix 401 403 402 500 403 common issues" },
  { id: "network-status", label: "Network Status", keywords: "status health uptime live devnet solana network" },
  { id: "changelog", label: "Changelog", keywords: "release updates version changes new features" },
  { id: "migration", label: "Migration Guide", keywords: "migrate helius quicknode alchemy switch rpc provider 2-line change" },
  { id: "rate-limits-reference", label: "Rate Limits Reference", keywords: "rate limit table devnet requests per second 429" },
  { id: "error-codes", label: "Error Codes", keywords: "error codes 401 403 402 429 503 gateway api errors reference" },
  { id: "faq", label: "FAQ", keywords: "frequently asked questions faq devnet solana rpc gateway" },
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
        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">{eyebrow}</div>
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

export default function DocsPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

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

  const sdkInstallCode = `npm install @fyxvo/sdk
# or
pnpm add @fyxvo/sdk`;

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
const slot = await client.priority({
  id: 1,
  method: "getSlot",
});

console.log(slot.result);`;

  const sdkErrorCode = `import { FyxvoError, FyxvoApiError } from "@fyxvo/sdk";

try {
  const result = await client.rpc({ id: 1, method: "getHealth" });
} catch (err) {
  if (err instanceof FyxvoApiError) {
    // HTTP-level error from the gateway (4xx / 5xx)
    console.error(err.statusCode, err.message);
  } else if (err instanceof FyxvoError) {
    // SDK-level error (network, timeout, config)
    console.error(err.message);
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
                  <div className="text-xs uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">
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
          <section id="five-minute-quickstart" className="rounded-[1.5rem] border border-brand-500/20 bg-brand-500/5 p-6 space-y-5">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300 mb-1">Complete working example</div>
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
                  Use <code className="text-brand-600 dark:text-brand-300">wallet.signMessage(Buffer.from(challenge))</code> from{" "}
                  <code className="text-brand-600 dark:text-brand-300">@solana/wallet-adapter-base</code>. Convert the
                  resulting{" "}
                  <code className="text-brand-600 dark:text-brand-300">Uint8Array</code> signature to base58 before
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
                <code className="text-brand-600 dark:text-brand-300">rpc:request</code> scope. Under-scoped keys receive
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
                Standard path: <code className="text-brand-600 dark:text-brand-300">{webEnv.gatewayBaseUrl}/rpc</code>
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
                Priority keys must carry both <code className="text-brand-600 dark:text-brand-300">rpc:request</code>{" "}
                and <code className="text-brand-600 dark:text-brand-300">priority:relay</code> scopes. Sending a standard
                key to <code className="text-brand-600 dark:text-brand-300">/priority</code> returns 403.
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
const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
if (req.headers['x-fyxvo-signature'] !== expected) return res.status(401).end();`}
              />
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

          {/* ── SDK Reference ────────────────────────────────────── */}
          <section id="sdk-reference">
            <SectionHeading
              id="sdk-reference"
              eyebrow="Section 8"
              title="SDK Reference"
              description="@fyxvo/sdk TypeScript SDK — planned for post-alpha release."
            />
            <div className="space-y-5">
              <Notice tone="neutral" title="SDK is not yet published">
                {"@fyxvo/sdk"} is planned for post-alpha release. The examples below show the intended API. In the meantime, use the curl / fetch examples in the Standard RPC and Priority Relay sections — they are fully live today.
              </Notice>
              <CodeBlock code={sdkInstallCode} label="Install (coming soon)" />
              <CodeBlock code={sdkClientCode} label="Create a client" />
              <CodeBlock code={sdkRpcCode} label="client.rpc() — standard relay" />
              <CodeBlock code={sdkPriorityCode} label="client.priority() — priority relay" />
              <CodeBlock code={sdkErrorCode} label="Error handling" />
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
                  <div className="text-xs uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300 mb-3">
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
                  <div className="text-xs uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300 mb-3">
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
                Every response includes <code className="text-brand-600 dark:text-brand-300">x-ratelimit-limit</code>,{" "}
                <code className="text-brand-600 dark:text-brand-300">x-ratelimit-remaining</code>, and{" "}
                <code className="text-brand-600 dark:text-brand-300">x-ratelimit-reset</code> headers. Use these to
                implement adaptive backoff without waiting for a 429.
              </Notice>
            </div>
          </section>

          {/* ── Troubleshooting ──────────────────────────────────── */}
          <section id="troubleshooting">
            <SectionHeading
              id="troubleshooting"
              eyebrow="Section 10"
              title="Troubleshooting"
              description="Common issues and fastest paths to resolution."
            />
            <div className="space-y-4">
              {[
                {
                  title: "Project not activated",
                  badge: "403",
                  tone: "warning" as const,
                  body: "If the gateway returns 403 and the project was just created, the on-chain activation transaction may not have confirmed yet. Check the project page — the status will show Pending until devnet confirms. If it stays pending more than 30 seconds, try re-sending the activation transaction from the dashboard.",
                },
                {
                  title: "Wrong network",
                  badge: "config",
                  tone: "warning" as const,
                  body: `The API and gateway are configured for Solana devnet (${webEnv.solanaCluster}). Wallet adapters must also point to devnet. If you see RPC errors or unexpected balances, confirm the cluster is set correctly in your wallet and SDK config.`,
                },
                {
                  title: "Low SOL balance",
                  badge: "402",
                  tone: "warning" as const,
                  body: "A 402 response from the gateway means the project's funded SOL balance is insufficient to cover the request. Check the project's current balance in the dashboard, fund more SOL, and verify the transaction before retrying.",
                },
                {
                  title: "Wrong scope on key",
                  badge: "403",
                  tone: "warning" as const,
                  body: "Standard relay requires rpc:request. Priority relay requires both rpc:request and priority:relay. Sending a standard key to /priority returns 403. Generate a new key with the correct scopes from the API keys page.",
                },
                {
                  title: "402 after funding",
                  badge: "402",
                  tone: "warning" as const,
                  body: "If a 402 persists after funding, the API may not have verified the transaction yet. Use the fund/verify endpoint with the transaction signature to trigger a manual balance refresh. If the issue continues, check that the correct project ID is selected.",
                },
                {
                  title: "JWT expired",
                  badge: "401",
                  tone: "neutral" as const,
                  body: "JWTs expire after 24 hours. A 401 from the API means the token is expired or malformed. Re-run the challenge + verify flow to get a fresh token. There is no silent refresh endpoint.",
                },
              ].map((item) => (
                <Notice key={item.title} tone={item.tone} title={item.title}>
                  <span className="mr-2 inline-flex items-center rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-1.5 py-0.5 text-xs font-mono text-[var(--fyxvo-text-muted)]">
                    {item.badge}
                  </span>
                  {item.body}
                </Notice>
              ))}
            </div>
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
                      <code className="break-all text-xs text-brand-600 dark:text-brand-300">{item.url}</code>
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
                      <div className="text-xs uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">
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
                  <li>WebSocket subscriptions (coming soon)</li>
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
