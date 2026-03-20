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
      <section className="border-b border-[var(--fyxvo-border)] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-brand-500/25 bg-brand-500/10 px-3 py-1.5 text-sm text-brand-700 dark:text-brand-300">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              Solana devnet · Private alpha
            </div>

            <h1 className="font-display text-5xl font-semibold leading-[1.06] tracking-tight text-[var(--fyxvo-text)] sm:text-6xl lg:text-7xl">
              Funded RPC access for{" "}
              <span className="fyxvo-text-gradient">Solana developers.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--fyxvo-text-muted)]">
              Activate a project on chain, fund it with SOL, issue an API key, and route real
              devnet traffic through a managed relay. One flow. No mock endpoints.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
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
                Read docs
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
          </div>
        </div>
      </section>

      {/* Live network status strip */}
      <section className="border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)]/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
            <span className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
              Live network
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${apiOk ? "bg-emerald-400" : "bg-amber-400"}`}
              />
              <span className="text-sm text-[var(--fyxvo-text-soft)]">
                API{" "}
                <span
                  className={
                    apiOk ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                  }
                >
                  {apiOk ? "operational" : "degraded"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${gatewayOk ? "bg-emerald-400" : "bg-amber-400"}`}
              />
              <span className="text-sm text-[var(--fyxvo-text-soft)]">
                Gateway{" "}
                <span
                  className={
                    gatewayOk ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                  }
                >
                  {gatewayOk ? "operational" : "degraded"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${protocolReady ? "bg-emerald-400" : "bg-amber-400"}`}
              />
              <span className="text-sm text-[var(--fyxvo-text-soft)]">
                Protocol{" "}
                <span
                  className={
                    protocolReady ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                  }
                >
                  {protocolReady ? "ready" : "attention"}
                </span>
              </span>
            </div>
            {typeof gatewayLatency === "number" && gatewayLatency > 0 ? (
              <div className="text-sm text-[var(--fyxvo-text-muted)]">
                {formatDuration(gatewayLatency)} avg latency
              </div>
            ) : null}
            {totalRequests > 0 ? (
              <div className="text-sm text-[var(--fyxvo-text-muted)]">
                <AnimatedStat value={totalRequests} /> requests served
              </div>
            ) : null}
            {totalProjects > 0 ? (
              <div className="text-sm text-[var(--fyxvo-text-muted)]">
                <AnimatedStat value={totalProjects} /> {totalProjects === 1 ? "project" : "projects"}
              </div>
            ) : null}
            {totalApiKeys > 0 ? (
              <div className="text-sm text-[var(--fyxvo-text-muted)]">
                <AnimatedStat value={totalApiKeys} /> API {totalApiKeys === 1 ? "key" : "keys"}
              </div>
            ) : null}
            {totalSolFees !== null && totalSolFees > 0 ? (
              <div className="text-sm text-[var(--fyxvo-text-muted)]">
                <AnimatedStat value={totalSolFees} formatter={(n) => `${n.toFixed(4)} SOL`} /> collected
              </div>
            ) : null}
            <Link
              href="/status"
              className="ml-auto text-xs text-[var(--fyxvo-brand)] dark:text-brand-400 transition-colors hover:text-brand-600 dark:hover:text-brand-300"
            >
              Full status
            </Link>
          </div>
        </div>
      </section>

      {/* Product value */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
              What Fyxvo gives you
            </h2>
            <p className="mt-3 max-w-2xl text-base text-[var(--fyxvo-text-muted)]">
              Four capabilities in one product, connected to a single on-chain funding source.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Standard RPC",
                badge: "Live",
                badgeTone: "success" as const,
                body: "JSON-RPC relay over funded project credentials with multi-node routing, rate limiting, and request logging.",
              },
              {
                label: "Priority relay",
                badge: "Live",
                badgeTone: "success" as const,
                body: "Separate routing mode, separate rate window, and distinct pricing. Opt in per key when latency shape matters.",
              },
              {
                label: "Analytics",
                badge: "Live",
                badgeTone: "success" as const,
                body: "Request volume, latency, error rates, and balance consumption tied to your project. Updated from real request logs.",
              },
              {
                label: "USDC funding",
                badge: "Gated",
                badgeTone: "neutral" as const,
                body: "The on-chain asset path exists. Public product keeps it disabled until explicitly enabled in runtime config.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-base font-semibold text-[var(--fyxvo-text)]">
                    {item.label}
                  </p>
                  <Badge tone={item.badgeTone}>{item.badge}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for developers */}
      <section className="border-t border-[var(--fyxvo-border)] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Built for Solana teams moving fast on devnet
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
              If your team is integrating Solana, testing transaction flows, or validating on-chain mechanics before mainnet — Fyxvo gives you a funded RPC path with real request logging and analytics from day one.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-[var(--fyxvo-border)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
                How the live path works
              </h2>
              <p className="mt-3 text-base text-[var(--fyxvo-text-muted)]">
                Six steps from nothing to real relay traffic. Every step is real. Nothing is mocked.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "Connect a Solana wallet and prove ownership with a signed challenge.",
                  "Create a project. Sign the on-chain activation transaction in your wallet.",
                  "Prepare a SOL funding transaction and confirm it on Solana devnet.",
                  "Issue an API key with scoped access to the relay endpoints.",
                  "Send a JSON-RPC request to the gateway with your API key.",
                  "Watch request logs, latency, and balance update in analytics.",
                ].map((step, i) => (
                  <div key={step} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-500/30 bg-brand-500/10 font-display text-sm font-semibold text-brand-700 dark:text-brand-300">
                      {i + 1}
                    </div>
                    <p className="pt-1 text-sm leading-7 text-[var(--fyxvo-text-soft)]">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                  Trust surface
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "SOL funding", value: "Live on devnet" },
                    { label: "USDC funding", value: "Config-gated" },
                    { label: "Operators", value: "Managed by Fyxvo" },
                    { label: "Authority", value: "Single-signer" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-md border border-[var(--fyxvo-border)] p-3">
                      <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--fyxvo-text)]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <Notice tone="success" title="SOL path is live">
                Wallet auth, project activation, SOL funding, standard RPC, priority relay, request
                logging, and analytics are all operating against the deployed devnet program.
              </Notice>
              <Notice tone="neutral" title="Operator topology is managed">
                Routing runs through Fyxvo-managed infrastructure during the private alpha. This
                keeps latency predictable while early traffic patterns settle.
              </Notice>
            </div>
          </div>
        </div>
      </section>

      {/* Developer quickstart */}
      <section id="developer-flow" className="border-t border-[var(--fyxvo-border)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
                First request in minutes
              </h2>
              <p className="mt-3 text-base text-[var(--fyxvo-text-muted)]">
                The gateway accepts standard JSON-RPC requests with an API key in the header.
              </p>

              <div className="mt-6 overflow-hidden rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
                <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-4 py-2.5">
                  <span className="text-xs text-[var(--fyxvo-text-muted)]">Standard RPC · curl</span>
                  <CopyButton value={curlExample} label="Copy" />
                </div>
                <pre className="overflow-x-auto p-4 text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                  <code>{curlExample}</code>
                </pre>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <CopyButton value="https://rpc.fyxvo.com/rpc" label="Copy RPC endpoint" />
                <CopyButton value="https://rpc.fyxvo.com/priority" label="Copy priority endpoint" />
                <Button asChild size="sm" variant="secondary">
                  <Link href="/docs">Full quickstart</Link>
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
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
                  className="flex items-center justify-between gap-4 rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
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
      <section id="operators" className="border-t border-[var(--fyxvo-border)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
                Managed operator infrastructure
              </h2>
              <p className="mt-3 text-base text-[var(--fyxvo-text-muted)]">
                Fyxvo launches with a single managed operator so routing quality stays predictable
                while the product matures. This is not an open marketplace claim.
              </p>
              <div className="mt-6 space-y-3">
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
                    className="rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
                  >
                    <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
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
              <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                <p className="font-display text-base font-semibold text-[var(--fyxvo-text)]">
                  Program ID
                </p>
                <p className="mt-2 break-all font-mono text-sm text-[var(--fyxvo-text-soft)]">
                  {liveDevnetState.programId}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyButton value={liveDevnetState.programId} label="Copy program ID" />
                </div>
              </div>
              <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
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
      <section id="community" className="border-t border-[var(--fyxvo-border)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
                Join the launch channels
              </h2>
              <p className="mt-3 max-w-lg text-base text-[var(--fyxvo-text-muted)]">
                X for launch updates. Discord for product questions. Telegram for quick coordination
                during devnet rollout. Direct founder support is available through the contact form.
              </p>
              <div className="mt-6">
                <SocialLinkButtons />
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                  Who this is for
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                  Teams validating funded Solana RPC, priority relay behavior, on-chain project
                  activation, and analytics visibility before expanding beyond the current managed
                  topology.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <TrackedLinkButton
                  href="/pricing"
                  eventName="landing_cta_clicked"
                  eventSource="home-community-pricing"
                  variant="secondary"
                >
                  Review pricing
                </TrackedLinkButton>
                <TrackedLinkButton
                  href="/contact"
                  eventName="landing_cta_clicked"
                  eventSource="home-community-contact"
                  variant="secondary"
                >
                  Talk to the founder
                </TrackedLinkButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
