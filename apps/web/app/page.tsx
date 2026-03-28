import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@fyxvo/ui";
import { AddressLink } from "../components/address-link";
import { CopyButton } from "../components/copy-button";
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
    "Fyxvo is building decentralized Solana RPC and relay infrastructure, with a managed devnet network live today as the first phase toward open operator participation.",
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
  const totalRequests = networkStats?.totalRequests ?? gatewayHealth?.metrics?.totals?.requests ?? 0;
  const standardLatency = gatewayHealth?.metrics?.standard?.averageLatencyMs ?? null;
  const priorityLatency = gatewayHealth?.metrics?.priority?.averageLatencyMs ?? null;
  const commit = formatShortCommit(apiStatus?.commit ?? apiHealth?.commit ?? gatewayHealth?.commit);

  return (
    <div>
      <section className="border-b border-[var(--fyxvo-border)] px-4 py-24 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--fyxvo-brand)]/30 bg-[var(--fyxvo-panel)] px-4 py-1.5 text-sm text-[var(--fyxvo-brand)]">
              <span className="h-2 w-2 rounded-full bg-[var(--fyxvo-brand)]" />
              Devnet private alpha
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-bold tracking-tight text-[var(--fyxvo-text)] sm:text-6xl">
              Building decentralized Solana RPC and relay infrastructure.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--fyxvo-text-soft)]">
              Fyxvo is live on devnet today with managed infrastructure, wallet-authenticated
              project funding, and a real relay stack. That managed network is the first operating
              phase on the path toward an open operator network for decentralized Solana RPC and
              relay infrastructure.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard">Open workspace</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/docs">Read docs</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/pricing">See pricing</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/playground">Open playground</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  Live network
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--fyxvo-text)]">
                  Current operating posture
                </h2>
              </div>
              {commit ? (
                <span className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1 text-xs text-[var(--fyxvo-text-muted)]">
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
                  className="flex items-center justify-between rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
                >
                  <span className="text-sm text-[var(--fyxvo-text-soft)]">{item.label}</span>
                  <span className="flex items-center gap-2 text-sm font-medium text-[var(--fyxvo-text)]">
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

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Requests observed
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                  {totalRequests.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Connected projects
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                  {networkStats?.totalProjects ?? 0}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Standard latency
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                  {typeof standardLatency === "number" ? `${standardLatency}ms` : "Awaiting traffic"}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Priority latency
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                  {typeof priorityLatency === "number" ? `${priorityLatency}ms` : "Awaiting traffic"}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/status"
                className="text-sm font-medium text-[var(--fyxvo-brand)] transition-colors hover:text-[var(--fyxvo-text)]"
              >
                View full status
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              What ships today
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
              Built around project-level control instead of anonymous endpoint access
            </h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-brand)]">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[var(--fyxvo-text)]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              End-to-end flow
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
              From wallet signature to funded relay traffic
            </h2>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-5">
            {OPERATING_STEPS.map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                  {item.step}
                </p>
                <h3 className="mt-4 text-lg font-semibold text-[var(--fyxvo-text)]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                On-chain contract
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
                Live devnet addresses
              </h2>
              <p className="mt-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                These protocol addresses are part of the current live deployment and are also used
                by the public status surface.
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
                className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
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

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8 sm:p-10">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            Start here
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
            Build against the real product contract, not a generic RPC landing page
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
            The quickest path is to connect a wallet, create a project, prepare a funding
            transaction, issue an API key, and route your first request through `rpc.fyxvo.com`.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">Open workspace</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/docs">Read the quickstart</Link>
            </Button>
          </div>
          <div className="mt-10 max-w-2xl rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <p className="text-sm font-medium text-[var(--fyxvo-text)]">Newsletter</p>
            <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
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
