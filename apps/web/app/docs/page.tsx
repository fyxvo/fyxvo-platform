"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@fyxvo/ui";
import { CopyButton } from "../../components/copy-button";
import { webEnv } from "../../lib/env";
import { MenuIcon, CloseIcon } from "../../components/icons";

// ---------------------------------------------------------------------------
// Sidebar navigation data
// ---------------------------------------------------------------------------

const sidebarGroups = [
  {
    label: "Getting started",
    items: [
      { id: "introduction", label: "Introduction" },
      { id: "quickstart", label: "Quickstart" },
      { id: "framework-quickstarts", label: "Framework quickstarts" },
    ],
  },
  {
    label: "Core concepts",
    items: [
      { id: "authentication", label: "Authentication" },
      { id: "funding", label: "Funding" },
      { id: "standard-rpc", label: "Standard RPC" },
      { id: "priority-relay", label: "Priority Relay" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { id: "analytics-overview", label: "Analytics overview" },
      { id: "analytics-api", label: "Analytics API" },
      { id: "public-stats-api", label: "Public Stats API" },
    ],
  },
  {
    label: "Developer tools",
    items: [
      { id: "api-explorer", label: "API Explorer" },
      { id: "playground-section", label: "Playground" },
      { id: "sdk-reference", label: "SDK Reference" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "operations-guide", label: "Operations Guide" },
      { id: "release-guide", label: "Release Guide" },
      { id: "cicd-integration", label: "CI/CD Integration" },
      { id: "migration-guide", label: "Migration Guide" },
    ],
  },
  {
    label: "Reference",
    items: [
      { id: "rate-limits", label: "Rate Limits" },
      { id: "simulation-mode", label: "Simulation Mode" },
      { id: "api-versioning", label: "API Versioning" },
      { id: "error-reference", label: "Error Reference" },
      { id: "error-codes", label: "Error Codes" },
      { id: "faq", label: "FAQ" },
      { id: "rpc-reference", label: "RPC Reference" },
    ],
  },
  {
    label: "Platform",
    items: [
      { id: "webhooks", label: "Webhooks" },
      { id: "team-collaboration", label: "Team Collaboration" },
      { id: "public-project-pages", label: "Public Project Pages" },
      { id: "changelog-section", label: "Changelog" },
    ],
  },
  {
    label: "Network",
    items: [
      { id: "network-status-section", label: "Network Status" },
      { id: "status-api", label: "Status API" },
      { id: "troubleshooting", label: "Troubleshooting" },
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]">
      <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-4 py-2.5">
        <span className="font-mono text-xs text-[var(--fyxvo-text-muted)]">{language}</span>
        <CopyButton value={code} label="Copy" />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-[var(--fyxvo-text-soft)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]"
    >
      {title}
    </h2>
  );
}

function SectionDivider() {
  return <hr className="border-[var(--fyxvo-border)]" />;
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 text-[15px] leading-7 text-[var(--fyxvo-text-soft)]">{children}</div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-[var(--fyxvo-panel)] px-1.5 py-0.5 font-mono text-xs text-[var(--fyxvo-brand)]">
      {children}
    </code>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("introduction");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Active section tracking via IntersectionObserver
  useEffect(() => {
    const allIds = sidebarGroups.flatMap((g) => g.items.map((i) => i.id));
    const observers: IntersectionObserver[] = [];

    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry?.isIntersecting) {
            setActiveSection(id);
          }
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setSidebarOpen(false);
  }

  // ---------------------------------------------------------------------------
  // Sidebar content (reused for desktop + mobile drawer)
  // ---------------------------------------------------------------------------

  function SidebarContent() {
    return (
      <div className="px-4 py-6">
        <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
          Documentation
        </p>
        <div className="space-y-5">
          {sidebarGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fyxvo-text-muted)]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={[
                      "w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
                      activeSection === item.id
                        ? "bg-[var(--fyxvo-brand-subtle)] font-medium text-[var(--fyxvo-brand)]"
                        : "text-[var(--fyxvo-text-soft)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Framework quickstart tabs state
  // ---------------------------------------------------------------------------

  const [fwTab, setFwTab] = useState<"nextjs" | "react" | "nodejs" | "python" | "rust">("nextjs");
  const fwTabs: Array<{ key: typeof fwTab; label: string }> = [
    { key: "nextjs", label: "Next.js" },
    { key: "react", label: "React" },
    { key: "nodejs", label: "Node.js" },
    { key: "python", label: "Python" },
    { key: "rust", label: "Rust" },
  ];

  const fwCode: Record<typeof fwTab, { language: string; code: string }> = {
    nextjs: {
      language: "tsx",
      code: `// app/page.tsx — Server Component
export default async function Page() {
  const res = await fetch("https://rpc.fyxvo.com/rpc", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.FYXVO_API_KEY!,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
    cache: "no-store",
  });
  const data = await res.json();
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}`,
    },
    react: {
      language: "tsx",
      code: `// components/HealthCheck.tsx
import { useEffect, useState } from "react";

export function HealthCheck() {
  const [status, setStatus] = useState<string>("loading\u2026");

  useEffect(() => {
    fetch("https://rpc.fyxvo.com/rpc", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": import.meta.env.VITE_FYXVO_API_KEY,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
    })
      .then((r) => r.json())
      .then((d) => setStatus(d.result))
      .catch(() => setStatus("error"));
  }, []);

  return <p>Network: {status}</p>;
}`,
    },
    nodejs: {
      language: "js",
      code: `// health-check.mjs
const res = await fetch("https://rpc.fyxvo.com/rpc", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": process.env.FYXVO_API_KEY,
  },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
});

const { result } = await res.json();
console.log("Health:", result); // "ok"`,
    },
    python: {
      language: "python",
      code: `# health_check.py
import os, requests

response = requests.post(
    "https://rpc.fyxvo.com/rpc",
    json={"jsonrpc": "2.0", "id": 1, "method": "getHealth"},
    headers={
        "content-type": "application/json",
        "x-api-key": os.environ["FYXVO_API_KEY"],
    },
)
data = response.json()
print("Health:", data["result"])  # ok`,
    },
    rust: {
      language: "rust",
      code: `// src/main.rs
use reqwest::Client;
use serde_json::json;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let api_key = std::env::var("FYXVO_API_KEY")?;
    let client = Client::new();

    let body = json!({ "jsonrpc": "2.0", "id": 1, "method": "getHealth" });

    let resp: serde_json::Value = client
        .post("https://rpc.fyxvo.com/rpc")
        .header("content-type", "application/json")
        .header("x-api-key", &api_key)
        .json(&body)
        .send()
        .await?
        .json()
        .await?;

    println!("Health: {}", resp["result"]);
    Ok(())
}`,
    },
  };

  // ---------------------------------------------------------------------------
  // API Explorer state
  // ---------------------------------------------------------------------------

  const [apiJwt, setApiJwt] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("/v1/analytics/overview");
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiBody, setApiBody] = useState("");
  const [apiResponse, setApiResponse] = useState<unknown>(null);
  const [apiLoading, setApiLoading] = useState(false);

  async function sendApiRequest() {
    setApiLoading(true);
    try {
      const url = new URL(apiEndpoint, webEnv.apiBaseUrl).toString();
      const opts: RequestInit = {
        method: apiMethod,
        headers: {
          authorization: `Bearer ${apiJwt}`,
          "content-type": "application/json",
        },
      };
      if (apiMethod !== "GET" && apiBody.trim()) {
        opts.body = apiBody;
      }
      const res = await fetch(url, opts);
      setApiResponse(await res.json());
    } catch (e) {
      setApiResponse({ error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setApiLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // RPC methods table data
  // ---------------------------------------------------------------------------

  const rpcMethods = [
    { method: "getHealth", endpoint: "/rpc", description: "Returns 'ok' when the node is healthy." },
    { method: "getSlot", endpoint: "/rpc", description: "Returns the current slot the node is processing." },
    { method: "getBlockHeight", endpoint: "/rpc", description: "Returns the current block height." },
    { method: "getEpochInfo", endpoint: "/rpc", description: "Returns information about the current epoch." },
    { method: "getBalance", endpoint: "/rpc", description: "Returns the SOL balance of an account in lamports." },
    { method: "getAccountInfo", endpoint: "/rpc", description: "Returns all information associated with a given account." },
    { method: "getMultipleAccounts", endpoint: "/rpc", description: "Returns account information for a list of public keys." },
    { method: "getProgramAccounts", endpoint: "/rpc", description: "Returns all accounts owned by the specified program." },
    { method: "getTokenAccountsByOwner", endpoint: "/rpc", description: "Returns SPL token accounts by owner." },
    { method: "getTokenSupply", endpoint: "/rpc", description: "Returns total supply of a token mint." },
    { method: "getTokenAccountBalance", endpoint: "/rpc", description: "Returns the token balance of an SPL token account." },
    { method: "getTransaction", endpoint: "/rpc", description: "Returns transaction details for a confirmed signature." },
    { method: "getSignaturesForAddress", endpoint: "/rpc", description: "Returns signatures for an address with optional range." },
    { method: "getRecentBlockhash", endpoint: "/rpc", description: "Returns a recent blockhash and fee schedule (legacy)." },
    { method: "getLatestBlockhash", endpoint: "/rpc", description: "Returns the latest blockhash and last-valid block height." },
    { method: "getFeeForMessage", endpoint: "/rpc", description: "Returns the fee the network will charge for a given message." },
    { method: "sendTransaction", endpoint: "/rpc", description: "Submits a signed transaction to the cluster for processing." },
    { method: "simulateTransaction", endpoint: "/rpc", description: "Simulates a transaction without broadcasting it." },
    { method: "getMinimumBalanceForRentExemption", endpoint: "/rpc", description: "Returns minimum balance for an account to be rent-exempt." },
    { method: "getBlockProduction", endpoint: "/rpc", description: "Returns recent block production information from the cluster." },
    { method: "getClusterNodes", endpoint: "/rpc", description: "Returns contact information for all cluster nodes." },
    { method: "getVersion", endpoint: "/rpc", description: "Returns the current Solana software version." },
    { method: "requestAirdrop", endpoint: "/rpc", description: "Requests an airdrop of lamports to an account (devnet only)." },
    { method: "sendTransaction (priority)", endpoint: "/priority", description: "Routes via priority relay for latency-sensitive submissions." },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex min-h-screen bg-[var(--fyxvo-bg)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-[76px] hidden h-[calc(100vh-76px)] w-64 shrink-0 overflow-y-auto border-r border-[var(--fyxvo-border)] lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar toggle button */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] shadow-lg lg:hidden"
        aria-label="Open docs navigation"
      >
        <MenuIcon className="h-5 w-5 text-[var(--fyxvo-text)]" />
      </button>

      {/* Mobile sidebar drawer */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto border-r border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-4 py-3">
              <span className="text-sm font-semibold text-[var(--fyxvo-text)]">Documentation</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                aria-label="Close navigation"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      ) : null}

      {/* Main content */}
      <main ref={contentRef} className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-3xl space-y-16 px-6 py-12 lg:px-10 xl:px-16">

          {/* Introduction */}
          <section className="space-y-6">
            <SectionHeading id="introduction" title="Introduction" />
            <Prose>
              <p>
                Fyxvo is a Solana devnet control plane built for teams and individual developers
                who need more than a shared public RPC node. Instead of sending traffic to a
                best-effort endpoint with little visibility, Fyxvo gives each project a funded
                relay path, scoped API keys, request traces, and operational views in one place.
              </p>
              <p>
                The platform is currently in private alpha. Access is granted on a rolling basis
                to teams who have been invited. During this phase the product surface expands
                rapidly, and developer feedback directly shapes the roadmap. All breaking changes
                are announced in advance on the changelog and in the status feed.
              </p>
              <p>
                Authentication uses wallet signatures rather than email and password. When you
                connect a Solana wallet, the platform issues a signed challenge, your wallet signs
                it, and the resulting JWT is used to gate every subsequent API call. There is no
                password to lose and no email to verify. Your cryptographic identity is your
                session.
              </p>
              <p>
                Funding is on-chain. Each project holds a SOL balance that is decremented per
                request. Standard RPC calls cost 1,000 lamports. Priority relay calls cost 5,000
                lamports. This model means you see exactly what infrastructure costs in real SOL
                rather than opaque usage tiers, and you can top up at any time without waiting for
                a billing cycle to close.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Quickstart */}
          <section className="space-y-6">
            <SectionHeading id="quickstart" title="Quickstart" />
            <Prose>
              <p>
                Getting your first request through Fyxvo takes about five minutes. The steps
                below walk from a fresh account to a working RPC call. Each step builds on the
                previous one, so complete them in order.
              </p>
              <p>
                <strong className="font-semibold text-[var(--fyxvo-text)]">Step 1 — Connect your wallet.</strong>{" "}
                Open the dashboard and click "Connect wallet". Approve the connection request in
                your browser extension. Phantom, Backpack, and Solflare are all supported. Once
                connected the platform issues an auth challenge automatically.
              </p>
              <p>
                <strong className="font-semibold text-[var(--fyxvo-text)]">Step 2 — Create a project.</strong>{" "}
                In the dashboard, click "New project", give it a name, and optionally set a public
                slug. The slug is used for public project pages at{" "}
                <InlineCode>/p/your-slug</InlineCode>.
              </p>
              <p>
                <strong className="font-semibold text-[var(--fyxvo-text)]">Step 3 — Fund your project.</strong>{" "}
                Click "Add funds" in the project overview. The platform prepares an on-chain
                transaction that transfers SOL from your wallet to the project escrow. Sign the
                transaction in your wallet extension and wait for confirmation. Your project
                balance updates automatically once the transaction is confirmed.
              </p>
              <p>
                <strong className="font-semibold text-[var(--fyxvo-text)]">Step 4 — Create an API key.</strong>{" "}
                Navigate to the Keys tab of your project and click "New key". Choose the scopes
                that apply — at minimum you need <InlineCode>rpc:read</InlineCode> for standard
                calls or <InlineCode>rpc:relay</InlineCode> for the priority endpoint. Copy the
                key value immediately; it will not be shown again.
              </p>
              <p>
                <strong className="font-semibold text-[var(--fyxvo-text)]">Step 5 — Send your first request.</strong>{" "}
                Use the key in the <InlineCode>x-api-key</InlineCode> header. Here is a minimal
                health check using curl:
              </p>
            </Prose>
            <CodeBlock
              language="bash"
              code={`curl -X POST https://rpc.fyxvo.com/rpc \\
  -H "content-type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'`}
            />
            <Prose>
              <p>A successful response looks like this:</p>
            </Prose>
            <CodeBlock
              language="json"
              code={`{"jsonrpc":"2.0","id":1,"result":"ok"}`}
            />
          </section>

          <SectionDivider />

          {/* Framework quickstarts */}
          <section className="space-y-6">
            <SectionHeading id="framework-quickstarts" title="Framework Quickstarts" />
            <Prose>
              <p>
                The examples below show how to integrate Fyxvo in common environments. All of
                them use the same standard RPC endpoint and the <InlineCode>x-api-key</InlineCode>{" "}
                header. Store your key in an environment variable; never commit it to source
                control.
              </p>
            </Prose>
            <div className="overflow-hidden rounded-xl border border-[var(--fyxvo-border)]">
              <div className="flex overflow-x-auto border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
                {fwTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFwTab(tab.key)}
                    className={[
                      "shrink-0 px-4 py-3 text-sm font-medium transition-colors",
                      fwTab === tab.key
                        ? "border-b-2 border-[var(--fyxvo-brand)] text-[var(--fyxvo-brand)]"
                        : "text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <CodeBlock
                language={fwCode[fwTab].language}
                code={fwCode[fwTab].code}
              />
            </div>
          </section>

          <SectionDivider />

          {/* Authentication */}
          <section className="space-y-6">
            <SectionHeading id="authentication" title="Authentication" />
            <Prose>
              <p>
                Fyxvo uses a three-step wallet-based authentication flow. Because Solana wallets
                can sign arbitrary messages, the platform can verify your identity without ever
                storing a password. The result is a short-lived JWT that you attach to every API
                request as a Bearer token.
              </p>
              <p>
                <strong className="font-semibold text-[var(--fyxvo-text)]">Step 1 — Request a challenge.</strong>{" "}
                Send a POST request to <InlineCode>/v1/auth/challenge</InlineCode> with your wallet
                address. The server returns a nonce and a human-readable message that your wallet
                must sign.
              </p>
            </Prose>
            <CodeBlock
              language="bash"
              code={`curl -X POST ${webEnv.apiBaseUrl}/v1/auth/challenge \\
  -H "content-type: application/json" \\
  -d '{"walletAddress":"YOUR_WALLET_ADDRESS"}'

# Response
{
  "nonce": "9f3a\u2026c12",
  "message": "Sign this message to authenticate with Fyxvo.\\nNonce: 9f3a\u2026c12"
}`}
            />
            <Prose>
              <p>
                <strong className="font-semibold text-[var(--fyxvo-text)]">Step 2 — Sign the message.</strong>{" "}
                Using your Solana wallet library, sign the message bytes returned in the challenge
                response. The signature is a base58-encoded string. In a browser context you
                call{" "}
                <InlineCode>{"wallet.signMessage(new TextEncoder().encode(message))"}</InlineCode>.
              </p>
              <p>
                <strong className="font-semibold text-[var(--fyxvo-text)]">Step 3 — Verify the signature.</strong>{" "}
                Send the signature and wallet address to <InlineCode>/v1/auth/verify</InlineCode>.
                The server verifies the signature against the nonce and, if valid, returns a JWT.
              </p>
            </Prose>
            <CodeBlock
              language="bash"
              code={`curl -X POST ${webEnv.apiBaseUrl}/v1/auth/verify \\
  -H "content-type: application/json" \\
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "signature": "BASE58_SIGNATURE",
    "nonce": "9f3a\u2026c12"
  }'

# Response
{
  "token": "eyJhbGci\u2026",
  "expiresAt": "2026-04-03T12:00:00.000Z"
}`}
            />
            <Prose>
              <p>
                Store the JWT in <InlineCode>localStorage</InlineCode> or a secure cookie and
                attach it to every request using the{" "}
                <InlineCode>{"Authorization: Bearer <token>"}</InlineCode> header. Tokens are
                valid for seven days. When a token expires, restart the challenge flow to obtain
                a fresh one.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Funding */}
          <section className="space-y-6">
            <SectionHeading id="funding" title="Funding" />
            <Prose>
              <p>
                Every Fyxvo project has an on-chain SOL balance. Each request deducts lamports
                from that balance at the rate configured for the endpoint used. This model gives
                you complete visibility into infrastructure cost and eliminates monthly billing
                surprises.
              </p>
              <p>
                To add funds, first call{" "}
                <InlineCode>{"POST /v1/projects/{id}/funding/prepare"}</InlineCode> with the
                amount in lamports. The server constructs a Solana transaction that transfers SOL
                from your connected wallet to the project escrow account and returns it as a
                base64-encoded serialized transaction.
              </p>
            </Prose>
            <CodeBlock
              language="bash"
              code={`# Step 1 — Prepare funding transaction
curl -X POST ${webEnv.apiBaseUrl}/v1/projects/proj_abc123/funding/prepare \\
  -H "authorization: Bearer YOUR_JWT" \\
  -H "content-type: application/json" \\
  -d '{"lamports": 50000000}'

# Response
{
  "transaction": "BASE64_SERIALIZED_TRANSACTION",
  "escrowAddress": "5xfZ\u2026kQpL"
}`}
            />
            <Prose>
              <p>
                <strong className="font-semibold text-[var(--fyxvo-text)]">Sign the transaction.</strong>{" "}
                Deserialize the base64 transaction, have your wallet sign it, and re-serialize it.
                Then call{" "}
                <InlineCode>{"POST /v1/projects/{id}/funding/verify"}</InlineCode> with the signed
                transaction. The server broadcasts it to Solana devnet and waits for confirmation
                before updating the project balance.
              </p>
            </Prose>
            <CodeBlock
              language="bash"
              code={`# Step 2 — Submit signed transaction
curl -X POST ${webEnv.apiBaseUrl}/v1/projects/proj_abc123/funding/verify \\
  -H "authorization: Bearer YOUR_JWT" \\
  -H "content-type: application/json" \\
  -d '{"signedTransaction": "BASE64_SIGNED_TRANSACTION"}'

# Response
{
  "signature": "5vEk\u2026aMpL",
  "balanceLamports": 50000000,
  "status": "confirmed"
}`}
            />
            <Prose>
              <p>
                The dashboard shows a live balance widget on every project page. When the balance
                drops below the configured low-balance threshold, a webhook event is fired and an
                in-app notification is displayed. You can configure the threshold on the project
                settings page.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Standard RPC */}
          <section className="space-y-6">
            <SectionHeading id="standard-rpc" title="Standard RPC" />
            <Prose>
              <p>
                The standard RPC endpoint is{" "}
                <InlineCode>https://rpc.fyxvo.com/rpc</InlineCode>. It accepts standard Solana
                JSON-RPC 2.0 requests over HTTPS POST and supports the full method surface of a
                Solana validator node. Every successful request deducts 1,000 lamports from the
                calling project's balance.
              </p>
              <p>
                Authentication is via the <InlineCode>x-api-key</InlineCode> header using an API
                key with the <InlineCode>rpc:read</InlineCode> scope. The endpoint is fully
                compatible with libraries that accept a custom RPC URL, including{" "}
                <InlineCode>@solana/web3.js</InlineCode>, <InlineCode>solana-py</InlineCode>, and
                the Rust SDK. Because header-based key injection is non-standard for some library
                configurations, refer to the SDK Reference section for a helper that handles this
                transparently.
              </p>
            </Prose>
            <CodeBlock
              language="bash"
              code={`curl -X POST https://rpc.fyxvo.com/rpc \\
  -H "content-type: application/json" \\
  -H "x-api-key: fxk_your_key_here" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getBalance",
    "params": ["YOUR_WALLET_ADDRESS"]
  }'

# Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "context": { "slot": 348201984 },
    "value": 1500000000
  }
}`}
            />
          </section>

          <SectionDivider />

          {/* Priority Relay */}
          <section className="space-y-6">
            <SectionHeading id="priority-relay" title="Priority Relay" />
            <Prose>
              <p>
                The priority relay endpoint is{" "}
                <InlineCode>https://rpc.fyxvo.com/priority</InlineCode>. It is optimized for
                latency-sensitive operations, particularly transaction submission. Each call
                deducts 5,000 lamports rather than the standard 1,000.
              </p>
              <p>
                The priority relay maintains a dedicated routing window that keeps connections
                warm to the network's leader schedule. When submitting a{" "}
                <InlineCode>sendTransaction</InlineCode> call through this endpoint, the relay
                attempts to deliver the transaction to the current slot leader with minimal
                additional hops. This is especially valuable for time-sensitive operations like
                arbitrage, liquidations, and competitive NFT mints on devnet testing environments.
              </p>
              <p>
                Authentication for the priority relay requires an API key with the{" "}
                <InlineCode>rpc:relay</InlineCode> scope in addition to{" "}
                <InlineCode>rpc:read</InlineCode>. The request format is identical to the standard
                RPC endpoint; only the URL changes.
              </p>
            </Prose>
            <CodeBlock
              language="bash"
              code={`curl -X POST https://rpc.fyxvo.com/priority \\
  -H "content-type: application/json" \\
  -H "x-api-key: fxk_your_relay_key" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "sendTransaction",
    "params": ["BASE64_SIGNED_TX", { "encoding": "base64" }]
  }'`}
            />
          </section>

          <SectionDivider />

          {/* Analytics overview */}
          <section className="space-y-6">
            <SectionHeading id="analytics-overview" title="Analytics" />
            <Prose>
              <p>
                The analytics system records every request that passes through the relay layer and
                makes the aggregated data available in real time through the dashboard and the
                analytics API. You can observe total request counts, latency distribution, error
                rates by method, and balance consumption trends across any time window from the
                last hour to the last 30 days.
              </p>
              <p>
                In the dashboard, navigate to a project and click the Analytics tab. The overview
                panel shows total requests, average response time in milliseconds, the error rate
                as a percentage, and total lamports spent. Hover over any chart point to see the
                exact values for that interval.
              </p>
              <p>
                The latency breakdown panel splits response times into four buckets: under 100ms,
                100–250ms, 250–500ms, and over 500ms. This distribution helps you identify whether
                slowness is consistent (a configuration issue) or sporadic (network variance). The
                error rate panel breaks errors down by HTTP status code so you can distinguish
                balance errors (402) from authentication issues (401) and rate limits (429).
              </p>
              <p>
                Analytics data is updated in real time as requests arrive. The dashboard polls the
                analytics API on a short interval and merges new data points into the live charts
                without requiring a page refresh. For programmatic access to the same data, see
                the Analytics API section below.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Analytics API */}
          <section className="space-y-6">
            <SectionHeading id="analytics-api" title="Analytics API" />
            <Prose>
              <p>
                Two endpoints expose analytics data over the REST API. Both require a Bearer JWT
                in the <InlineCode>Authorization</InlineCode> header. The cross-project overview
                aggregates across all projects owned by the authenticated wallet. The per-project
                endpoint scopes results to a single project.
              </p>
            </Prose>
            <CodeBlock
              language="bash"
              code={`# Cross-project overview
GET ${webEnv.apiBaseUrl}/v1/analytics/overview
Authorization: Bearer YOUR_JWT

# Per-project analytics
GET ${webEnv.apiBaseUrl}/v1/projects/proj_abc123/analytics?window=24h
Authorization: Bearer YOUR_JWT`}
            />
            <Prose>
              <p>
                The <InlineCode>window</InlineCode> query parameter accepts{" "}
                <InlineCode>1h</InlineCode>, <InlineCode>6h</InlineCode>,{" "}
                <InlineCode>24h</InlineCode>, <InlineCode>7d</InlineCode>, and{" "}
                <InlineCode>30d</InlineCode>. Defaults to <InlineCode>24h</InlineCode> if omitted.
              </p>
            </Prose>
            <CodeBlock
              language="json"
              code={`// Example response from /v1/projects/:id/analytics
{
  "window": "24h",
  "totalRequests": 14821,
  "successRequests": 14710,
  "errorRequests": 111,
  "errorRate": 0.0075,
  "avgLatencyMs": 87,
  "p95LatencyMs": 210,
  "lamportsConsumed": 14821000,
  "series": [
    { "ts": "2026-03-26T12:00:00Z", "requests": 604, "errors": 4, "avgLatencyMs": 82 },
    { "ts": "2026-03-26T13:00:00Z", "requests": 617, "errors": 5, "avgLatencyMs": 91 }
  ]
}`}
            />
          </section>

          <SectionDivider />

          {/* Public Stats API */}
          <section className="space-y-6">
            <SectionHeading id="public-stats-api" title="Public Stats API" />
            <Prose>
              <p>
                The public stats API exposes read-only aggregate data for projects that have
                enabled public visibility. These endpoints require no authentication and are
                suitable for embedding in status pages, README badges, or third-party dashboards.
              </p>
            </Prose>
            <CodeBlock
              language="bash"
              code={`# List all public projects
GET ${webEnv.apiBaseUrl}/v1/public/projects

# Get stats for a specific public project by slug
GET ${webEnv.apiBaseUrl}/v1/public/projects/my-project-slug`}
            />
            <CodeBlock
              language="json"
              code={`// Response from /v1/public/projects/:slug
{
  "slug": "my-project-slug",
  "displayName": "My Project",
  "totalRequests": 98432,
  "uptimePercent": 99.97,
  "avgLatencyMs": 84,
  "lastUpdated": "2026-03-27T08:42:00Z",
  "badges": {
    "requests": "https://fyxvo.com/badge/my-project-slug/requests",
    "uptime": "https://fyxvo.com/badge/my-project-slug/uptime"
  }
}`}
            />
            <Prose>
              <p>
                Only projects where the owner has explicitly enabled public visibility appear in
                these responses. Private projects are never included in the public listing, and
                their slugs return a 404 from these endpoints. Owners can toggle public
                visibility from the project settings page at any time.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* API Explorer */}
          <section className="space-y-6">
            <SectionHeading id="api-explorer" title="API Explorer" />
            <Prose>
              <p>
                The API Explorer below lets you send authenticated requests to the Fyxvo REST API
                directly from this page. Paste your JWT, choose an endpoint from the dropdown,
                set the HTTP method, provide an optional request body, and click Send. The raw
                JSON response is displayed below the form. This is useful for understanding
                response shapes and testing queries before writing integration code.
              </p>
            </Prose>

            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--fyxvo-text-muted)]">
                    JWT token
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGci\u2026"
                    value={apiJwt}
                    onChange={(e) => setApiJwt(e.target.value)}
                    className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2 font-mono text-xs text-[var(--fyxvo-text)] placeholder-[var(--fyxvo-text-muted)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-[var(--fyxvo-text-muted)]">
                      Endpoint
                    </label>
                    <select
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2 font-mono text-xs text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                    >
                      <option value="/v1/analytics/overview">/v1/analytics/overview</option>
                      <option value="/v1/projects">/v1/projects</option>
                      <option value="/v1/status">/v1/status</option>
                      <option value="/health">/health</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--fyxvo-text-muted)]">
                      Method
                    </label>
                    <select
                      value={apiMethod}
                      onChange={(e) => setApiMethod(e.target.value)}
                      className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2 font-mono text-xs text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                </div>
                {apiMethod !== "GET" ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--fyxvo-text-muted)]">
                      Body (JSON)
                    </label>
                    <textarea
                      rows={4}
                      placeholder={`{\n  "key": "value"\n}`}
                      value={apiBody}
                      onChange={(e) => setApiBody(e.target.value)}
                      className="w-full resize-none rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2 font-mono text-xs text-[var(--fyxvo-text)] placeholder-[var(--fyxvo-text-muted)] outline-none focus:border-[var(--fyxvo-brand)]"
                    />
                  </div>
                ) : null}
              </div>
              <Button
                onClick={() => void sendApiRequest()}
                disabled={apiLoading || !apiJwt.trim()}
                size="sm"
              >
                {apiLoading ? "Sending\u2026" : "Send request"}
              </Button>
              {apiResponse !== null ? (
                <div className="relative overflow-hidden rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]">
                  <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-4 py-2">
                    <span className="font-mono text-xs text-[var(--fyxvo-text-muted)]">Response</span>
                    <CopyButton value={JSON.stringify(apiResponse, null, 2)} label="Copy" />
                  </div>
                  <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                    {JSON.stringify(apiResponse, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          </section>

          <SectionDivider />

          {/* Playground */}
          <section className="space-y-6">
            <SectionHeading id="playground-section" title="Playground" />
            <Prose>
              <p>
                The Playground is a dedicated live JSON-RPC builder where you can construct and
                send arbitrary Solana RPC method calls against your Fyxvo project. Unlike the API
                Explorer above, which targets the REST management API, the Playground routes
                requests through the actual relay layer using the RPC endpoint, so each call
                deducts balance just as a production request would.
              </p>
              <p>
                In the Playground you can choose from every supported Solana method, fill in the
                parameters using a structured form UI, inspect the raw request JSON before sending,
                and see the full response with timing information and the latency class (standard
                or priority). It is particularly useful for validating account addresses, checking
                transaction simulation output, and confirming that your API key scopes are
                configured correctly before integrating them into application code.
              </p>
              <p>
                Access the Playground at{" "}
                <Link
                  href="/playground"
                  className="font-medium text-[var(--fyxvo-brand)] hover:underline"
                >
                  /playground
                </Link>
                . You must have a connected wallet and at least one funded project with an active
                API key to use it.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* SDK Reference */}
          <section className="space-y-6">
            <SectionHeading id="sdk-reference" title="SDK Reference" />
            <Prose>
              <p>
                The <InlineCode>@fyxvo/sdk</InlineCode> package provides a typed TypeScript client
                for both the RPC relay and the REST management API. It handles header injection,
                retries on transient errors, and serialization of request and response types.
              </p>
            </Prose>
            <CodeBlock language="bash" code="npm install @fyxvo/sdk" />
            <Prose>
              <p>
                Construct a <InlineCode>FyxvoClient</InlineCode> with your base URL and API key.
                The client exposes <InlineCode>rpc()</InlineCode> for standard Solana JSON-RPC
                calls, <InlineCode>relay()</InlineCode> for priority relay, and{" "}
                <InlineCode>request()</InlineCode> for the management REST API using your JWT.
              </p>
            </Prose>
            <CodeBlock
              language="typescript"
              code={`import { FyxvoClient } from "@fyxvo/sdk";

const client = new FyxvoClient({
  baseUrl: "https://rpc.fyxvo.com",
  apiKey: "fxk_your_key_here"
});

// Standard RPC call
const health = await client.rpc("getHealth", []);
console.log(health.result); // "ok"

// Get account balance
const balance = await client.rpc("getBalance", ["YOUR_WALLET_ADDRESS"]);
console.log(balance.result.value); // lamports

// Priority relay transaction submission
const sig = await client.relay("sendTransaction", [base64Tx, { encoding: "base64" }]);

// Management API call (requires JWT)
const clientWithJwt = new FyxvoClient({
  baseUrl: "${webEnv.apiBaseUrl}",
  jwt: "eyJhbGci\u2026"
});
const projects = await clientWithJwt.request("GET", "/v1/projects");`}
            />
            <Prose>
              <p>
                The <InlineCode>FyxvoClient</InlineCode> constructor accepts an optional{" "}
                <InlineCode>retries</InlineCode> number (defaults to 2),{" "}
                <InlineCode>timeout</InlineCode> in milliseconds (defaults to 10,000), and a
                custom <InlineCode>fetch</InlineCode> implementation for environments where the
                global fetch is not available. All methods return typed promises and throw typed{" "}
                <InlineCode>FyxvoError</InlineCode> instances on failure, which carry the HTTP
                status code, the error message, and the machine-readable error code.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Operations Guide */}
          <section className="space-y-6">
            <SectionHeading id="operations-guide" title="Operations Guide" />
            <Prose>
              <p>
                Running a Fyxvo project in a continuous integration or staging environment
                requires attention to three operational concerns: monitoring the request flow,
                maintaining an adequate balance, and responding to alerts before the project
                halts.
              </p>
              <p>
                Monitoring is done through the analytics dashboard. For automated monitoring, poll
                the per-project analytics API on a schedule and compare the error rate and latency
                against your acceptable thresholds. If either metric crosses your threshold,
                trigger your internal alerting (PagerDuty, Slack webhook, email) using your own
                pipeline.
              </p>
              <p>
                Balance management is the most common operational issue. The platform fires a
                webhook and an in-app notification when the balance drops below the configured
                low-balance threshold. The default threshold is 5,000,000 lamports (0.005 SOL).
                You can raise or lower this on the project settings page. For CI environments
                running overnight test suites, set the threshold high enough that you have time
                to respond before the project goes dry. A depleted project returns HTTP 402 on
                every request until funded.
              </p>
              <p>
                The full request lifecycle for a standard RPC call is: API key validation, scope
                check, balance debit reservation, upstream RPC dispatch, response returned to
                caller, balance debit confirmed. If the upstream errors out, the balance debit is
                rolled back and no lamports are consumed. If the connection times out, the
                reservation is held briefly and then released. You will not be charged for
                requests that do not reach the upstream successfully.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Release Guide */}
          <section className="space-y-6">
            <SectionHeading id="release-guide" title="Release Guide" />
            <Prose>
              <p>
                Fyxvo follows a staged release process. Changes are deployed to a canary
                environment first, where they serve a small percentage of traffic for 24–48 hours
                before full rollout. This allows regressions to be caught and rolled back before
                they affect all users.
              </p>
              <p>
                Breaking API changes are never introduced without prior notice. The current API
                surface is versioned under <InlineCode>/v1/</InlineCode>. When a breaking change
                is necessary, it will be introduced under <InlineCode>/v2/</InlineCode> and the
                v1 surface will be maintained for a minimum of 60 days with deprecation notices
                included in response headers.
              </p>
              <p>
                All releases are documented in the{" "}
                <Link href="/changelog" className="font-medium text-[var(--fyxvo-brand)] hover:underline">
                  Changelog
                </Link>
                . Each entry includes a date, a list of additions, changes, and fixes, and a
                severity indicator: patch for backwards-compatible fixes, minor for new features,
                and major for breaking changes. Subscribe to the Fyxvo Discord or Telegram channel
                to receive notifications when new releases are published.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* CI/CD Integration */}
          <section className="space-y-6">
            <SectionHeading id="cicd-integration" title="CI/CD Integration" />
            <Prose>
              <p>
                Fyxvo integrates cleanly into automated pipelines. The only requirement is that
                your runner has access to the <InlineCode>FYXVO_API_KEY</InlineCode> environment
                variable. Store it as a repository secret in your CI provider rather than in any
                committed file.
              </p>
              <p>
                The SDK reads <InlineCode>FYXVO_API_KEY</InlineCode> from the environment
                automatically when no <InlineCode>apiKey</InlineCode> is passed to the
                constructor. This makes it easy to use the same test code locally (where the key
                is in your shell environment) and in CI (where it is injected as a secret) without
                any code changes.
              </p>
            </Prose>
            <CodeBlock
              language="yaml"
              code={`# .github/workflows/test.yml
name: Integration tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        env:
          FYXVO_API_KEY: \${{ secrets.FYXVO_API_KEY }}
        run: npm test`}
            />
            <Prose>
              <p>
                If your test suite makes a large number of requests, consider using simulation
                mode (see Simulation Mode) in CI to avoid consuming balance on every test run.
                Simulation mode returns realistic responses without charging lamports, making it
                ideal for testing the shape of responses rather than the live state of the network.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Migration Guide */}
          <section className="space-y-6">
            <SectionHeading id="migration-guide" title="Migration Guide" />
            <Prose>
              <p>
                Migrating from a shared public devnet RPC to Fyxvo requires two changes: updating
                the endpoint URL and adding the <InlineCode>x-api-key</InlineCode> header. No
                other application code needs to change. Fyxvo is a drop-in replacement that
                speaks standard Solana JSON-RPC.
              </p>
            </Prose>
            <CodeBlock
              language="diff"
              code={`// Before — public devnet RPC
- const connection = new Connection("https://api.devnet.solana.com");

// After — Fyxvo
+ const connection = new Connection("https://rpc.fyxvo.com/rpc", {
+   httpHeaders: { "x-api-key": process.env.FYXVO_API_KEY }
+ });`}
            />
            <Prose>
              <p>
                Before switching traffic, ensure your project is funded. An unfunded project
                returns HTTP 402 on every request, which will manifest as a connection error in
                most Solana libraries. Fund the project via the dashboard or the funding API,
                then swap the endpoint URL in your configuration.
              </p>
              <p>
                After migrating, verify your setup by checking the analytics dashboard for the
                first few minutes of traffic. You should see request counts climbing and the error
                rate near zero. If you see a spike in 401 errors, check that the API key is set
                correctly and has the <InlineCode>rpc:read</InlineCode> scope. If you see 402
                errors, the balance has run out and the project needs funding.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Rate Limits */}
          <section className="space-y-6">
            <SectionHeading id="rate-limits" title="Rate Limits" />
            <Prose>
              <p>
                Rate limits are enforced per API key. The default limit for standard RPC keys is
                100 requests per second with a burst allowance of 200 requests per second for up
                to two seconds. Priority relay keys have a default limit of 50 requests per
                second with a burst of 100.
              </p>
              <p>
                Limits are configurable at the project level for keys within that project.
                Navigate to the project settings, select a key, and adjust the rate limit slider.
                Increases above the default maximums are available on request; contact the Fyxvo
                team via Discord or the contact form with your use case and the request volume you
                need.
              </p>
              <p>
                When a key exceeds its rate limit, the relay returns HTTP 429 with a{" "}
                <InlineCode>Retry-After</InlineCode> header indicating the number of seconds until
                the next request will be accepted. Balance is not consumed for rate-limited
                requests. The SDK handles 429 responses automatically with an exponential backoff
                strategy when <InlineCode>retries</InlineCode> is greater than zero.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Simulation Mode */}
          <section className="space-y-6">
            <SectionHeading id="simulation-mode" title="Simulation Mode" />
            <Prose>
              <p>
                Append <InlineCode>?simulate=true</InlineCode> to any request to enter simulation
                mode. In simulation mode the request is processed through the relay layer and a
                real response is returned from the upstream node, but the lamport balance is not
                decremented. This is useful for testing your integration without cost.
              </p>
            </Prose>
            <CodeBlock
              language="bash"
              code={`curl -X POST "https://rpc.fyxvo.com/rpc?simulate=true" \\
  -H "content-type: application/json" \\
  -H "x-api-key: fxk_your_key_here" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# The response is identical to a real request but no lamports are consumed.
# A Fyxvo-Simulate: true header is added to the response for confirmation.`}
            />
            <Prose>
              <p>
                Simulation mode is particularly valuable in CI pipelines where you want to verify
                that requests are correctly formed and that the API key is valid without burning
                through the project balance on every test run. It is also useful during local
                development when you are iterating on request parameters and want to see the
                response shape before committing to a live call.
              </p>
              <p>
                Note that simulation mode does not bypass authentication or scope checks. The
                request must still carry a valid API key with the appropriate scope. An invalid
                key in simulation mode returns the same 401 error as it would without the
                simulate flag.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* API Versioning */}
          <section className="space-y-6">
            <SectionHeading id="api-versioning" title="API Versioning" />
            <Prose>
              <p>
                All Fyxvo REST API endpoints use a <InlineCode>/v1/</InlineCode> prefix. The RPC
                relay endpoints at <InlineCode>/rpc</InlineCode> and{" "}
                <InlineCode>/priority</InlineCode> are not versioned because they follow the
                upstream Solana JSON-RPC specification.
              </p>
              <p>
                Backward-compatible additions — new fields in responses, new optional query
                parameters, new endpoints — are deployed to the current version without a version
                bump. If your client ignores unknown fields in JSON responses, as all well-written
                clients should, these additions will not break your integration.
              </p>
              <p>
                Breaking changes — removed fields, changed field types, changed authentication
                requirements, changed error shapes — require a new major version. Breaking changes
                are introduced at <InlineCode>/v2/</InlineCode> while the old version remains
                active. The old version is supported for at least 60 days after the new version
                launches, with <InlineCode>Deprecation</InlineCode> and{" "}
                <InlineCode>Sunset</InlineCode> headers added to all responses from the deprecated
                version.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Error Reference */}
          <section className="space-y-6">
            <SectionHeading id="error-reference" title="Error Reference" />
            <Prose>
              <p>
                Fyxvo uses standard HTTP status codes with JSON error bodies. Every error response
                has a consistent shape regardless of which endpoint produced it, making it
                straightforward to handle errors generically at the client level.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">401 Unauthenticated.</strong>
                The request did not include a valid credential. For the RPC relay, this means the{" "}
                <InlineCode>x-api-key</InlineCode> header is missing or the key does not exist.
                For the REST API, the Bearer token is missing, malformed, or expired.
                Re-authenticate to obtain a fresh token.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">402 Payment required.</strong>
                The project's SOL balance is insufficient to cover the cost of the request. Fund
                the project via the dashboard or the funding API to resume service.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">403 Forbidden.</strong>
                The credential is valid but lacks the required scope for the requested operation.
                For example, trying to use a key with only <InlineCode>rpc:read</InlineCode> on
                the priority relay endpoint will return 403. Update the key's scopes in the
                dashboard.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">404 Not found.</strong>
                The requested resource does not exist. Check the path, project ID, or key ID in
                your request.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">429 Too many requests.</strong>
                The API key has exceeded its per-second rate limit. Check the{" "}
                <InlineCode>Retry-After</InlineCode> header for the number of seconds to wait. No
                balance is consumed for rate-limited requests.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">500 Internal error.</strong>
                An unexpected error occurred on the Fyxvo infrastructure. These are rare. Check
                the status page and contact support if the error persists.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Error Codes */}
          <section className="space-y-6">
            <SectionHeading id="error-codes" title="Error Codes" />
            <Prose>
              <p>
                Every error response from the REST API includes a machine-readable{" "}
                <InlineCode>code</InlineCode> field alongside the human-readable{" "}
                <InlineCode>error</InlineCode> message. Use the code to drive programmatic error
                handling rather than parsing message strings, which may change between releases.
              </p>
            </Prose>
            <CodeBlock
              language="json"
              code={`{
  "error": "Insufficient project balance to complete this request.",
  "code": "INSUFFICIENT_BALANCE"
}`}
            />
            <Prose>
              <p>
                Common error codes you will encounter are{" "}
                <InlineCode>MISSING_API_KEY</InlineCode> when the{" "}
                <InlineCode>x-api-key</InlineCode> header is absent,{" "}
                <InlineCode>INVALID_API_KEY</InlineCode> when the key does not match any active
                key, <InlineCode>SCOPE_DENIED</InlineCode> when the key lacks the required scope,{" "}
                <InlineCode>INSUFFICIENT_BALANCE</InlineCode> when the project balance is too low,{" "}
                <InlineCode>RATE_LIMITED</InlineCode> when requests are arriving too fast,{" "}
                <InlineCode>TOKEN_EXPIRED</InlineCode> when a JWT has passed its expiry,{" "}
                <InlineCode>PROJECT_NOT_FOUND</InlineCode> when a project ID does not exist or the
                caller does not have access to it, and{" "}
                <InlineCode>UPSTREAM_ERROR</InlineCode> when the Solana node returned an
                unexpected error that Fyxvo could not classify.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* FAQ */}
          <section className="space-y-6">
            <SectionHeading id="faq" title="FAQ" />
            <Prose>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">
                  Is Fyxvo available for mainnet?
                </strong>
                Fyxvo currently operates exclusively on Solana devnet. Mainnet support is on the
                roadmap but there is no confirmed date. During the private alpha phase the focus
                is on hardening the devnet control plane and collecting developer feedback.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">
                  How do I get access?
                </strong>
                Access is by invitation during the private alpha. Join the Fyxvo Discord or
                follow{" "}
                <Link href="https://x.com/fyxvo" className="text-[var(--fyxvo-brand)] hover:underline">
                  @fyxvo on X
                </Link>{" "}
                to hear when open registration becomes available.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">
                  What happens when my project runs out of balance?
                </strong>
                When the balance reaches zero, every subsequent request returns HTTP 402. Requests
                are not queued or retried — they fail immediately. Top up the project balance via
                the dashboard or the funding API to resume service. The analytics API remains
                accessible at zero balance so you can investigate how the balance was consumed.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">
                  Can I use Fyxvo with @solana/web3.js?
                </strong>
                Yes. Pass your Fyxvo RPC URL and set the <InlineCode>httpHeaders</InlineCode>{" "}
                option to include your API key. The <InlineCode>Connection</InlineCode> class
                accepts this option in <InlineCode>@solana/web3.js</InlineCode> v1 as the second
                argument to the constructor. See the Migration Guide for a one-line example.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">
                  How is on-chain funding different from a credit card payment?
                </strong>
                On-chain funding means no payment processor, no card details, no chargebacks, and
                no monthly invoices. You transfer SOL directly from your wallet. The transfer is
                visible on-chain, auditable at any time, and does not require trusting Fyxvo with
                financial credentials. The cost per request is fixed in lamports and does not
                change based on time of day or demand.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">
                  How many projects can I create?
                </strong>
                During the private alpha there is a soft limit of 10 projects per wallet. If you
                need more, reach out via Discord and the team can raise your limit manually.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">
                  Is there a free tier?
                </strong>
                There is no free tier during the private alpha. All requests consume lamports from
                the project balance. Devnet SOL is available for free via the Solana airdrop
                faucet, so the effective cost is the time it takes to request an airdrop rather
                than real money.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">
                  Where is data stored?
                </strong>
                Analytics data and project metadata are stored off-chain in a managed database.
                The balance escrow lives on-chain in a program-derived account controlled by the
                Fyxvo program. Request logs are retained for 30 days and then pruned.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* RPC Reference */}
          <section className="space-y-6">
            <SectionHeading id="rpc-reference" title="RPC Reference" />
            <Prose>
              <p>
                The table below lists all Solana JSON-RPC methods supported by the Fyxvo relay,
                the endpoint they route through, and a brief description of what each method
                returns. Methods marked <InlineCode>/priority</InlineCode> are available on the
                priority relay as well as the standard endpoint.
              </p>
            </Prose>
            <div className="overflow-hidden rounded-xl border border-[var(--fyxvo-border)]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
                      <th className="px-4 py-3 text-left font-medium text-[var(--fyxvo-text-muted)]">
                        Method
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--fyxvo-text-muted)]">
                        Endpoint
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--fyxvo-text-muted)]">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--fyxvo-border)]">
                    {rpcMethods.map((m) => (
                      <tr
                        key={m.method}
                        className="bg-[var(--fyxvo-panel)] transition-colors hover:bg-[var(--fyxvo-panel-soft)]"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-[var(--fyxvo-brand)]">
                          {m.method}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--fyxvo-text-muted)]">
                          {m.endpoint}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[var(--fyxvo-text-soft)]">
                          {m.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <SectionDivider />

          {/* Webhooks */}
          <section className="space-y-6">
            <SectionHeading id="webhooks" title="Webhooks" />
            <Prose>
              <p>
                Fyxvo can deliver real-time event notifications to an HTTP endpoint you control.
                Create a webhook by sending a POST request to <InlineCode>/v1/webhooks</InlineCode>{" "}
                with a target URL and the list of event types you want to receive. Fyxvo will
                deliver a signed POST request to your endpoint for each matching event.
              </p>
            </Prose>
            <CodeBlock
              language="bash"
              code={`curl -X POST ${webEnv.apiBaseUrl}/v1/webhooks \\
  -H "authorization: Bearer YOUR_JWT" \\
  -H "content-type: application/json" \\
  -d '{
    "url": "https://your-server.example.com/webhook",
    "events": ["request.completed", "balance.low", "key.created", "key.revoked"],
    "projectId": "proj_abc123"
  }'`}
            />
            <Prose>
              <p>
                Each delivery includes a <InlineCode>Fyxvo-Signature</InlineCode> header
                containing an HMAC-SHA256 signature of the request body, signed with the webhook
                secret shown when you create the webhook. Always verify this signature before
                processing the payload.
              </p>
            </Prose>
            <CodeBlock
              language="json"
              code={`// Example webhook payload for balance.low event
{
  "id": "evt_01j9kxmZq4VfRtUwPbCnLsYe",
  "event": "balance.low",
  "timestamp": "2026-03-27T10:15:00.000Z",
  "projectId": "proj_abc123",
  "data": {
    "balanceLamports": 4200000,
    "thresholdLamports": 5000000,
    "warningPercent": 84
  }
}`}
            />
            <Prose>
              <p>
                Fyxvo retries failed webhook deliveries with exponential backoff, up to five
                attempts over approximately one hour. A delivery is considered failed if your
                endpoint returns a non-2xx status code or does not respond within ten seconds.
                You can view delivery history and manually re-trigger failed deliveries from the
                webhook settings page in the dashboard.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Team Collaboration */}
          <section className="space-y-6">
            <SectionHeading id="team-collaboration" title="Team Collaboration" />
            <Prose>
              <p>
                Multiple wallets can collaborate on a single project. Each member has a role that
                determines what actions they can perform. Roles are OWNER, ADMIN, MEMBER, and
                VIEWER. The OWNER is the wallet that created the project and is the only role that
                can delete the project or transfer ownership.
              </p>
              <p>
                ADMIN members can invite other members, revoke membership, create and revoke API
                keys, add funding, and modify project settings. MEMBER access covers creating API
                keys and viewing analytics. VIEWER access is read-only: analytics and request
                logs are visible but no changes can be made.
              </p>
              <p>
                Invite a member by their Solana wallet address using the REST API or the team
                settings tab in the dashboard.
              </p>
            </Prose>
            <CodeBlock
              language="bash"
              code={`curl -X POST ${webEnv.apiBaseUrl}/v1/projects/proj_abc123/members \\
  -H "authorization: Bearer YOUR_JWT" \\
  -H "content-type: application/json" \\
  -d '{
    "walletAddress": "INVITE_WALLET_ADDRESS",
    "role": "MEMBER"
  }'`}
            />
            <Prose>
              <p>
                The invited wallet will see the project in their dashboard on their next login.
                There is no email confirmation step because identity is tied to the wallet address,
                not an email account. To remove a member, call{" "}
                <InlineCode>{"DELETE /v1/projects/{id}/members/{walletAddress}"}</InlineCode>.
                Members can also remove themselves at any time.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Public Project Pages */}
          <section className="space-y-6">
            <SectionHeading id="public-project-pages" title="Public Project Pages" />
            <Prose>
              <p>
                When public visibility is enabled for a project, it gets a shareable page at{" "}
                <InlineCode>/p/your-slug</InlineCode>. This page shows aggregate stats — total
                requests, uptime percentage, and average latency — without revealing the project's
                API keys or balance details. It is designed to be embedded in project READMEs,
                documentation sites, or grant proposals to demonstrate real infrastructure usage.
              </p>
              <p>
                Enable public visibility from the project settings page. You can set or change the
                slug at any time; the old slug will redirect to the new one for 24 hours after
                the change. The slug must be globally unique across all Fyxvo projects.
              </p>
              <p>
                Each public project page generates badge images that you can embed in a README.
                Copy the badge markdown from the project page:
              </p>
            </Prose>
            <CodeBlock
              language="markdown"
              code={`[![Fyxvo requests](https://fyxvo.com/badge/my-project/requests)](https://fyxvo.com/p/my-project)
[![Fyxvo uptime](https://fyxvo.com/badge/my-project/uptime)](https://fyxvo.com/p/my-project)`}
            />
            <Prose>
              <p>
                Badge images are generated dynamically on every request and cached for 60 seconds.
                They follow the shields.io format and are compatible with any Markdown renderer.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Changelog */}
          <section className="space-y-6">
            <SectionHeading id="changelog-section" title="Changelog" />
            <Prose>
              <p>
                The Fyxvo changelog is published at{" "}
                <Link href="/changelog" className="font-medium text-[var(--fyxvo-brand)] hover:underline">
                  /changelog
                </Link>{" "}
                and updated with every release. Each entry includes a date, a severity level
                (patch, minor, or major), and a detailed description of what changed and why.
              </p>
              <p>
                The changelog is the authoritative source of truth for what has changed in the
                platform. Release notes are written for developers, not marketing: they describe
                the actual API surface changes, breaking changes with migration paths, and known
                issues that are scheduled to be resolved in a future release. Subscribe to the
                Fyxvo Discord or Telegram channel to receive notifications when new entries are
                published.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Network Status */}
          <section className="space-y-6">
            <SectionHeading id="network-status-section" title="Network Status" />
            <Prose>
              <p>
                The Fyxvo status page at{" "}
                <Link href="/status" className="font-medium text-[var(--fyxvo-brand)] hover:underline">
                  /status
                </Link>{" "}
                shows live health indicators for all components of the platform: the RPC relay,
                the priority relay, the REST API, the analytics pipeline, and the authentication
                service. Each component displays its current state (operational, degraded, or
                outage) and the latency of the last health check.
              </p>
              <p>
                The status page also shows the last 90 days of uptime for each component as a
                timeline of bars. Hovering over a bar shows the date, the percentage of the day
                the component was operational, and links to any incident reports that were filed
                for that day.
              </p>
              <p>
                To receive status notifications without polling the page, subscribe via the
                Discord status channel or the Telegram bot. Both channels receive automated
                notifications within 60 seconds of a status change and again when the incident
                is resolved.
              </p>
            </Prose>
          </section>

          <SectionDivider />

          {/* Status API */}
          <section className="space-y-6">
            <SectionHeading id="status-api" title="Status API" />
            <Prose>
              <p>
                The status API exposes machine-readable health data for all platform components.
                All endpoints in this group require no authentication and are rate-limited only
                by IP. They are designed for integration into external monitoring tools.
              </p>
            </Prose>
            <CodeBlock
              language="bash"
              code={`# Simple health check — returns 200 if the API is up
GET ${webEnv.apiBaseUrl}/health

# Full component status
GET ${webEnv.apiBaseUrl}/v1/status

# Active and resolved incidents
GET ${webEnv.apiBaseUrl}/v1/incidents`}
            />
            <CodeBlock
              language="json"
              code={`// /v1/status response shape
{
  "page": { "updatedAt": "2026-03-27T08:42:00Z" },
  "components": [
    { "name": "RPC Relay", "status": "operational", "latencyMs": 45 },
    { "name": "Priority Relay", "status": "operational", "latencyMs": 38 },
    { "name": "REST API", "status": "operational", "latencyMs": 22 },
    { "name": "Analytics", "status": "operational", "latencyMs": 67 },
    { "name": "Auth Service", "status": "operational", "latencyMs": 18 }
  ],
  "overallStatus": "operational"
}

// /v1/incidents response shape
{
  "incidents": [
    {
      "id": "inc_01j9k",
      "title": "Elevated relay latency",
      "status": "resolved",
      "createdAt": "2026-03-20T14:00:00Z",
      "resolvedAt": "2026-03-20T15:42:00Z",
      "components": ["RPC Relay"]
    }
  ]
}`}
            />
          </section>

          <SectionDivider />

          {/* Troubleshooting */}
          <section className="space-y-6">
            <SectionHeading id="troubleshooting" title="Troubleshooting" />
            <Prose>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">
                  Wallet connection fails.
                </strong>
                Check that your browser wallet extension (Phantom, Backpack, or Solflare) is
                installed, unlocked, and connected to Solana devnet. Some extensions block
                connection requests from localhost; try adding an exception or testing on a
                deployed environment. If the extension appears stuck, reload the extension from
                your browser's extension manager.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">
                  Auth challenge fails with a network error.
                </strong>
                The challenge endpoint at <InlineCode>/v1/auth/challenge</InlineCode> requires a
                network request to the Fyxvo API. Check that the{" "}
                <InlineCode>NEXT_PUBLIC_API_BASE_URL</InlineCode> environment variable is set
                correctly. Verify that the API server is reachable by navigating to{" "}
                <InlineCode>/health</InlineCode> in your browser.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">
                  Requests return 401.
                </strong>
                A 401 from the RPC relay means the <InlineCode>x-api-key</InlineCode> header is
                missing or the key is invalid. Verify you are sending the header and that the key
                value has not been accidentally truncated. A 401 from the REST API means your JWT
                has expired or is malformed — re-authenticate to get a fresh token.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">
                  Requests return 402.
                </strong>
                The project balance is empty. Navigate to the project dashboard and add funds via
                the "Add funds" button, or use the{" "}
                <InlineCode>{"POST /v1/projects/{id}/funding/prepare"}</InlineCode> endpoint.
                Check the analytics page to see how quickly balance was consumed and adjust your
                low-balance alert threshold accordingly.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">
                  Requests return 403.
                </strong>
                Your API key lacks the required scope. Open the key settings in the dashboard and
                check which scopes are enabled. <InlineCode>rpc:read</InlineCode> is required for
                the standard RPC endpoint and <InlineCode>rpc:relay</InlineCode> is additionally
                required for the priority relay.
              </p>
              <p>
                <strong className="block font-semibold text-[var(--fyxvo-text)]">
                  Analytics show no data.
                </strong>
                Analytics data appears after the first request passes through the relay. If you
                have sent requests but the dashboard shows nothing, check that the requests are
                reaching the right project (verify the API key belongs to the project you are
                looking at) and that sufficient time has passed for the analytics pipeline to
                process the events — typically under five seconds.
              </p>
            </Prose>
          </section>

          <div className="pb-16" />
        </div>
      </main>
    </div>
  );
}
