import Link from "next/link";
import { Badge, Button, Notice } from "@fyxvo/ui";
import { CopyButton } from "../components/copy-button";
import { SocialLinkButtons } from "../components/social-links";
import { TrackedLinkButton } from "../components/tracked-link-button";
import { getStatusSnapshot } from "../lib/server-status";
import { getNetworkStats } from "../lib/api";
import { formatDuration } from "../lib/format";
import { liveDevnetState } from "../lib/live-state";
import { AnimatedStat } from "../components/animated-stat";
import { AnimatedTerminal } from "../components/animated-terminal";
import { InteractiveDemo } from "../components/interactive-demo";

export default async function HomePage() {
  const [status, networkStats] = await Promise.all([
    getStatusSnapshot(),
    getNetworkStats().catch(() => null)
  ]);
  const apiOk = status.apiHealth.status === "ok";
  const gatewayOk = status.gatewayHealth.status === "ok";
  const protocolReady = Boolean(status.apiStatus.protocolReadiness?.ready);
  const gatewayLatency = status.gatewayStatus.metrics?.standard?.averageLatencyMs;
  const totalRequests = networkStats?.totalRequests ?? status.gatewayStatus.metrics?.totals?.requests ?? 0;
  const totalProjects = networkStats?.totalProjects ?? 0;
  const totalApiKeys = networkStats?.totalApiKeys ?? 0;
  const totalSolFees = networkStats?.totalSolFees ? Number(BigInt(networkStats.totalSolFees)) / 1_000_000_000 : null;

  const curlExample = `curl -X POST https://rpc.fyxvo.com/rpc \\
  -H "content-type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'`;

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-[var(--fyxvo-border)] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-20 lg:items-center">
            <div>
              <div className="mb-8 inline-flex items-center gap-2 rounded-lg border border-[var(--fyxvo-brand)]/20 bg-[var(--fyxvo-brand-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--fyxvo-brand)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--fyxvo-brand)]" />
                Solana devnet, private alpha
              </div>

              <h1 className="font-display text-5xl font-semibold leading-[1.06] tracking-tight text-[var(--fyxvo-text)] sm:text-6xl xl:text-7xl">
                Real RPC access{" "}
                <span className="fyxvo-text-gradient">for Solana builders.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--fyxvo-text-muted)]">
                Create a project on chain, fund it with SOL, grab an API key, and start
                routing actual devnet traffic through a managed relay. Everything is live,
                nothing is simulated.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <TrackedLinkButton
                  href="/dashboard"
                  eventName="landing_cta_clicked"
                  eventSource="home-hero-dashboard"
                  size="lg"
                >
                  Open dashboard
                </TrackedLinkButton>
                <TrackedLinkButton
                  href="/docs"
                  eventName="landing_cta_clicked"
                  eventSource="home-hero-docs"
                  size="lg"
                  variant="secondary"
                >
                  Read the docs
                </TrackedLinkButton>
                <TrackedLinkButton
                  href="/contact"
                  eventName="landing_cta_clicked"
                  eventSource="home-hero-contact"
                  size="lg"
                  variant="ghost"
                >
                  Talk to the founder
                </TrackedLinkButton>
              </div>
              <p className="mt-4 text-sm text-[var(--fyxvo-text-muted)]">
                Most teams get their first response in under five minutes.
              </p>
            </div>

            <div className="hidden lg:block">
              <AnimatedTerminal />
            </div>
          </div>
        </div>
      </section>

      {/* Live network status strip */}
      <section className="border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)]/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 py-3.5">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
              Live network
            </span>
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${apiOk ? "bg-[var(--fyxvo-success)]" : "bg-[var(--fyxvo-warning)]"}`} />
              <span className="text-sm text-[var(--fyxvo-text-soft)]">
                API{" "}
                <span className={apiOk ? "text-[var(--fyxvo-success)]" : "text-[var(--fyxvo-warning)]"}>
                  {apiOk ? "operational" : "degraded"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${gatewayOk ? "bg-[var(--fyxvo-success)]" : "bg-[var(--fyxvo-warning)]"}`} />
              <span className="text-sm text-[var(--fyxvo-text-soft)]">
                Gateway{" "}
                <span className={gatewayOk ? "text-[var(--fyxvo-success)]" : "text-[var(--fyxvo-warning)]"}>
                  {gatewayOk ? "operational" : "degraded"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${protocolReady ? "bg-[var(--fyxvo-success)]" : "bg-[var(--fyxvo-warning)]"}`} />
              <span className="text-sm text-[var(--fyxvo-text-soft)]">
                Protocol{" "}
                <span className={protocolReady ? "text-[var(--fyxvo-success)]" : "text-[var(--fyxvo-warning)]"}>
                  {protocolReady ? "ready" : "attention"}
                </span>
              </span>
            </div>
            {typeof gatewayLatency === "number" && gatewayLatency > 0 ? (
              <span className="text-sm text-[var(--fyxvo-text-muted)]">{formatDuration(gatewayLatency)} avg latency</span>
            ) : null}
            {totalRequests > 0 ? (
              <span className="text-sm text-[var(--fyxvo-text-muted)]">
                <AnimatedStat value={totalRequests} /> requests
              </span>
            ) : null}
            {totalProjects > 0 ? (
              <span className="text-sm text-[var(--fyxvo-text-muted)]">
                <AnimatedStat value={totalProjects} /> {totalProjects === 1 ? "project" : "projects"}
              </span>
            ) : null}
            {totalApiKeys > 0 ? (
              <span className="text-sm text-[var(--fyxvo-text-muted)]">
                <AnimatedStat value={totalApiKeys} /> API {totalApiKeys === 1 ? "key" : "keys"}
              </span>
            ) : null}
            {totalSolFees !== null && totalSolFees > 0 ? (
              <span className="text-sm text-[var(--fyxvo-text-muted)]">
                <AnimatedStat value={totalSolFees} formatter={(n) => `${n.toFixed(4)} SOL`} /> collected
              </span>
            ) : null}
            <Link
              href="/status"
              className="ml-auto text-xs font-medium text-[var(--fyxvo-brand)] transition-colors hover:text-[var(--fyxvo-brand-soft)]"
            >
              Full status
            </Link>
          </div>
        </div>
      </section>

      {/* Product capabilities */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              Capabilities
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
              Everything you need in one place
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
              Four core capabilities tied to a single on-chain funding source. No separate billing systems, no hidden layers.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Standard RPC",
                badge: "Live",
                badgeTone: "success" as const,
                body: "Route JSON-RPC requests through a managed relay with multi-node failover, per-key rate limits, and full request logging out of the box.",
              },
              {
                label: "Priority relay",
                badge: "Live",
                badgeTone: "success" as const,
                body: "A dedicated routing path with its own rate window and pricing, designed for latency-sensitive operations like DeFi transactions.",
              },
              {
                label: "Analytics",
                badge: "Live",
                badgeTone: "success" as const,
                body: "Request volume, latency breakdown, error rates, and balance usage. All pulled from actual request logs, updated in real time.",
              },
              {
                label: "USDC funding",
                badge: "Gated",
                badgeTone: "neutral" as const,
                body: "The on-chain USDC path exists in the protocol. It stays disabled in the current deployment until explicitly turned on.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5 transition-colors duration-150 hover:border-[var(--fyxvo-border-strong)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-base font-semibold text-[var(--fyxvo-text)]">
                    {item.label}
                  </p>
                  <Badge tone={item.badgeTone}>{item.badge}</Badge>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer workflows */}
      <section className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              Built for real workflows
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
              Go from setup to verified traffic without guesswork
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
              Clear, technical surfaces that show you exactly what is happening at every step. No black boxes, no assumptions about what went wrong.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Project-scoped API keys",
                body: "Each key is tied to a single project with explicit scopes, so relay traffic, analytics, and operational ownership stay cleanly separated across your organization.",
              },
              {
                title: "Live analytics and request tracing",
                body: "Watch your first request land in the logs, then drill into latency histograms, error breakdowns, and balance consumption per project. No delayed reporting.",
              },
              {
                title: "Managed infrastructure with full visibility",
                body: "The gateway runs on managed nodes with public status pages, incident history, and operational context built into the platform, so you always know what is happening.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6 transition-colors duration-150 hover:border-[var(--fyxvo-border-strong)]"
              >
                <h3 className="font-display text-base font-semibold text-[var(--fyxvo-text)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-muted)]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section id="use-cases" className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              Use cases
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
              Who builds on Fyxvo
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
              Teams that need funded, observable, and controllable RPC access on Solana devnet.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "DeFi protocols",
                body: "Test swap, lending, and liquidation flows against devnet before going to mainnet. Priority relay keeps time-sensitive transactions on the fast path.",
              },
              {
                title: "Gaming studios",
                body: "Run high-frequency minting, trade matching, and on-chain state transitions at realistic load without burning mainnet SOL on every test cycle.",
              },
              {
                title: "Tooling developers",
                body: "Build wallets, explorers, and monitoring dashboards against authenticated devnet RPC with structured request logs and clear error breakdowns.",
              },
              {
                title: "Agent frameworks",
                body: "Give autonomous Solana agents a funded API key with enforced scopes, and track every RPC call they make through the analytics view.",
              },
              {
                title: "Mobile dApps",
                body: "Point your mobile client at a managed relay with built-in rate limiting. No shared rate caps, no surprise throttling mid-demo.",
              },
              {
                title: "QA and staging environments",
                body: "Keep staging and production on separate projects with distinct balances and keys. Same control surface, different environment labels.",
              },
            ].map((item, index) => (
              <div
                key={item.title}
                className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6 transition-colors duration-150 hover:border-[var(--fyxvo-border-strong)]"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--fyxvo-brand)]/20 bg-[var(--fyxvo-brand-subtle)]">
                  <span className="font-display text-sm font-semibold text-[var(--fyxvo-brand)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="font-display text-base font-semibold text-[var(--fyxvo-text)]">{item.title}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-muted)]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive demo */}
      <section id="demo" className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              Interactive walkthrough
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
              See how it works
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
              Walk through the five steps from project creation to live analytics, right here on the page.
            </p>
          </div>
          <InteractiveDemo />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                The live path
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
                How it works
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
                Six steps from nothing to real relay traffic. Every step touches real infrastructure. Nothing is mocked or simulated.
              </p>
              <ol className="mt-10 space-y-4">
                {[
                  "Connect your Solana wallet and prove ownership with a signed challenge.",
                  "Create a project and confirm the on-chain activation transaction.",
                  "Prepare a SOL funding transaction and sign it on Solana devnet.",
                  "Issue an API key scoped to the relay endpoints you need.",
                  "Send your first JSON-RPC request through the gateway.",
                  "Watch request logs, latency data, and balance updates appear in analytics.",
                ].map((step, i) => (
                  <li key={step} className="flex gap-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--fyxvo-brand)]/25 bg-[var(--fyxvo-brand-subtle)] font-display text-xs font-semibold text-[var(--fyxvo-brand)]">
                      {i + 1}
                    </div>
                    <p className="pt-0.5 text-sm leading-7 text-[var(--fyxvo-text-soft)]">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Current state
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "SOL funding", value: "Live on devnet" },
                    { label: "USDC funding", value: "Config-gated" },
                    { label: "Operators", value: "Managed by Fyxvo" },
                    { label: "Authority", value: "Single-signer" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--fyxvo-text-muted)]">
                        {item.label}
                      </p>
                      <p className="mt-1.5 text-sm font-medium text-[var(--fyxvo-text)]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <Notice tone="success" title="SOL path is live">
                Wallet auth, project activation, SOL funding, standard RPC, priority relay, request
                logging, and analytics are all running against the deployed devnet program today.
              </Notice>
              <Notice tone="neutral" title="Managed operator topology">
                Routing runs through Fyxvo-managed infrastructure during the private alpha. This
                keeps latency consistent while early traffic patterns settle in.
              </Notice>
            </div>
          </div>
        </div>
      </section>

      {/* Developer quickstart */}
      <section id="developer-flow" className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                Quickstart
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
                Your first request in minutes
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
                The gateway accepts standard JSON-RPC calls. Add your API key in the header and you are ready.
              </p>

              <div className="mt-8 overflow-hidden rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
                <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-4 py-2.5">
                  <span className="font-mono text-xs text-[var(--fyxvo-text-muted)]">Standard RPC, curl</span>
                  <CopyButton value={curlExample} label="Copy" />
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                  <code>{curlExample}</code>
                </pre>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <CopyButton value="https://rpc.fyxvo.com/rpc" label="Copy RPC endpoint" />
                <CopyButton value="https://rpc.fyxvo.com/priority" label="Copy priority endpoint" />
                <Button asChild size="sm" variant="secondary">
                  <Link href="/docs">Full quickstart</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/playground?method=getHealth">Try in Playground</Link>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Endpoints
              </p>
              {[
                { label: "Control API", value: "api.fyxvo.com" },
                { label: "Standard RPC", value: "rpc.fyxvo.com/rpc" },
                { label: "Priority relay", value: "rpc.fyxvo.com/priority" },
                { label: "Status page", value: "status.fyxvo.com" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 transition-colors duration-150 hover:border-[var(--fyxvo-border-strong)]"
                >
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--fyxvo-text-muted)]">
                      {label}
                    </p>
                    <p className="mt-0.5 font-mono text-sm text-[var(--fyxvo-text)]">{value}</p>
                  </div>
                  <CopyButton value={`https://${value}`} className="shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Node operator section */}
      <section id="operators" className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                Infrastructure
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
                Managed operator infrastructure
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
                Fyxvo starts with a single managed operator so routing quality stays predictable
                while the product matures. This is honest about what it is, not a marketplace claim
                dressed up as decentralization.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  {
                    label: "Managed operator wallet",
                    value: liveDevnetState.managedOperatorWallet,
                  },
                  {
                    label: "Operator account",
                    value: liveDevnetState.managedOperatorAccount,
                  },
                  {
                    label: "Reward account",
                    value: liveDevnetState.managedRewardAccount,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
                  >
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--fyxvo-text-muted)]">
                      {item.label}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-[var(--fyxvo-text-soft)]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                <p className="font-display text-base font-semibold text-[var(--fyxvo-text)]">
                  Program ID
                </p>
                <p className="mt-2 break-all font-mono text-sm text-[var(--fyxvo-text-soft)]">
                  {liveDevnetState.programId}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <CopyButton value={liveDevnetState.programId} label="Copy program ID" />
                  <Link
                    href={`https://explorer.solana.com/address/${liveDevnetState.programId}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-2.5 py-1.5 text-xs text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]"
                  >
                    View on Explorer
                  </Link>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                <p className="font-display text-base font-semibold text-[var(--fyxvo-text)]">
                  Admin authority
                </p>
                <p className="mt-2 break-all font-mono text-sm text-[var(--fyxvo-text-soft)]">
                  {liveDevnetState.adminAuthority}
                </p>
              </div>
              <Button asChild variant="secondary">
                <Link href="/operators">Operator details</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Community */}
      <section id="community" className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                Community
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
                Join the conversation
              </h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-[var(--fyxvo-text-muted)]">
                Follow launch updates on X. Ask product questions in Discord. Coordinate on Telegram
                during devnet rollout. The founder is reachable through the contact form if you
                need a direct conversation.
              </p>
              <div className="mt-8">
                <SocialLinkButtons />
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Who this is for
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                  Teams that want to validate funded Solana RPC, priority relay behavior, on-chain project
                  activation, and analytics visibility before scaling beyond the current managed topology.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <TrackedLinkButton
                  href="/dashboard"
                  eventName="landing_cta_clicked"
                  eventSource="home-community-dashboard"
                >
                  Open dashboard
                </TrackedLinkButton>
                <TrackedLinkButton
                  href="/docs"
                  eventName="landing_cta_clicked"
                  eventSource="home-community-docs"
                  variant="secondary"
                >
                  Read the docs
                </TrackedLinkButton>
                <TrackedLinkButton
                  href="https://discord.gg/Uggu236Jgj"
                  eventName="landing_cta_clicked"
                  eventSource="home-community-discord"
                  variant="ghost"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Discord
                </TrackedLinkButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
