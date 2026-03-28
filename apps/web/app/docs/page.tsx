import Link from "next/link";
import { Button } from "@fyxvo/ui";
import { CopyButton } from "../../components/copy-button";
import { DocsApiExplorer } from "../../components/docs-api-explorer";
import { AddressLink } from "../../components/address-link";
import { protocolAddresses, requestPricingTiers } from "../../lib/public-data";

const USDC_PRICING_DETAILS = [
  "100 USDC base units, or 0.0001 USDC, per request.",
  "300 USDC base units, or 0.0003 USDC, per request.",
  "500 USDC base units, or 0.0005 USDC, per request.",
] as const;

const DOC_SECTIONS = [
  { id: "network-architecture", label: "Network architecture" },
  { id: "operator-network", label: "Operator network" },
  { id: "decentralization-roadmap", label: "Decentralization roadmap" },
  { id: "wallet-authentication", label: "Wallet authentication" },
  { id: "project-activation-and-funding", label: "Project activation and funding" },
  { id: "gateway-usage", label: "Gateway usage" },
  { id: "api-explorer", label: "API explorer" },
  { id: "public-project-pages", label: "Public project pages" },
  { id: "public-pricing-contract", label: "Public pricing contract" },
  { id: "rate-limits", label: "Rate limits" },
  { id: "sdk", label: "SDK" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "public-endpoints", label: "Public endpoints" },
] as const;

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]">
      <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-4 py-2">
        <span className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
          Example
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="w-full overflow-x-auto p-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const authChallengeExample = `POST https://api.fyxvo.com/v1/auth/challenge
{
  "walletAddress": "BASE58_SOLANA_WALLET"
}

Response:
{
  "walletAddress": "BASE58_SOLANA_WALLET",
  "nonce": "UUID",
  "message": "Fyxvo Authentication\\nWallet: BASE58_SOLANA_WALLET\\nNonce: UUID\\nBy signing this message you prove wallet ownership and start a JWT-backed session.\\nNo private keys are ever transmitted to or stored by Fyxvo."
}`;

const authVerifyExample = `POST https://api.fyxvo.com/v1/auth/verify
{
  "walletAddress": "BASE58_SOLANA_WALLET",
  "message": "exact challenge message",
  "signature": "BASE58_SIGNATURE"
}

Response:
{
  "token": "JWT",
  "user": {
    "id": "uuid",
    "walletAddress": "BASE58_SOLANA_WALLET"
  }
}`;

const fundingFlowExample = `POST https://api.fyxvo.com/v1/projects/:projectId/funding/prepare
Authorization: Bearer JWT
{
  "asset": "USDC",
  "amount": "2500000",
  "funderWalletAddress": "BASE58_SOLANA_WALLET"
}

Response:
{
  "item": {
    "fundingRequestId": "uuid",
    "transactionBase64": "base64-v0-transaction",
    "recentBlockhash": "base58",
    "lastValidBlockHeight": 123,
    "asset": "USDC",
    "amount": "2500000"
  }
}`;

const gatewayExample = `curl https://rpc.fyxvo.com/rpc \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: fyxvo_live_YOUR_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth","params":[]}';

curl https://rpc.fyxvo.com/priority \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: fyxvo_live_YOUR_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"sendTransaction","params":["BASE64_TX"]}'`;

const sdkExample = `import { createFyxvoClient } from "@fyxvo/sdk";

const client = createFyxvoClient({
  baseUrl: "https://rpc.fyxvo.com",
  apiKey: "fyxvo_live_YOUR_KEY",
});

const health = await client.rpc({
  jsonrpc: "2.0",
  id: 1,
  method: "getHealth",
  params: [],
});

const priority = await client.priorityRpc({
  jsonrpc: "2.0",
  id: 2,
  method: "sendTransaction",
  params: ["BASE64_TX"],
});`;

export default function DocsPage() {
  return (
    <div>
      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            Documentation
          </p>
          <h1 className="mt-3 max-w-4xl text-5xl font-bold tracking-tight text-[var(--fyxvo-text)] sm:text-6xl">
            Build against the real Fyxvo flow
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--fyxvo-text-soft)]">
            Fyxvo is building decentralized Solana RPC and relay infrastructure. The live devnet
            product still runs on managed infrastructure today, with wallet authentication,
            on-chain project activation, funded relay usage, scoped API keys, analytics, alerts,
            and public trust surfaces already operating.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard">Open workspace</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-5">
          {[
            "Connect a wallet and sign the auth challenge.",
            "Create a project and sign the activation transaction.",
            "Prepare and verify SOL funding for the treasury.",
            "Issue an API key with the scopes you need.",
            "Route traffic through /rpc or /priority and monitor it from the workspace.",
          ].map((item, index) => (
            <div
              key={item}
              className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="network-architecture" className="scroll-mt-24 border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Network Architecture
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
            Fyxvo is built as four cooperating layers. The on-chain Anchor program manages project
            accounts, treasury state, and operator-registry state. The API control plane handles
            wallet authentication, project management, funding, API keys, analytics, and alerts.
            The relay gateway prices and routes JSON-RPC traffic through the node pool. The worker
            handles async tasks such as billing rollups, notifications, digests, and background
            operational jobs.
          </p>
          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {[
              {
                title: "On-chain protocol",
                body: "Anchor program for project accounts, treasury state, and operator registry on Solana devnet.",
              },
              {
                title: "API control plane",
                body: "Wallet auth, projects, funding, analytics, alerts, assistant workflows, and admin operations.",
              },
              {
                title: "Relay gateway",
                body: "Scoped API key enforcement, request pricing, balance checks, upstream routing, and request logging.",
              },
              {
                title: "Worker",
                body: "Async billing rollups, notifications, digests, indexing, and background reliability tasks.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5"
              >
                <h3 className="text-lg font-semibold text-[var(--fyxvo-text)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="operator-network" className="scroll-mt-24 border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Operator Network
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-soft)]">
            The live network still runs on managed infrastructure today. The protocol already
            exposes an operator registry on devnet, but the current production path does not yet
            onboard third-party operators directly into the live relay. That is the transition
            Fyxvo is preparing for next.
          </p>
          <p className="mt-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            As that operator phase opens up, the intended fee split routes 80 percent of request
            fees to node operators, 10 percent to the protocol treasury, and 10 percent to the
            infrastructure fund. Operators will register through onboarding flows that connect
            infrastructure identity, performance visibility, and on-chain protocol state.
          </p>
        </div>
      </section>

      <section id="decentralization-roadmap" className="scroll-mt-24 border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Decentralization Roadmap
          </h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {[
              {
                title: "Phase one",
                body: "Managed devnet infrastructure proves the funded relay model, control plane, and on-chain project lifecycle with real users.",
              },
              {
                title: "Phase two",
                body: "External operator onboarding expands the node pool beyond the team-managed setup and introduces operator-facing workflows.",
              },
              {
                title: "Phase three",
                body: "A governed open network moves authority and routing participation closer to the protocol and away from one managed signer model.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5"
              >
                <h3 className="text-lg font-semibold text-[var(--fyxvo-text)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <details className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4 lg:hidden">
            <summary className="cursor-pointer list-none text-sm font-medium text-[var(--fyxvo-text)]">
              Toggle documentation sections
            </summary>
            <div className="mt-4 flex flex-col gap-2">
              {DOC_SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-xl bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]"
                >
                  {section.label}
                </a>
              ))}
            </div>
          </details>

          <div className="mt-8 grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                  On this page
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {DOC_SECTIONS.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="rounded-xl px-3 py-2 text-sm text-[var(--fyxvo-text-muted)] transition-colors hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
                    >
                      {section.label}
                    </a>
                  ))}
                </div>
              </div>
            </aside>

            <div className="min-w-0 space-y-12">
              <div id="wallet-authentication" className="min-w-0 scroll-mt-24 space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Wallet authentication
            </h2>
            <p className="text-base leading-7 text-[var(--fyxvo-text-soft)]">
              Authentication is a challenge-sign-verify flow. The client requests a wallet-specific
              message, signs it locally, and exchanges the detached signature for a JWT.
            </p>
            <CodeBlock code={authChallengeExample} />
            <CodeBlock code={authVerifyExample} />
          </div>

              <div id="project-activation-and-funding" className="min-w-0 scroll-mt-24 space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Project activation and funding
            </h2>
            <p className="text-base leading-7 text-[var(--fyxvo-text-soft)]">
              Creating a project returns an activation transaction. Funding then follows a prepare,
              sign, and verify sequence so the on-chain treasury and workspace balance stay in sync.
              The live devnet rollout now accepts either SOL lamports or USDC base units, depending
              on which treasury asset the project wants to hold.
            </p>
            <CodeBlock code={fundingFlowExample} />
            <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              After the funding transaction is signed, verify it through
              `POST /v1/projects/:projectId/funding/verify` with the funding request ID and the
              confirmed Solana signature.
            </p>
          </div>

              <div id="gateway-usage" className="min-w-0 scroll-mt-24 space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Gateway usage
            </h2>
            <p className="text-base leading-7 text-[var(--fyxvo-text-soft)]">
              Use `rpc.fyxvo.com/rpc` for standard JSON-RPC traffic and `rpc.fyxvo.com/priority`
              for time-sensitive relay traffic. Both paths require an API key. The priority lane
              also requires the `priority:relay` scope. The live gateway currently publishes
              `5,000` lamports for standard RPC, `20,000` lamports for the higher-cost 4x lane,
              and `20,000` lamports for priority relay. Projects can also fund against USDC at
              `100`, `300`, and `500` base units across those three lanes.
            </p>
            <CodeBlock code={gatewayExample} />
          </div>
            </div>
          </div>
        </div>
      </section>

      <section id="api-explorer" className="scroll-mt-24 border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <DocsApiExplorer />
        </div>
      </section>

      <section id="public-project-pages" className="scroll-mt-24 border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Public project pages
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-soft)]">
            Explore and the public project page system are opt-in. A project only appears on a
            public page after the owner opens project settings, enables the public page, assigns a
            public slug, and turns on discoverability for that workspace.
          </p>
          <p className="mt-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            Once enabled, the public page can expose request volume, latency, success rate, and a
            public slug under `/p/[publicSlug]` without exposing private workspace data.
          </p>
        </div>
      </section>

      <section id="public-pricing-contract" className="scroll-mt-24 border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Public pricing contract
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {requestPricingTiers.map((tier, index) => (
                <div
                  key={tier.name}
                  className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5"
                >
                  <p className="text-sm font-medium text-[var(--fyxvo-text)]">{tier.name}</p>
                  <p className="mt-2 text-xl font-semibold text-[var(--fyxvo-brand)]">
                    {tier.lamports.toLocaleString()} lamports
                  </p>
                  <p className="mt-2 text-sm text-[var(--fyxvo-text-soft)]">
                    {USDC_PRICING_DETAILS[index]}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    {tier.description}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              The live gateway currently publishes 5,000 lamports for standard RPC and 20,000
              lamports for both priority relay and the higher-cost 4x lane. The same lanes can be
              funded in devnet USDC at 100, 300, and 500 base units respectively. Discounts apply
              automatically at one million requests per month for 20 percent off and at ten
              million requests per month for 40 percent off. There is no free tier in the live
              devnet deployment.
            </p>
          </div>

          <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
            <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">
              Live protocol addresses
            </h2>
            <div className="mt-6 space-y-3">
              {Object.entries(protocolAddresses).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                        {label}
                      </p>
                      <div className="mt-2">
                        <AddressLink
                          address={value}
                          chars={10}
                          className="break-all font-mono text-xs text-[var(--fyxvo-brand)] hover:underline"
                        />
                      </div>
                    </div>
                    <CopyButton text={value} className="shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="rate-limits" className="scroll-mt-24 border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Rate limits
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-soft)]">
            The relay and control plane enforce request limits to protect shared infrastructure and
            maintain predictable latency for funded traffic. Standard relay, priority relay, and
            public form endpoints all have lane-specific or abuse-specific thresholds, and the
            gateway returns rate-limit headers so client applications can back off gracefully.
          </p>
        </div>
      </section>

      <section id="sdk" className="scroll-mt-24 border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              SDK
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-soft)]">
              Developers can integrate with Fyxvo using the published JavaScript client instead of
              building their own request wrapper. Install it with `npm install @fyxvo/sdk`, create
              a gateway client with your API key, and send either standard or priority relay
              requests with the same typed interface.
            </p>
            <div className="mt-6">
              <CodeBlock code={sdkExample} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              Resources
            </p>
            <div className="mt-5 space-y-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              <p>
                The SDK also includes a control-plane client for projects, API keys, analytics,
                funding preparation, and alerts.
              </p>
              <p>
                Read the full package guide in the{" "}
                <a
                  href="https://github.com/fyxvo/fyxvo-platform/blob/main/packages/sdk/README.md"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--fyxvo-brand)] hover:underline"
                >
                  SDK README on GitHub
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="troubleshooting" className="scroll-mt-24 border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Troubleshooting
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-soft)]">
            If a request fails, start by checking wallet authentication, project funding state, API
            key scopes, and the live status page. Most integration issues come from expired JWTs,
            insufficient funded balance, a missing `priority:relay` scope, or sending requests to
            the wrong lane for the workload.
          </p>
        </div>
      </section>

      <section id="public-endpoints" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Public endpoints that do not require wallet auth
          </h2>
          <p className="mt-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            These routes are safe to call without a JWT or API key. Authenticated project and
            analytics routes require the wallet challenge flow first.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              "GET /health",
              "GET /v1/status",
              "GET /v1/network/stats",
              "GET /v1/updates",
              "GET /v1/explore",
              "GET /v1/leaderboard",
              "POST /v1/auth/challenge",
              "POST /v1/auth/verify",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 font-mono text-sm text-[var(--fyxvo-text)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
