import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@fyxvo/ui";
import { CopyButton } from "../components/copy-button";
import { NewsletterSignup } from "../components/newsletter-signup";
import { FadeIn } from "../components/fade-in";
import { getStatusSnapshot } from "../lib/server-status";
import { getNetworkStats } from "../lib/api";
import { liveDevnetState } from "../lib/live-state";
import { webEnv } from "../lib/env";

export const metadata: Metadata = {
  title: {
    absolute: "Fyxvo — Solana devnet infrastructure"
  },
  description:
    "Fyxvo is real Solana devnet infrastructure for funded relay traffic with honest operational visibility. Create a project, fund it on chain, and start routing devnet requests in minutes.",
  alternates: {
    canonical: webEnv.siteUrl
  },
  openGraph: {
    title: "Fyxvo — Solana devnet infrastructure",
    description:
      "Real Solana devnet infrastructure for funded relay traffic with honest operational visibility.",
    url: webEnv.siteUrl,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Fyxvo — Solana devnet infrastructure",
    description:
      "Real Solana devnet infrastructure for funded relay traffic with honest operational visibility.",
    images: [webEnv.socialImageUrl]
  }
};

const NAV_GROUPS = [
  {
    heading: "Start here",
    links: [
      {
        label: "Dashboard",
        href: "/dashboard",
        description:
          "Create and manage projects, fund balances, generate API keys, and monitor usage in one place."
      },
      {
        label: "Quickstart",
        href: "/docs",
        description:
          "Step-by-step guide from wallet connection to your first verified devnet request."
      },
      {
        label: "Pricing",
        href: "/pricing",
        description:
          "Per-request lamport pricing across three tiers with automatic volume discounts."
      },
      {
        label: "Assistant",
        href: "/assistant",
        description:
          "An AI assistant with full context about the Fyxvo platform and Solana development."
      },
      {
        label: "Playground",
        href: "/playground",
        description:
          "Send live JSON-RPC requests through the gateway directly from your browser."
      }
    ]
  },
  {
    heading: "Operate",
    links: [
      {
        label: "Status",
        href: "/status",
        description:
          "Live health for the control API, relay gateway, and protocol readiness indicators."
      },
      {
        label: "Alerts",
        href: "/alerts",
        description:
          "Configure low-balance thresholds and daily request alerts per project."
      },
      {
        label: "Analytics",
        href: "/analytics",
        description:
          "Request volume, latency distribution, error rates, and method-level breakdowns."
      },
      {
        label: "Explore",
        href: "/explore",
        description:
          "Browse the on-chain project registry and operator infrastructure from a public view."
      },
      {
        label: "Changelog",
        href: "/changelog",
        description:
          "Protocol updates, gateway releases, and infrastructure changes in chronological order."
      }
    ]
  }
];

export default async function HomePage() {
  const [statusResult, networkStats] = await Promise.all([
    getStatusSnapshot().catch(() => null),
    getNetworkStats().catch(() => null)
  ]);

  const apiOk = statusResult?.apiHealth.status === "ok";
  const gatewayOk = statusResult?.gatewayHealth.status === "ok";
  const protocolReady = Boolean(statusResult?.apiStatus.protocolReadiness?.ready);
  const gatewayLatency =
    statusResult?.gatewayStatus.metrics?.standard?.averageLatencyMs;
  const totalRequests =
    networkStats?.totalRequests ??
    statusResult?.gatewayStatus.metrics?.totals?.requests ??
    0;

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-[var(--fyxvo-border)] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="fyxvo-fade-in-up fyxvo-stagger-1 mb-8 inline-flex items-center gap-2 rounded-lg border border-[var(--fyxvo-brand)]/20 bg-[var(--fyxvo-brand-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--fyxvo-brand)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--fyxvo-brand)]" />
              Devnet private alpha
            </div>

            <h1 className="fyxvo-fade-in-up fyxvo-stagger-2 font-display text-5xl font-semibold leading-[1.06] tracking-tight text-[var(--fyxvo-text)] sm:text-6xl">
              Real Solana infrastructure{" "}
              <span className="fyxvo-text-gradient">for funded relay traffic.</span>
            </h1>

            <p className="fyxvo-fade-in-up fyxvo-stagger-3 mt-6 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
              Fyxvo is purpose-built devnet infrastructure that routes funded Solana relay traffic through a managed gateway. Every project is activated on chain, every request is logged, and every balance movement is verifiable. Nothing is simulated.
            </p>

            <div className="fyxvo-fade-in-up fyxvo-stagger-4 mt-8 flex flex-wrap items-center gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Program ID
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1.5">
                <Link
                  href={`https://explorer.solana.com/address/${liveDevnetState.programId}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-[var(--fyxvo-brand)] hover:underline break-all"
                >
                  {liveDevnetState.programId}
                </Link>
                <CopyButton value={liveDevnetState.programId} className="shrink-0" />
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/docs">Read the quickstart</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/pricing">Review pricing</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/assistant">Try the assistant</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/playground">Open playground</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Live status strip */}
      <section className="border-b border-[var(--fyxvo-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 py-3.5">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
              Live network
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${apiOk ? "bg-[var(--fyxvo-success)]" : "bg-[var(--fyxvo-warning)]"}`}
              />
              <span className="text-sm text-[var(--fyxvo-text-soft)]">
                Control plane{" "}
                <span
                  className={
                    apiOk
                      ? "text-[var(--fyxvo-success)]"
                      : "text-[var(--fyxvo-warning)]"
                  }
                >
                  {apiOk ? "operational" : "degraded"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${gatewayOk ? "bg-[var(--fyxvo-success)]" : "bg-[var(--fyxvo-warning)]"}`}
              />
              <span className="text-sm text-[var(--fyxvo-text-soft)]">
                Relay gateway{" "}
                <span
                  className={
                    gatewayOk
                      ? "text-[var(--fyxvo-success)]"
                      : "text-[var(--fyxvo-warning)]"
                  }
                >
                  {gatewayOk ? "operational" : "degraded"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${protocolReady ? "bg-[var(--fyxvo-success)]" : "bg-[var(--fyxvo-warning)]"}`}
              />
              <span className="text-sm text-[var(--fyxvo-text-soft)]">
                Protocol{" "}
                <span
                  className={
                    protocolReady
                      ? "text-[var(--fyxvo-success)]"
                      : "text-[var(--fyxvo-warning)]"
                  }
                >
                  {protocolReady ? "ready" : "attention"}
                </span>
              </span>
            </div>
            {typeof gatewayLatency === "number" && gatewayLatency > 0 ? (
              <span className="text-sm text-[var(--fyxvo-text-muted)]">
                {gatewayLatency.toFixed(0)}ms avg latency
              </span>
            ) : null}
            {totalRequests > 0 ? (
              <span className="text-sm text-[var(--fyxvo-text-muted)]">
                {totalRequests.toLocaleString()} requests
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

      {/* Navigation groups */}
      <section className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="mb-12">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                Platform
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
                Everything in one place
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
                Fyxvo is a complete devnet infrastructure platform. The pages below cover every surface from initial setup to ongoing operations.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-12 lg:grid-cols-2">
            {NAV_GROUPS.map((group) => (
              <FadeIn key={group.heading}>
                <div>
                  <p className="mb-6 font-display text-xl font-semibold text-[var(--fyxvo-text)]">
                    {group.heading}
                  </p>
                  <div className="space-y-3">
                    {group.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="fyxvo-hover-lift flex items-start gap-4 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5 transition-colors duration-150 hover:border-[var(--fyxvo-border-strong)]"
                      >
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-semibold text-[var(--fyxvo-text)]">
                          {link.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                          {link.description}
                        </p>
                      </div>
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--fyxvo-text-muted)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
          </div>
        </div>
      </section>

      {/* Newsletter signup */}
      <section className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                Stay close
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
                Stay close to the rollout
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
                Fyxvo sends product updates, infrastructure changes, and release notes. No noise, no marketing filler, only the things that matter to people running Solana devnet traffic.
              </p>
              <div className="mt-8">
                <NewsletterSignup />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
