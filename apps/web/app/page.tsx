import Link from "next/link";
import { Badge, Notice } from "@fyxvo/ui";
import { AnimatedStat } from "../components/animated-stat";
import { AnimatedTerminal } from "../components/animated-terminal";
import { CopyButton } from "../components/copy-button";
import { InteractiveDemo } from "../components/interactive-demo";
import { SocialLinkButtons } from "../components/social-links";
import { TrackedLinkButton } from "../components/tracked-link-button";
import { getStatusSnapshot } from "../lib/server-status";
import { getNetworkStats } from "../lib/api";
import { formatDuration, formatInteger, shortenAddress } from "../lib/format";
import { liveDevnetState } from "../lib/live-state";

const productSurfaces = [
  {
    href: "/dashboard",
    label: "Dashboard",
    title: "Launch control without fake polish",
    body: "Project activation, funding, release gates, and operational truth sit in one workspace instead of five disconnected tools.",
  },
  {
    href: "/projects",
    label: "Projects",
    title: "Every project gets a real workspace",
    body: "Switch between live projects, see funding posture, inspect traffic counts, and keep team context close to the work.",
  },
  {
    href: "/playground",
    label: "Playground",
    title: "Test the relay before you trust it",
    body: "Try live JSON-RPC requests, benchmark methods, save recipes, and debug request structure before rollout pressure hits.",
  },
  {
    href: "/assistant",
    label: "Assistant",
    title: "Help grounded in actual product state",
    body: "The assistant is connected to project workflows, docs, and request surfaces so teams get operationally useful answers.",
  },
  {
    href: "/status",
    label: "Status",
    title: "Public health that does not hide the sharp edges",
    body: "API, gateway, latency, and protocol readiness stay visible so teams know what is real and what still needs hardening.",
  },
  {
    href: "/support",
    label: "Support",
    title: "Direct path when something blocks launch",
    body: "Teams can move from docs to troubleshooting to founder contact without bouncing between unrelated product surfaces.",
  },
] as const;

const launchFlow = [
  {
    step: "01",
    title: "Connect a Solana wallet",
    body: "Authentication starts from the wallet your team already uses. No separate account silo, no fake preview mode.",
  },
  {
    step: "02",
    title: "Activate a project on chain",
    body: "Fyxvo prepares the activation transaction and the workspace reflects the project once devnet confirms it.",
  },
  {
    step: "03",
    title: "Fund the relay path",
    body: "Treasury-backed request credits make spend and throughput visible at the project level instead of hidden behind billing drift.",
  },
  {
    step: "04",
    title: "Issue a key and send real traffic",
    body: "Standard and priority relay paths, request logs, analytics, and alerts all begin from the same funded project state.",
  },
] as const;

const trustAddresses = [
  { label: "Program ID", value: liveDevnetState.programId },
  { label: "Protocol config", value: liveDevnetState.protocolConfig },
  { label: "Treasury", value: liveDevnetState.treasury },
  { label: "Operator registry", value: liveDevnetState.operatorRegistry },
] as const;

export default async function HomePage() {
  const [status, networkStats] = await Promise.all([
    getStatusSnapshot(),
    getNetworkStats().catch(() => null),
  ]);

  const apiOk = status.apiHealth.status === "ok";
  const gatewayOk = status.gatewayHealth.status === "ok";
  const protocolReady = Boolean(status.apiStatus.protocolReadiness?.ready);
  const gatewayLatency = status.gatewayStatus.metrics?.standard?.averageLatencyMs;
  const totalRequests = networkStats?.totalRequests ?? status.gatewayStatus.metrics?.totals?.requests ?? 0;
  const totalProjects = networkStats?.totalProjects ?? 0;
  const totalApiKeys = networkStats?.totalApiKeys ?? 0;
  const totalSolFees = networkStats?.totalSolFees ? Number(BigInt(networkStats.totalSolFees)) / 1_000_000_000 : null;

  const statusCards = [
    {
      label: "Requests routed",
      value:
        totalRequests > 0 ? (
          <AnimatedStat value={totalRequests} formatter={formatInteger} />
        ) : (
          "Live"
        ),
      detail: "Traffic comes from the same stack shown on the public status page.",
    },
    {
      label: "Projects onboarded",
      value:
        totalProjects > 0 ? (
          <AnimatedStat value={totalProjects} formatter={formatInteger} />
        ) : (
          "2"
        ),
      detail: "Project workspaces stay close to funding, API keys, and request behavior.",
    },
    {
      label: "Gateway latency",
      value: typeof gatewayLatency === "number" && gatewayLatency > 0 ? formatDuration(gatewayLatency) : "Live",
      detail: "Priority and standard relay paths are measured continuously.",
    },
    {
      label: "Fees collected",
      value:
        totalSolFees !== null && totalSolFees > 0 ? (
          <AnimatedStat value={totalSolFees} formatter={(value) => `${value.toFixed(4)} SOL`} />
        ) : (
          "Tracked"
        ),
      detail: totalApiKeys > 0 ? `${formatInteger(totalApiKeys)} active API keys across the workspace.` : "Protocol fees stay visible even before withdrawal handling exists.",
    },
  ];

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden border-b border-[var(--fyxvo-border)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="fyxvo-orbit absolute left-[6%] top-24 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.18),transparent_65%)] blur-2xl" />
          <div className="fyxvo-orbit-delayed absolute right-[10%] top-12 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.2),transparent_65%)] blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:px-8 lg:py-24">
          <div className="relative z-[1]">
            <Badge tone="brand">Live on Solana devnet</Badge>
            <h1 className="mt-6 max-w-4xl font-display text-5xl font-semibold leading-[0.97] tracking-[-0.04em] text-[var(--fyxvo-text)] sm:text-6xl xl:text-7xl">
              Funded relay infrastructure
              <span className="block fyxvo-text-gradient">that actually matches the brand.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--fyxvo-text-muted)]">
              Fyxvo is the control plane for Solana teams that want wallet-auth access, on-chain funded request flow,
              API key management, analytics, alerts, and public trust surfaces in one product instead of a patchwork.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <TrackedLinkButton
                href="/dashboard"
                eventName="landing_cta_clicked"
                eventSource="home-primary-dashboard"
                size="lg"
              >
                Open dashboard
              </TrackedLinkButton>
              <TrackedLinkButton
                href="/docs"
                eventName="landing_cta_clicked"
                eventSource="home-primary-docs"
                size="lg"
                variant="secondary"
              >
                Read quickstart
              </TrackedLinkButton>
              <TrackedLinkButton
                href="/contact"
                eventName="landing_cta_clicked"
                eventSource="home-primary-contact"
                size="lg"
                variant="ghost"
              >
                Talk to the founder
              </TrackedLinkButton>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <SocialLinkButtons />
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                { label: "API", ok: apiOk, value: apiOk ? "Operational" : "Attention" },
                { label: "Gateway", ok: gatewayOk, value: gatewayOk ? "Operational" : "Attention" },
                { label: "Protocol", ok: protocolReady, value: protocolReady ? "Ready" : "Reviewing" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--fyxvo-border)] bg-[color-mix(in_srgb,var(--fyxvo-panel)_76%,transparent)] p-4"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                    <span className={`h-2 w-2 rounded-full ${item.ok ? "bg-[var(--fyxvo-success)]" : "bg-[var(--fyxvo-warning)]"}`} />
                    {item.label}
                  </div>
                  <p className="mt-3 text-lg font-semibold text-[var(--fyxvo-text)]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-[1]">
            <div className="fyxvo-hero-panel relative overflow-hidden rounded-[2rem] border border-[var(--fyxvo-border)] p-4 shadow-[0_32px_100px_color-mix(in_srgb,var(--fyxvo-brand)_16%,transparent)] sm:p-5">
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--fyxvo-border)] bg-black/40 px-4 py-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--fyxvo-brand-soft)]">
                    Live control surface
                  </p>
                  <p className="mt-1 text-sm text-[var(--fyxvo-text-soft)]">
                    Wallet auth, project funding, relay traffic, and status truth in one place.
                  </p>
                </div>
                <Link
                  href="/projects"
                  className="rounded-full border border-[var(--fyxvo-border)] px-3 py-1.5 text-xs font-semibold text-[var(--fyxvo-text-soft)] transition hover:text-[var(--fyxvo-text)]"
                >
                  View projects
                </Link>
              </div>

              <AnimatedTerminal />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {statusCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-[var(--fyxvo-border)] bg-[color-mix(in_srgb,var(--fyxvo-panel)_82%,transparent)] p-4"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fyxvo-text-muted)]">
                      {card.label}
                    </p>
                    <div className="mt-3 text-2xl font-semibold text-[var(--fyxvo-text)]">{card.value}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">{card.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] bg-[color-mix(in_srgb,var(--fyxvo-panel-soft)_64%,transparent)]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {launchFlow.map((item) => (
            <div key={item.step} className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fyxvo-brand-soft)]">
                Step {item.step}
              </p>
              <h2 className="mt-3 text-lg font-semibold text-[var(--fyxvo-text)]">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--fyxvo-brand-soft)]">
              Product surfaces
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-5xl">
              One frontend, all the missing pieces filled in.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
              The frontend now reflects the actual product map: dashboard, projects, playground, assistant, support,
              trust pages, and status surfaces all feel like the same brand and product.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {productSurfaces.map((surface) => (
              <Link
                key={surface.href}
                href={surface.href}
                className="group rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--fyxvo-panel)_90%,transparent),color-mix(in_srgb,var(--fyxvo-panel-soft)_88%,transparent))] p-6 shadow-[0_24px_64px_color-mix(in_srgb,var(--fyxvo-brand)_8%,transparent)] transition hover:-translate-y-1 hover:border-[var(--fyxvo-brand)]/30"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fyxvo-brand-soft)]">
                  {surface.label}
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
                  {surface.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--fyxvo-text-muted)]">{surface.body}</p>
                <p className="mt-5 text-sm font-semibold text-[var(--fyxvo-text)] transition group-hover:text-[var(--fyxvo-brand-soft)]">
                  Open {surface.label}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--fyxvo-border)] bg-[color-mix(in_srgb,var(--fyxvo-panel-soft)_56%,transparent)] py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-8">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--fyxvo-brand-soft)]">
                Operational truth
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
                The brand says confidence.
                <span className="block text-[var(--fyxvo-text-soft)]">The product still shows its work.</span>
              </h2>
            </div>

            <Notice tone="warning" title="Honest current state">
              Mainnet is not launched yet. The public product is a live devnet private alpha with real request flow,
              real funding posture, and visible launch gates.
            </Notice>

            <Notice tone="brand" title="What is already live">
              Wallet authentication, project activation, SOL funding, API keys, analytics, alerts, assistant workflows,
              docs, and public trust surfaces are already in the stack today.
            </Notice>
          </div>

          <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--fyxvo-panel)_90%,transparent),color-mix(in_srgb,var(--fyxvo-panel-strong)_96%,black_4%))] p-6 shadow-[0_30px_90px_color-mix(in_srgb,var(--fyxvo-brand)_10%,transparent)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fyxvo-brand-soft)]">
                  Live addresses
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">Devnet deployment map</h3>
              </div>
              <Link
                href="/security"
                className="rounded-full border border-[var(--fyxvo-border)] px-3 py-1.5 text-xs font-semibold text-[var(--fyxvo-text-soft)] transition hover:text-[var(--fyxvo-text)]"
              >
                Security
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {trustAddresses.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]/70 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                      {item.label}
                    </p>
                    <p className="mt-1 truncate font-mono text-sm text-[var(--fyxvo-text)]">{shortenAddress(item.value, 8, 8)}</p>
                  </div>
                  <CopyButton value={item.value} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--fyxvo-brand-soft)]">
                Guided flow
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-5xl">
                This is what onboarding into Fyxvo actually feels like.
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
                The interactive sequence mirrors the real product path from project activation to first request,
                without hiding the operational context behind generic marketing copy.
              </p>
            </div>
            <Link
              href="/docs#quickstart"
              className="text-sm font-semibold text-[var(--fyxvo-brand-soft)] transition hover:text-[var(--fyxvo-text)]"
            >
              Read the quickstart
            </Link>
          </div>

          <InteractiveDemo />
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-[var(--fyxvo-border)] bg-[linear-gradient(135deg,rgba(251,191,36,0.08),rgba(249,115,22,0.08),rgba(23,16,11,0.92))] p-8 shadow-[0_30px_100px_color-mix(in_srgb,var(--fyxvo-brand)_14%,transparent)] lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--fyxvo-brand-soft)]">
                Ready to move
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
                Start with the dashboard.
                <span className="block text-[var(--fyxvo-text-soft)]">Keep the status page open.</span>
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
                That is the Fyxvo posture in one sentence: move fast, but keep the operational truth visible the whole time.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <TrackedLinkButton
                href="/dashboard"
                eventName="landing_cta_clicked"
                eventSource="home-footer-dashboard"
                size="lg"
              >
                Open dashboard
              </TrackedLinkButton>
              <TrackedLinkButton
                href="/status"
                eventName="landing_cta_clicked"
                eventSource="home-footer-status"
                size="lg"
                variant="secondary"
              >
                View status
              </TrackedLinkButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
