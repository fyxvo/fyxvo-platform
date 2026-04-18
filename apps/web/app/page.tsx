import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@fyxvo/ui";
import { AddressLink } from "../components/address-link";
import { CopyButton } from "../components/copy-button";
import { DashboardParticles, HeroSection } from "../components/hero-section";
import { EmailSubscribeForm } from "../components/email-subscribe-form";
import { AlertIcon, CodeIcon, KeyIcon, WalletIcon, ZapIcon } from "../components/icons";
import {
  getPublicApiHealth,
  getPublicApiStatus,
  getPublicGatewayHealth,
  getPublicNetworkStats,
  protocolAddresses,
} from "../lib/public-data";

export const metadata: Metadata = {
  title: "Fyxvo — Solana RPC and relay infrastructure network",
  description:
    "Fyxvo is a live Solana devnet control plane for wallet-authenticated project activation, SOL and USDC funding, funded RPC relay access, and live analytics.",
};

const CAPABILITIES = [
  {
    title: "Wallet-authenticated workspace",
    description:
      "Connect a Solana wallet, sign a challenge, and operate the platform with a JWT-backed session.",
    icon: WalletIcon,
  },
  {
    title: "Funded relay access",
    description:
      "Traffic is backed by project funding instead of hidden monthly credits, so request spend stays visible.",
    icon: ZapIcon,
  },
  {
    title: "Scoped API keys",
    description:
      "Create project-scoped keys for reads, relay usage, and priority lanes without sharing one global secret.",
    icon: KeyIcon,
  },
  {
    title: "Analytics and alerts",
    description:
      "Track request history, latency, error pressure, and low-balance signals from the same control plane.",
    icon: AlertIcon,
  },
  {
    title: "Assistant and playground",
    description:
      "Debug onboarding, funding, and relay behavior with a project-aware assistant and live RPC playground.",
    icon: CodeIcon,
  },
] as const;

const OPERATING_STEPS = [
  {
    step: "01",
    title: "Authenticate with a wallet",
    body: "Request a challenge, sign it with Phantom or another supported wallet, and exchange the signature for a JWT.",
  },
  {
    step: "02",
    title: "Create and activate a project",
    body: "Project creation returns an activation transaction so the workspace and the on-chain protocol stay aligned.",
  },
  {
    step: "03",
    title: "Fund the project treasury",
    body: "Prepare a SOL funding transaction, sign it, and verify it so the funded balance becomes available to the relay.",
  },
  {
    step: "04",
    title: "Issue scoped API keys",
    body: "Create keys for standard RPC, priority relay, or read access depending on what the project needs.",
  },
  {
    step: "05",
    title: "Operate through one surface",
    body: "Use analytics, alerts, request logs, public pages, and the assistant to keep the project healthy.",
  },
] as const;

function formatShortCommit(commit?: string | null): string | null {
  if (!commit) return null;
  return commit.slice(0, 7);
}

function statusLabel(ok: boolean | null, goodLabel: string): string {
  if (ok === null) return "checking";
  return ok ? goodLabel : "attention";
}

export default async function HomePage() {
  const [apiHealth, apiStatus, gatewayHealth, networkStats] = await Promise.all([
    getPublicApiHealth(),
    getPublicApiStatus(),
    getPublicGatewayHealth(),
    getPublicNetworkStats(),
  ]);

  const controlPlaneOk = apiHealth?.status === "ok";
  const gatewayOk = gatewayHealth?.status === "ok";
  const protocolReady = apiStatus?.protocolReadiness?.ready ?? null;
  const totalRequests =
    networkStats?.totalRequests ?? gatewayHealth?.metrics?.totals?.requests ?? 0;
  const standardLatency = gatewayHealth?.metrics?.standard?.averageLatencyMs ?? null;
  const priorityLatency = gatewayHealth?.metrics?.priority?.averageLatencyMs ?? null;
  const commit = formatShortCommit(
    apiStatus?.commit ?? apiHealth?.commit ?? gatewayHealth?.commit,
  );

  const heroStats = [
    { label: "Requests Observed", value: totalRequests, suffix: "" },
    { label: "Connected Projects", value: networkStats?.totalProjects ?? 0, suffix: "" },
    { label: "Uptime Target", value: 99.9, suffix: "%", decimals: 1 },
  ];

  return (
    <div>
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <HeroSection stats={heroStats}>
        <div className="max-w-3xl pt-20">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm backdrop-blur-sm"
            style={{
              borderColor: "rgba(249,115,22,0.3)",
              backgroundColor: "rgba(0,0,0,0.4)",
              color: "var(--fyxvo-brand)",
            }}
          >
            <span
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ backgroundColor: "var(--fyxvo-brand)" }}
            />
            Devnet private alpha
          </div>

          <h1
            className="mt-6 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
            style={{
              background:
                "linear-gradient(135deg, var(--fyxvo-text) 0%, #f97316 55%, #fbbf24 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer-text 5s linear infinite",
            }}
          >
            Decentralized Solana RPC and relay infrastructure
          </h1>

          <p
            className="mt-6 max-w-2xl text-lg leading-8"
            style={{ color: "var(--fyxvo-text-soft)" }}
          >
            Connect a wallet, activate a project, fund it with SOL or USDC, and start routing
            real Solana JSON-RPC traffic through the managed gateway. The network is live on
            devnet today.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="platform-glow-btn inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all duration-200"
              style={{ backgroundColor: "var(--fyxvo-brand)" }}
            >
              Open dashboard
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link
              href="/docs"
              className="platform-glow-btn-secondary inline-flex items-center rounded-xl border px-6 py-3 text-sm font-semibold backdrop-blur-sm transition-all duration-200"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "var(--fyxvo-text-soft)",
              }}
            >
              Read docs
            </Link>
            <Link
              href="/playground"
              className="platform-glow-btn-secondary inline-flex items-center rounded-xl border px-6 py-3 text-sm font-semibold backdrop-blur-sm transition-all duration-200"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "var(--fyxvo-text-soft)",
              }}
            >
              Open playground
            </Link>
          </div>
        </div>
      </HeroSection>

      {/* ── NETWORK STATUS ────────────────────────────────────────────── */}
      <section
        className="relative border-b px-4 py-20 sm:px-6 lg:px-8"
        style={{ borderColor: "var(--fyxvo-border)" }}
      >
        <DashboardParticles />
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="rounded-3xl border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:p-8"
            style={{
              borderColor: "var(--fyxvo-border)",
              backgroundColor: "var(--fyxvo-panel)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p
                  className="text-xs uppercase tracking-[0.16em]"
                  style={{ color: "var(--fyxvo-text-muted)" }}
                >
                  Live network
                </p>
                <h2 className="mt-2 text-xl font-semibold" style={{ color: "var(--fyxvo-text)" }}>
                  Current operating posture
                </h2>
              </div>
              {commit ? (
                <span
                  className="rounded-full border px-3 py-1 text-xs"
                  style={{
                    borderColor: "var(--fyxvo-border)",
                    backgroundColor: "var(--fyxvo-panel-soft)",
                    color: "var(--fyxvo-text-muted)",
                  }}
                >
                  {commit}
                </span>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3">
              {[
                {
                  label: "Control plane",
                  value: statusLabel(controlPlaneOk ?? null, "operational"),
                  ok: controlPlaneOk ?? null,
                },
                {
                  label: "Relay gateway",
                  value: statusLabel(gatewayOk ?? null, "operational"),
                  ok: gatewayOk ?? null,
                },
                {
                  label: "Protocol readiness",
                  value: statusLabel(protocolReady, "ready"),
                  ok: protocolReady,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border px-4 py-3"
                  style={{
                    borderColor: "var(--fyxvo-border)",
                    backgroundColor: "var(--fyxvo-panel-soft)",
                  }}
                >
                  <span className="text-sm" style={{ color: "var(--fyxvo-text-soft)" }}>
                    {item.label}
                  </span>
                  <span
                    className="flex items-center gap-2 text-sm font-medium"
                    style={{ color: "var(--fyxvo-text)" }}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        item.ok === null
                          ? "bg-[var(--fyxvo-text-muted)]"
                          : item.ok
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                      }`}
                    />
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Requests observed",
                  value: totalRequests.toLocaleString(),
                },
                { label: "Connected projects", value: networkStats?.totalProjects ?? 0 },
                {
                  label: "Standard latency",
                  value:
                    typeof standardLatency === "number"
                      ? `${standardLatency}ms`
                      : "Awaiting traffic",
                },
                {
                  label: "Priority latency",
                  value:
                    typeof priorityLatency === "number"
                      ? `${priorityLatency}ms`
                      : "Awaiting traffic",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: "var(--fyxvo-border)",
                    backgroundColor: "var(--fyxvo-panel-soft)",
                  }}
                >
                  <p
                    className="text-xs uppercase tracking-[0.14em]"
                    style={{ color: "var(--fyxvo-text-muted)" }}
                  >
                    {stat.label}
                  </p>
                  <p
                    className="mt-2 text-2xl font-semibold"
                    style={{ color: "var(--fyxvo-text)" }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Link
                href="/status"
                className="text-sm font-medium transition-colors hover:opacity-70"
                style={{ color: "var(--fyxvo-brand)" }}
              >
                View full status →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ──────────────────────────────────────────────── */}
      <section
        className="border-b px-4 py-20 sm:px-6 lg:px-8"
        style={{ borderColor: "var(--fyxvo-border)" }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p
              className="text-xs uppercase tracking-[0.16em]"
              style={{ color: "var(--fyxvo-brand)" }}
            >
              What ships today
            </p>
            <h2
              className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ color: "var(--fyxvo-text)" }}
            >
              Built around project-level control instead of anonymous endpoint access
            </h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {CAPABILITIES.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="capability-card glass-platform rounded-3xl border p-6"
                  style={{
                    borderColor: "var(--fyxvo-border)",
                    backgroundColor: "var(--fyxvo-panel)",
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: "var(--fyxvo-panel-soft)",
                      color: "var(--fyxvo-brand)",
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <h3
                    className="mt-5 text-lg font-semibold"
                    style={{ color: "var(--fyxvo-text)" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="mt-3 text-sm leading-6"
                    style={{ color: "var(--fyxvo-text-soft)" }}
                  >
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── INFRASTRUCTURE IMAGE ─────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ height: "340px" }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
          }}
          aria-hidden="true"
        />
        {/* Dark overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(10,10,15,0.88) 0%, rgba(15,10,25,0.75) 50%, rgba(10,10,15,0.88) 100%)",
          }}
          aria-hidden="true"
        />
        {/* Orange tint */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 30% 50%, rgba(249,115,22,0.08) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div
          className="relative flex h-full items-center px-4 sm:px-6 lg:px-8"
          style={{ zIndex: 10 }}
        >
          <div className="mx-auto max-w-7xl">
            <p
              className="text-xs uppercase tracking-[0.18em]"
              style={{ color: "var(--fyxvo-brand)" }}
            >
              Infrastructure
            </p>
            <h2
              className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: "var(--fyxvo-text)" }}
            >
              Global relay nodes. One control plane.
            </h2>
            <p
              className="mt-4 max-w-xl text-base leading-7"
              style={{ color: "var(--fyxvo-text-soft)" }}
            >
              Every request flows through a managed, wallet-authenticated gateway layer designed
              for Solana&apos;s throughput and finality requirements.
            </p>
          </div>
        </div>
      </section>

      {/* ── YIELD PROMO ───────────────────────────────────────────────── */}
      <section
        className="border-b px-4 py-20 sm:px-6 lg:px-8"
        style={{ borderColor: "var(--fyxvo-border)" }}
      >
        <div className="mx-auto max-w-7xl">
          <div
            className="rounded-3xl border p-8 sm:p-10 lg:p-12"
            style={{
              borderColor: "rgba(249,115,22,0.2)",
              background: `linear-gradient(135deg, var(--fyxvo-panel) 0%, var(--fyxvo-panel-soft) 100%)`,
            }}
          >
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p
                  className="text-xs uppercase tracking-[0.18em]"
                  style={{ color: "var(--fyxvo-brand)" }}
                >
                  Fyxvo Yield
                </p>
                <h2
                  className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
                  style={{ color: "var(--fyxvo-text)" }}
                >
                  Live Solana yield discovery
                </h2>
                <p
                  className="mt-4 max-w-xl text-base leading-7"
                  style={{ color: "var(--fyxvo-text-soft)" }}
                >
                  Compare APY and TVL across Kamino, MarginFi, and Orca in real time. Track wallet
                  positions, set rebalance alerts by APY threshold, and review protocol risk — all
                  powered by the same Fyxvo RPC network.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="https://yield.fyxvo.com"
                    target="_blank"
                    rel="noreferrer"
                    className="platform-glow-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
                    style={{ backgroundColor: "var(--fyxvo-brand)" }}
                  >
                    Open Yield Dashboard
                    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="M3 8h10M9 4l4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                </div>
              </div>
              <div className="grid gap-3">
                {[
                  { label: "Protocols covered", value: "Kamino · MarginFi · Orca" },
                  { label: "Data source", value: "Live public RPC + protocol APIs" },
                  { label: "Risk overlays", value: "Audit + TVL + age scoring" },
                  { label: "Wallet tracking", value: "Positions + earnings estimates" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 rounded-2xl border px-4 py-3"
                    style={{
                      borderColor: "var(--fyxvo-border)",
                      backgroundColor: "rgba(var(--fyxvo-bg),0.6)",
                    }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: "var(--fyxvo-text-muted)" }}
                    >
                      {item.label}
                    </span>
                    <span
                      className="text-right text-sm font-medium"
                      style={{ color: "var(--fyxvo-text)" }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── OPERATING STEPS ───────────────────────────────────────────── */}
      <section
        className="border-b px-4 py-20 sm:px-6 lg:px-8"
        style={{ borderColor: "var(--fyxvo-border)" }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p
              className="text-xs uppercase tracking-[0.16em]"
              style={{ color: "var(--fyxvo-brand)" }}
            >
              End-to-end flow
            </p>
            <h2
              className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ color: "var(--fyxvo-text)" }}
            >
              From wallet signature to funded relay traffic
            </h2>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-5">
            {OPERATING_STEPS.map((item, i) => (
              <div
                key={item.step}
                className="capability-card glass-platform rounded-3xl border p-5"
                style={{
                  borderColor: "var(--fyxvo-border)",
                  backgroundColor: "var(--fyxvo-panel)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-[0.16em]"
                  style={{ color: "var(--fyxvo-brand)" }}
                >
                  {item.step}
                </p>
                <h3
                  className="mt-4 text-lg font-semibold"
                  style={{ color: "var(--fyxvo-text)" }}
                >
                  {item.title}
                </h3>
                <p
                  className="mt-3 text-sm leading-6"
                  style={{ color: "var(--fyxvo-text-soft)" }}
                >
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ADDRESSES ─────────────────────────────────────────────────── */}
      <section
        className="border-b px-4 py-20 sm:px-6 lg:px-8"
        style={{ borderColor: "var(--fyxvo-border)" }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p
                className="text-xs uppercase tracking-[0.16em]"
                style={{ color: "var(--fyxvo-brand)" }}
              >
                On-chain contract
              </p>
              <h2
                className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
                style={{ color: "var(--fyxvo-text)" }}
              >
                Live devnet addresses
              </h2>
              <p
                className="mt-4 text-sm leading-6"
                style={{ color: "var(--fyxvo-text-soft)" }}
              >
                These protocol addresses are part of the current live deployment.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/docs">See the full onboarding contract</Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {Object.entries(protocolAddresses).map(([key, value]) => (
              <div
                key={key}
                className="rounded-2xl border p-4"
                style={{
                  borderColor: "var(--fyxvo-border)",
                  backgroundColor: "var(--fyxvo-panel)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="text-xs uppercase tracking-[0.14em]"
                      style={{ color: "var(--fyxvo-text-muted)" }}
                    >
                      {key}
                    </p>
                    <div className="mt-2">
                      <AddressLink
                        address={value}
                        chars={10}
                        className="break-all font-mono text-sm text-[var(--fyxvo-brand)] hover:underline"
                      />
                    </div>
                  </div>
                  <CopyButton text={value} className="shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div
          className="mx-auto max-w-5xl rounded-[2rem] border p-8 sm:p-10"
          style={{
            borderColor: "var(--fyxvo-border)",
            backgroundColor: "var(--fyxvo-panel)",
          }}
        >
          <p
            className="text-xs uppercase tracking-[0.16em]"
            style={{ color: "var(--fyxvo-brand)" }}
          >
            Start here
          </p>
          <h2
            className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ color: "var(--fyxvo-text)" }}
          >
            Integrate against the real product contract, not a generic RPC landing page
          </h2>
          <p
            className="mt-4 max-w-2xl text-base leading-7"
            style={{ color: "var(--fyxvo-text-soft)" }}
          >
            The quickest path is to connect a wallet, create a project, prepare a funding
            transaction, issue an API key, and route your first request through{" "}
            <code className="font-mono text-sm" style={{ color: "var(--fyxvo-brand)" }}>
              rpc.fyxvo.com
            </code>
            .
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/docs">Read the quickstart</Link>
            </Button>
          </div>
          <div
            className="mt-10 max-w-2xl rounded-2xl border p-5"
            style={{
              borderColor: "var(--fyxvo-border)",
              backgroundColor: "var(--fyxvo-panel-soft)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--fyxvo-text)" }}>
              Newsletter
            </p>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--fyxvo-text-soft)" }}>
              Subscribe if you want release notes, pricing updates, and public rollout changes sent
              to your inbox as the devnet product matures.
            </p>
            <div className="mt-4">
              <EmailSubscribeForm
                endpoint="/v1/newsletter/subscribe"
                buttonLabel="Subscribe"
                successMessage="Your email has been added to the Fyxvo newsletter list."
                source="home"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
