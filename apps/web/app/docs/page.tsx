"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";

const API = "https://api.fyxvo.com";

// ---------------------------------------------------------------------------
// Sidebar sections
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "quickstart", label: "Quick start" },
  { id: "authentication", label: "Authentication" },
  { id: "projects", label: "Projects" },
  { id: "api-keys", label: "API Keys" },
  { id: "funding", label: "Funding" },
  { id: "relay-gateway", label: "Relay Gateway" },
  { id: "analytics", label: "Analytics" },
  { id: "assistant", label: "Assistant" },
  { id: "webhooks", label: "Webhooks" },
  { id: "api-reference", label: "API Reference" },
  { id: "api-explorer", label: "API Explorer" },
];

// ---------------------------------------------------------------------------
// DocCodeBlock — client component with copy button
// ---------------------------------------------------------------------------

function DocCodeBlock({ code, language = "bash" }: { readonly code: string; readonly language?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative my-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
        <span className="text-xs font-mono text-[#64748b]">{language}</span>
        <button
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#64748b] hover:text-[#f1f5f9] hover:border-white/[0.15] transition-colors"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm font-mono text-[#f1f5f9] leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ApiExplorer — client component for live API testing
// ---------------------------------------------------------------------------

const EXPLORER_ENDPOINTS = [
  { label: "GET /v1/me", method: "GET", path: "/v1/me" },
  { label: "GET /v1/projects", method: "GET", path: "/v1/projects" },
  { label: "GET /v1/analytics/overview", method: "GET", path: "/v1/analytics/overview" },
];

export function ApiExplorer() {
  const [jwt, setJwt] = useState("");
  const [selectedEndpoint, setSelectedEndpoint] = useState(EXPLORER_ENDPOINTS[0]);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);

  async function handleSend() {
    if (!selectedEndpoint) return;
    setLoading(true);
    setResponse(null);
    setStatus(null);
    try {
      const res = await fetch(`${API}${selectedEndpoint.path}`, {
        method: selectedEndpoint.method,
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
      });
      setStatus(res.status);
      const text = await res.text();
      try {
        setResponse(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponse(text);
      }
    } catch (err) {
      setResponse(err instanceof Error ? err.message : "Request failed");
      setStatus(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
      <h3 className="text-lg font-semibold text-[#f1f5f9]">Live API Explorer</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-[#64748b] mb-1">JWT Token</label>
          <textarea
            value={jwt}
            onChange={(e) => setJwt(e.target.value)}
            rows={3}
            placeholder="Paste your JWT token here (optional for public endpoints)"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-mono text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#f97316]/50 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#64748b] mb-1">Endpoint</label>
          <select
            value={selectedEndpoint?.path}
            onChange={(e) => {
              const ep = EXPLORER_ENDPOINTS.find((x) => x.path === e.target.value);
              if (ep) setSelectedEndpoint(ep);
            }}
            className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-3 py-2 text-sm text-[#f1f5f9] focus:outline-none focus:border-[#f97316]/50"
          >
            {EXPLORER_ENDPOINTS.map((ep) => (
              <option key={ep.path} value={ep.path}>
                {ep.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => void handleSend()}
          disabled={loading}
          className="w-full rounded-xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ea6c0a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Sending..." : "Send request"}
        </button>
      </div>
      {(response !== null || status !== null) && (
        <div className="space-y-2">
          {status !== null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#64748b]">Status:</span>
              <span
                className={`text-xs font-mono font-semibold ${
                  status >= 200 && status < 300
                    ? "text-emerald-400"
                    : status >= 400
                    ? "text-rose-400"
                    : "text-amber-400"
                }`}
              >
                {status === 0 ? "Network Error" : status}
              </span>
            </div>
          )}
          {response !== null && (
            <pre className="overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-xs font-mono text-[#f1f5f9] max-h-96 overflow-y-auto">
              {response}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section components
// ---------------------------------------------------------------------------

function SectionHeader({ id, title }: { readonly id: string; readonly title: string }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-2xl font-bold text-[#f1f5f9] mb-4">
      {title}
    </h2>
  );
}

function SubHeader({ children }: { readonly children: ReactNode }) {
  return <h3 className="text-lg font-semibold text-[#f1f5f9] mt-6 mb-2">{children}</h3>;
}

function Prose({ children }: { readonly children: ReactNode }) {
  return <p className="text-[#64748b] leading-relaxed mb-4">{children}</p>;
}

function SectionDivider() {
  return <hr className="border-white/[0.06] my-12" />;
}

function EndpointBadge({ method }: { readonly method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    POST: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    PATCH: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    DELETE: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-mono font-semibold border ${
        colors[method] ?? "bg-white/[0.05] text-[#64748b] border-white/[0.08]"
      }`}
    >
      {method}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DocsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  const handleScroll = useCallback(() => {
    let current = "overview";
    for (const sec of SECTIONS) {
      const el = document.getElementById(sec.id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) current = sec.id;
      }
    }
    setActiveSection(current);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0f]/95 lg:hidden overflow-y-auto">
          <div className="flex justify-between items-center px-4 py-4 border-b border-white/[0.06]">
            <span className="font-semibold text-[#f1f5f9]">Documentation</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg border border-white/[0.08] text-[#64748b] hover:text-[#f1f5f9]"
            >
              ✕
            </button>
          </div>
          <nav className="px-4 py-4 space-y-1">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => scrollTo(sec.id)}
                className="w-full text-left px-3 py-2 rounded-xl text-sm text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/[0.05] transition-colors"
              >
                {sec.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        {/* Mobile menu toggle */}
        <div className="lg:hidden mb-6">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#64748b] hover:text-[#f1f5f9] transition-colors"
          >
            <span>☰</span>
            <span>Menu</span>
          </button>
        </div>

        <div className="flex gap-12">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-[280px] shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-4">
                Documentation
              </p>
              <nav className="space-y-1">
                {SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => scrollTo(sec.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                      activeSection === sec.id
                        ? "bg-[#f97316]/10 text-[#f97316] font-medium"
                        : "text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/[0.05]"
                    }`}
                  >
                    {sec.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1 max-w-3xl">
            {/* Overview */}
            <section>
              <SectionHeader id="overview" title="Overview" />
              <Prose>
                Fyxvo is a decentralized RPC relay network built on Solana. It routes JSON-RPC
                requests to the fastest available upstream node while metering usage on-chain —
                every request is logged as a lamport-denominated cost against your project&apos;s
                funded treasury account. There are no monthly subscription fees; you pay only for
                what you use.
              </Prose>
              <Prose>
                The network is currently in devnet alpha. All on-chain accounts, funding, and
                transactions operate on Solana devnet. API endpoints, SDKs, and operational
                guarantees may change without notice during this phase. Breaking changes will be
                announced in the changelog.
              </Prose>
              <Prose>
                Fyxvo is designed for teams building high-throughput Solana applications who need
                reliable, cost-transparent RPC access without managing their own node
                infrastructure. Priority relay routes allow bursty workloads to skip standard
                queuing and hit premium upstream capacity directly.
              </Prose>
            </section>

            <SectionDivider />

            {/* Quick start */}
            <section>
              <SectionHeader id="quickstart" title="Quick start" />
              <Prose>
                Get from zero to your first routed RPC request in four steps.
              </Prose>

              <SubHeader>Step 1 — Connect a Solana wallet</SubHeader>
              <Prose>
                Click "Connect wallet" in the dashboard header. Fyxvo supports Phantom, Solflare,
                Backpack, Coinbase Wallet, Trust Wallet, and any Wallet Standard compatible
                extension. After connecting, the wallet signs a challenge message to establish an
                authenticated session. No private keys are ever sent to Fyxvo servers.
              </Prose>

              <SubHeader>Step 2 — Activate a project</SubHeader>
              <Prose>
                From the Dashboard, click "New project". Choose a slug, name, and optional
                description. Fyxvo generates an on-chain activation transaction — sign it in your
                wallet. Once the transaction confirms, a project PDA is created on devnet and your
                project becomes operational.
              </Prose>

              <SubHeader>Step 3 — Get an API key</SubHeader>
              <Prose>
                Open the project, navigate to API Keys, and create a key with the scopes you need.
                The plaintext key is shown once immediately after creation. Store it securely — it
                cannot be recovered after you close the dialog.
              </Prose>

              <SubHeader>Step 4 — Send a request</SubHeader>
              <Prose>
                Point your RPC client at the Fyxvo relay gateway and include your API key in the
                Authorization header:
              </Prose>
              <DocCodeBlock
                language="bash"
                code={`curl https://rpc.fyxvo.com/rpc \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer fyxvo_YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot","params":[]}'`}
              />
            </section>

            <SectionDivider />

            {/* Authentication */}
            <section>
              <SectionHeader id="authentication" title="Authentication" />
              <Prose>
                All Fyxvo API endpoints (except public explore and status endpoints) require a JWT
                obtained through wallet-based authentication. The auth flow is a two-step
                challenge–verify sequence that proves ownership of a Solana wallet without
                transmitting a private key.
              </Prose>

              <SubHeader>Step 1 — Request a challenge</SubHeader>
              <Prose>
                POST to <code className="text-[#f97316]">/v1/auth/challenge</code> with your wallet
                address. The server returns a nonce message to sign.
              </Prose>
              <DocCodeBlock
                language="bash"
                code={`POST ${API}/v1/auth/challenge
Content-Type: application/json

{
  "walletAddress": "YourSolanaPublicKey"
}`}
              />
              <Prose>Response:</Prose>
              <DocCodeBlock
                language="json"
                code={`{
  "message": "Sign this message to authenticate with Fyxvo:\\n\\nNonce: abc123def456\\nIssued: 2026-03-27T12:00:00Z",
  "expiresAt": "2026-03-27T12:05:00Z"
}`}
              />

              <SubHeader>Step 2 — Sign the message</SubHeader>
              <Prose>
                Use your wallet to sign the returned message. In Phantom or Solflare, call{" "}
                <code className="text-[#f97316]">signMessage()</code> on the Uint8Array-encoded
                message. The result is a base58-encoded signature.
              </Prose>

              <SubHeader>Step 3 — Verify and receive JWT</SubHeader>
              <Prose>
                POST the signature to <code className="text-[#f97316]">/v1/auth/verify</code>. On
                success, you receive a JWT valid for 24 hours.
              </Prose>
              <DocCodeBlock
                language="bash"
                code={`POST ${API}/v1/auth/verify
Content-Type: application/json

{
  "walletAddress": "YourSolanaPublicKey",
  "signature": "base58EncodedSignature"
}`}
              />
              <Prose>Response:</Prose>
              <DocCodeBlock
                language="json"
                code={`{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-03-28T12:00:00Z",
  "user": {
    "id": "usr_...",
    "walletAddress": "YourSolanaPublicKey",
    "displayName": "...",
    "role": "OWNER"
  }
}`}
              />
              <Prose>
                Include the JWT in subsequent requests via the Authorization header:{" "}
                <code className="text-[#f97316]">Authorization: Bearer &lt;token&gt;</code>.
              </Prose>
            </section>

            <SectionDivider />

            {/* Projects */}
            <section>
              <SectionHeader id="projects" title="Projects" />
              <Prose>
                A project is the fundamental billing and routing unit in Fyxvo. Each project has its
                own on-chain PDA, treasury balance, API keys, request logs, and analytics. One
                wallet can own multiple projects.
              </Prose>

              <SubHeader>Create a project</SubHeader>
              <DocCodeBlock
                language="bash"
                code={`POST ${API}/v1/projects
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "slug": "my-app",
  "name": "My Application",
  "description": "Production RPC endpoint for my Solana dApp"
}`}
              />

              <SubHeader>List projects</SubHeader>
              <DocCodeBlock
                language="bash"
                code={`GET ${API}/v1/projects
Authorization: Bearer <jwt>`}
              />
              <Prose>
                After creation, the project must be activated with an on-chain transaction before
                requests are routed. The dashboard walks through the activation flow automatically.
                Until activated, API keys on the project will return a 403 response.
              </Prose>
              <Prose>
                Projects can be archived to stop routing without deletion. Archived projects
                preserve all historical logs and analytics.
              </Prose>
            </section>

            <SectionDivider />

            {/* API Keys */}
            <section>
              <SectionHeader id="api-keys" title="API Keys" />
              <Prose>
                API keys authenticate requests at the relay gateway. Each key is scoped to a project
                and carries one or more permission scopes. Keys can be rotated or revoked without
                affecting other keys on the same project.
              </Prose>

              <SubHeader>Scopes</SubHeader>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-2 pr-4 font-medium text-[#64748b]">Scope</th>
                      <th className="text-left py-2 font-medium text-[#64748b]">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {[
                      ["rpc:request", "Route standard JSON-RPC requests through the relay"],
                      ["priority:relay", "Route requests through the priority relay path"],
                      ["project:read", "Read project configuration"],
                      ["analytics:read", "Read request logs and analytics data"],
                      ["webhooks:write", "Create and manage webhook endpoints"],
                    ].map(([scope, desc]) => (
                      <tr key={scope}>
                        <td className="py-2 pr-4 font-mono text-[#f97316] text-xs">{scope}</td>
                        <td className="py-2 text-[#64748b]">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <SubHeader>Create an API key</SubHeader>
              <DocCodeBlock
                language="bash"
                code={`POST ${API}/v1/projects/:id/api-keys
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "label": "Production key",
  "scopes": ["rpc:request", "priority:relay"]
}`}
              />
              <Prose>
                The response includes the full plaintext key exactly once. Store it immediately.
              </Prose>

              <SubHeader>List API keys</SubHeader>
              <DocCodeBlock
                language="bash"
                code={`GET ${API}/v1/projects/:id/api-keys
Authorization: Bearer <jwt>`}
              />

              <SubHeader>Revoke an API key</SubHeader>
              <DocCodeBlock
                language="bash"
                code={`DELETE ${API}/v1/projects/:id/api-keys/:keyId
Authorization: Bearer <jwt>`}
              />
            </section>

            <SectionDivider />

            {/* Funding */}
            <section>
              <SectionHeader id="funding" title="Funding" />
              <Prose>
                Fyxvo uses a prepaid lamport model. Each project has an on-chain treasury account.
                Every request through the relay deducts a fixed number of lamports based on the
                endpoint type and relay path. When the balance drops below your configured threshold,
                an alert fires.
              </Prose>

              <Prose>
                Current pricing (devnet alpha): standard relay requests cost approximately 1,000
                lamports each. Priority relay requests cost approximately 5,000 lamports each.
                Prices will be adjusted before mainnet launch.
              </Prose>

              <SubHeader>Prepare a funding transaction</SubHeader>
              <Prose>
                The funding flow is two steps: prepare (builds the unsigned transaction) then verify
                (confirms it landed on-chain). The dashboard handles this automatically, but you can
                also fund programmatically.
              </Prose>
              <DocCodeBlock
                language="bash"
                code={`POST ${API}/v1/projects/:id/funding/prepare
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "asset": "SOL",
  "lamportAmount": 100000000,
  "funderWalletAddress": "YourSolanaPublicKey"
}`}
              />
              <Prose>Response includes <code className="text-[#f97316]">transactionBase64</code> — a serialized, unsigned VersionedTransaction. Sign it with your wallet and submit to the Solana network.</Prose>

              <SubHeader>Verify funding</SubHeader>
              <DocCodeBlock
                language="bash"
                code={`POST ${API}/v1/projects/:id/funding/verify
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "fundingRequestId": "fr_...",
  "signature": "5KtPn..."
}`}
              />
            </section>

            <SectionDivider />

            {/* Relay Gateway */}
            <section>
              <SectionHeader id="relay-gateway" title="Relay Gateway" />
              <Prose>
                The Fyxvo relay gateway accepts standard Solana JSON-RPC requests and routes them to
                the best available upstream node. There are two relay paths.
              </Prose>

              <SubHeader>Standard relay</SubHeader>
              <Prose>
                URL: <code className="text-[#f97316]">https://rpc.fyxvo.com/rpc</code>
              </Prose>
              <Prose>
                Standard relay is appropriate for most read operations — account lookups, balance
                queries, block data, and non-latency-sensitive transaction simulation. Requests are
                load-balanced across all available upstream nodes.
              </Prose>
              <DocCodeBlock
                language="bash"
                code={`curl https://rpc.fyxvo.com/rpc \\
  -H "Authorization: Bearer fyxvo_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getBalance","params":["<pubkey>"]}'`}
              />

              <SubHeader>Priority relay</SubHeader>
              <Prose>
                URL: <code className="text-[#f97316]">https://rpc.fyxvo.com/priority</code>
              </Prose>
              <Prose>
                Priority relay is for latency-sensitive operations: transaction submission,
                confirmation polling, and MEV-critical read operations. Priority requests skip the
                standard queue and are routed to premium upstream capacity. The key must have the{" "}
                <code className="text-[#f97316]">priority:relay</code> scope.
              </Prose>
              <DocCodeBlock
                language="bash"
                code={`curl https://rpc.fyxvo.com/priority \\
  -H "Authorization: Bearer fyxvo_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"sendTransaction","params":["<txBase64>",{"encoding":"base64"}]}'`}
              />
            </section>

            <SectionDivider />

            {/* Analytics */}
            <section>
              <SectionHeader id="analytics" title="Analytics" />
              <Prose>
                Fyxvo records every request with method, status code, upstream latency, and region.
                Analytics are available at the account level (across all projects) and per-project.
              </Prose>

              <SubHeader>Account-level overview</SubHeader>
              <DocCodeBlock
                language="bash"
                code={`GET ${API}/v1/analytics/overview
Authorization: Bearer <jwt>`}
              />
              <Prose>Returns totals for request logs, active projects, API keys, and aggregate latency percentiles over the last 24 hours, 7 days, and 30 days.</Prose>

              <SubHeader>Per-project analytics</SubHeader>
              <DocCodeBlock
                language="bash"
                code={`GET ${API}/v1/analytics/projects/:projectId?range=24h
Authorization: Bearer <jwt>`}
              />
              <Prose>
                Supported range values: <code className="text-[#f97316]">1h</code>,{" "}
                <code className="text-[#f97316]">6h</code>,{" "}
                <code className="text-[#f97316]">24h</code>,{" "}
                <code className="text-[#f97316]">7d</code>,{" "}
                <code className="text-[#f97316]">30d</code>. The response includes method breakdown,
                status code distribution, latency percentiles (p50, p95, p99), and time-bucketed
                request counts for charting.
              </Prose>

              <SubHeader>Export as CSV</SubHeader>
              <DocCodeBlock
                language="bash"
                code={`GET ${API}/v1/projects/:projectId/analytics/export
Authorization: Bearer <jwt>`}
              />
            </section>

            <SectionDivider />

            {/* Assistant */}
            <section>
              <SectionHeader id="assistant" title="Assistant" />
              <Prose>
                Fyxvo includes an AI assistant specialized in Solana development, RPC optimization,
                and on-chain debugging. The assistant is aware of your project configuration and can
                reference real analytics to suggest improvements.
              </Prose>

              <SubHeader>Chat endpoint</SubHeader>
              <DocCodeBlock
                language="bash"
                code={`POST ${API}/v1/assistant/chat
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "message": "Why is my getAccountInfo latency spiking?",
  "projectId": "proj_..."
}`}
              />

              <SubHeader>SSE streaming</SubHeader>
              <Prose>
                For streaming responses, add the <code className="text-[#f97316]">Accept: text/event-stream</code> header. The server sends Server-Sent Events with delta chunks. Each event has format{" "}
                <code className="text-[#f97316]">data: &#123;"delta":"..."&#125;</code>. A final{" "}
                <code className="text-[#f97316]">data: [DONE]</code> event signals completion.
              </Prose>
              <DocCodeBlock
                language="javascript"
                code={`const res = await fetch("${API}/v1/assistant/chat", {
  method: "POST",
  headers: {
    "Authorization": "Bearer <jwt>",
    "Content-Type": "application/json",
    "Accept": "text/event-stream",
  },
  body: JSON.stringify({ message: "Explain getLatestBlockhash" })
});

const reader = res.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}`}
              />

              <Prose>
                Rate limits during devnet alpha: 20 messages per minute per wallet, 200 messages per
                day per wallet. Limits will increase at mainnet launch.
              </Prose>
            </section>

            <SectionDivider />

            {/* Webhooks */}
            <section>
              <SectionHeader id="webhooks" title="Webhooks" />
              <Prose>
                Fyxvo can POST event payloads to your server when important conditions occur on a
                project. Webhook delivery is at-least-once with exponential backoff retry for up to
                24 hours. Delivery failures after 24 hours are marked as abandoned.
              </Prose>

              <SubHeader>Event types</SubHeader>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-2 pr-4 font-medium text-[#64748b]">Event</th>
                      <th className="text-left py-2 font-medium text-[#64748b]">Fires when</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {[
                      ["project.low_balance", "Treasury falls below the low-balance threshold"],
                      ["project.activated", "On-chain activation transaction confirms"],
                      ["api_key.created", "A new API key is created on the project"],
                      ["api_key.revoked", "An API key is revoked"],
                      ["request.error_spike", "Error rate exceeds 5% in a 5-minute window"],
                      ["funding.confirmed", "A funding transaction confirms on-chain"],
                    ].map(([event, desc]) => (
                      <tr key={event}>
                        <td className="py-2 pr-4 font-mono text-[#f97316] text-xs">{event}</td>
                        <td className="py-2 text-[#64748b]">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <SubHeader>HMAC signature verification</SubHeader>
              <Prose>
                Every webhook delivery includes an{" "}
                <code className="text-[#f97316]">X-Fyxvo-Signature</code> header containing an
                HMAC-SHA256 signature of the raw request body, keyed with your webhook secret.
                Verify this signature before processing the payload.
              </Prose>
              <DocCodeBlock
                language="javascript"
                code={`import crypto from "crypto";

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(\`sha256=\${expected}\`)
  );
}`}
              />
            </section>

            <SectionDivider />

            {/* API Reference */}
            <section>
              <SectionHeader id="api-reference" title="API Reference" />
              <Prose>Complete list of all Fyxvo API endpoints.</Prose>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-2 pr-3 font-medium text-[#64748b]">Method</th>
                      <th className="text-left py-2 pr-3 font-medium text-[#64748b]">Path</th>
                      <th className="text-left py-2 font-medium text-[#64748b]">Auth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {[
                      ["POST", "/v1/auth/challenge", "None"],
                      ["POST", "/v1/auth/verify", "None"],
                      ["GET", "/v1/me", "JWT"],
                      ["GET", "/v1/projects", "JWT"],
                      ["POST", "/v1/projects", "JWT"],
                      ["GET", "/v1/projects/:id", "JWT"],
                      ["PATCH", "/v1/projects/:id", "JWT"],
                      ["DELETE", "/v1/projects/:id", "JWT"],
                      ["GET", "/v1/projects/:id/api-keys", "JWT"],
                      ["POST", "/v1/projects/:id/api-keys", "JWT"],
                      ["DELETE", "/v1/projects/:id/api-keys/:keyId", "JWT"],
                      ["POST", "/v1/projects/:id/api-keys/:keyId/rotate", "JWT"],
                      ["POST", "/v1/projects/:id/funding/prepare", "JWT"],
                      ["POST", "/v1/projects/:id/funding/verify", "JWT"],
                      ["GET", "/v1/projects/:id/onchain", "JWT"],
                      ["GET", "/v1/analytics/overview", "JWT"],
                      ["GET", "/v1/analytics/projects/:id", "JWT"],
                      ["GET", "/v1/projects/:id/analytics/methods", "JWT"],
                      ["GET", "/v1/projects/:id/analytics/errors", "JWT"],
                      ["GET", "/v1/projects/:id/analytics/export", "JWT"],
                      ["GET", "/v1/alerts", "JWT"],
                      ["PATCH", "/v1/alerts/:key", "JWT"],
                      ["GET", "/v1/transactions", "JWT"],
                      ["GET", "/v1/explore", "None"],
                      ["POST", "/v1/assistant/chat", "JWT"],
                      ["GET", "/v1/projects/:id/webhooks", "JWT"],
                      ["POST", "/v1/projects/:id/webhooks", "JWT"],
                      ["DELETE", "/v1/projects/:id/webhooks/:webhookId", "JWT"],
                    ].map(([method, path, auth]) => (
                      <tr key={`${method ?? ""}-${path ?? ""}`}>
                        <td className="py-2 pr-3">
                          <EndpointBadge method={method ?? ""} />
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs text-[#f1f5f9]">{path}</td>
                        <td className="py-2 text-xs text-[#64748b]">{auth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <SectionDivider />

            {/* API Explorer */}
            <section>
              <SectionHeader id="api-explorer" title="API Explorer" />
              <Prose>
                Test live API calls directly from the documentation. Paste your JWT token, choose an
                endpoint, and click Send. Responses are formatted as JSON below.
              </Prose>
              <ApiExplorer />
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
