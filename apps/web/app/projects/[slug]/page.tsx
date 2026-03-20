"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Notice,
  ProgressBar,
  Table,
  type TableColumn,
} from "@fyxvo/ui";
import dynamic from "next/dynamic";
const BarChartCard = dynamic(() => import("../../../components/charts").then((m) => ({ default: m.BarChartCard })), { ssr: false, loading: () => <div className="h-56 animate-pulse rounded-2xl bg-[var(--fyxvo-panel-soft)]" /> });
import { CopyButton } from "../../../components/copy-button";
import { GatewayHealthCard } from "../../../components/gateway-health";
import { SectionErrorBoundary } from "../../../components/section-error-boundary";
import { OnboardingChecklist } from "../../../components/onboarding-checklist";
import { PageHeader } from "../../../components/page-header";
import { AuthGate } from "../../../components/state-panels";
import { usePortal } from "../../../components/portal-provider";
import { fundingTrend } from "../../../lib/sample-data";
import { formatDuration, formatInteger, shortenAddress } from "../../../lib/format";
import { webEnv } from "../../../lib/env";
import { getProjectActivity } from "../../../lib/api";
import type { ProjectAnalytics } from "../../../lib/types";

const requestColumns: readonly TableColumn<ProjectAnalytics["recentRequests"][number]>[] = [
  {
    key: "route",
    header: "Route",
    cell: (request) => (
      <div>
        <div className="font-medium text-[var(--fyxvo-text)]">{request.route}</div>
        <div className="text-xs uppercase tracking-[0.12em] text-[var(--fyxvo-text-muted)]">
          {request.method}
        </div>
      </div>
    ),
  },
  {
    key: "service",
    header: "Service",
    cell: (request) => request.service,
  },
  {
    key: "status",
    header: "Status",
    cell: (request) => (
      <Badge tone={request.statusCode < 400 ? "success" : "warning"}>{request.statusCode}</Badge>
    ),
  },
  {
    key: "duration",
    header: "Latency",
    cell: (request) => formatDuration(request.durationMs),
  },
];

export default function ProjectPage({
  params,
}: {
  readonly params: { slug: string };
}) {
  const portal = usePortal();
  const [activeTab, setActiveTab] = useState<"overview" | "activity">("overview");
  const [activityLog, setActivityLog] = useState<Array<{ id: string; action: string; details: Record<string, unknown> | null; actorWallet: string | null; createdAt: string }>>([]);
  const [activityLoaded, setActivityLoaded] = useState(false);

  const project =
    portal.projects.find((item) => item.slug === params.slug) ??
    portal.selectedProject ??
    portal.projects[0] ??
    null;

  useEffect(() => {
    if (!portal.token || !project) return;
    getProjectActivity(project.id, portal.token)
      .then((data) => {
        setActivityLog(data.items);
        setActivityLoaded(true);
      })
      .catch(() => {
        setActivityLoaded(true);
      });
  }, [portal.token, project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) {
    return (
      <AuthGate
        title="Connect a wallet to resolve a project."
        body="Project routes resolve against the authenticated workspace when a wallet session is active."
      />
    );
  }

  const availableSolCredits = (() => {
    try {
      return BigInt(portal.onchainSnapshot.balances?.availableSolCredits ?? "0");
    } catch {
      return 0n;
    }
  })();
  const totalSolFunded = (() => {
    try {
      return BigInt(portal.onchainSnapshot.balances?.totalSolFunded ?? "0");
    } catch {
      return 0n;
    }
  })();
  const hasLowBalance = availableSolCredits > 0n && availableSolCredits < 100_000_000n;
  const rateLimitedCount =
    portal.projectAnalytics.statusCodes.find((entry) => entry.statusCode === 429)?.count ?? 0;
  const reservePercentage = Math.min(
    100,
    Math.round((portal.onchainSnapshot.treasurySolBalance / 25_000_000_000) * 100)
  );
  const projectUrl = `${webEnv.siteUrl}/projects/${project.slug}`;
  const rpcEndpoint = `${webEnv.gatewayBaseUrl}/rpc`;

  const projectReadyStates = [
    {
      label: "Activated",
      ready: portal.onchainSnapshot.projectAccountExists,
      body: "The on-chain project account exists and can accept funded relay traffic.",
    },
    {
      label: "Funded",
      ready: (project._count?.fundingRequests ?? 0) > 0,
      body: "At least one funding coordinate has been prepared or confirmed for this project.",
    },
    {
      label: "Keys issued",
      ready: (project._count?.apiKeys ?? 0) > 0,
      body: "An API key exists for sending standard or priority relay traffic.",
    },
    {
      label: "Traffic observed",
      ready: portal.projectAnalytics.totals.requestLogs > 0,
      body: "Request logs are already landing, so analytics and status surfaces are reacting.",
    },
  ] as const;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Project"
        title={project.name}
        description={
          project.description ??
          "This project is ready for funded devnet traffic, signed funding flows, and workspace-level analytics."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{project.slug}</Badge>
            {project.environment && project.environment !== "development" ? (
              <Badge tone={project.environment === "production" ? "danger" : "warning"}>
                {project.environment}
              </Badge>
            ) : (
              <Badge tone="neutral">development</Badge>
            )}
            {project.starred ? (
              <Badge tone="brand">★ starred</Badge>
            ) : null}
            {project.isPublic && project.publicSlug ? (
              <a
                href={`/p/${project.publicSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-xs text-[var(--fyxvo-brand)] hover:bg-brand-500/20 transition-colors"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
                Public
              </a>
            ) : null}
            {project.githubUrl ? (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-2 py-0.5 text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </a>
            ) : null}
            <Badge tone={project.ownerId === portal.user?.id ? "success" : "neutral"}>
              {project.ownerId === portal.user?.id ? "owner session" : "workspace view"}
            </Badge>
          </div>
        }
      />

      {project.notes ? (
        <section>
          <details className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]">
            <summary className="cursor-pointer select-none px-5 py-4 text-sm font-medium text-[var(--fyxvo-text)]">
              Project notes
            </summary>
            <div className="border-t border-[var(--fyxvo-border)] px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                {project.notes}
              </p>
            </div>
          </details>
        </section>
      ) : null}

      {portal.walletPhase !== "authenticated" ? (
        <AuthGate body="Connect a wallet to load real API keys, analytics, and on-chain balances for this project." />
      ) : null}

      {portal.walletPhase === "authenticated" ? (
        <OnboardingChecklist
          projectId={project.id}
          projectSlug={project.slug}
          onchain={portal.onchainSnapshot}
          apiKeys={portal.apiKeys}
          requestCount={portal.projectAnalytics.totals.requestLogs}
        />
      ) : null}

      <div className="flex gap-1 border-b border-[var(--fyxvo-border)]">
        {(["overview", "activity"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "border-b-2 border-brand-500 text-[var(--fyxvo-text)]"
                : "text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "activity" && (
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Recent actions across this project</CardDescription>
          </CardHeader>
          <CardContent>
            {!activityLoaded ? (
              <p className="text-sm text-[var(--fyxvo-text-muted)]">Loading…</p>
            ) : activityLog.length === 0 ? (
              <p className="text-sm text-[var(--fyxvo-text-muted)]">No activity yet.</p>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-[var(--fyxvo-border)]" />
                <div className="space-y-4">
                  {activityLog.map((entry) => (
                    <div key={entry.id} className="relative">
                      <div className="absolute -left-4 top-1 h-2 w-2 rounded-full bg-brand-500" />
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[var(--fyxvo-text)]">{entry.action.replace(/\./g, " ")}</span>
                          {entry.actorWallet && (
                            <span className="font-mono text-xs text-[var(--fyxvo-text-muted)]">{entry.actorWallet}</span>
                          )}
                        </div>
                        <span className="text-xs text-[var(--fyxvo-text-muted)]">
                          {new Date(entry.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "overview" && (
      <><section className="grid gap-4">
        {availableSolCredits === 0n ? (
          <Notice tone="warning" title="No spendable project balance">
            The gateway will reject funded relay usage until this project has confirmed SOL credits
            on chain. Activate the project, fund it, then generate or reuse an API key.
          </Notice>
        ) : null}
        {hasLowBalance ? (
          <Notice tone="warning" title="Low spendable balance">
            This project still has credits, but the remaining SOL buffer is low. Top up before the
            team leans on priority traffic or sustained relay usage.
          </Notice>
        ) : null}
        {rateLimitedCount > 0 ? (
          <Notice tone="neutral" title="Rate-limit pressure detected">
            This project has seen {formatInteger(rateLimitedCount)} rate-limited responses. Review
            traffic shape and funding posture before widening team usage.
          </Notice>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Project PDA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="break-all font-mono text-xs leading-6 text-[var(--fyxvo-text-soft)]">
              {project.onChainProjectPda}
            </p>
          </CardContent>
        </Card>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Owner wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm text-[var(--fyxvo-text-soft)]">
              {shortenAddress(project.owner.walletAddress, 8, 8)}
            </p>
          </CardContent>
        </Card>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-semibold text-[var(--fyxvo-text)]">
              {formatInteger(portal.projectAnalytics.totals.requestLogs)}
            </p>
          </CardContent>
        </Card>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Spendable SOL</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-semibold text-[var(--fyxvo-text)]">
              {Number(availableSolCredits) / 1_000_000_000 > 0
                ? `${(Number(availableSolCredits) / 1_000_000_000).toFixed(3)} SOL`
                : "0 SOL"}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Treasury readiness</CardTitle>
            <CardDescription>
              The project treasury shows how much runway is left before standard relay capacity
              should be topped up again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Treasury SOL balance
              </div>
              <div className="mt-3 font-display text-4xl font-semibold text-[var(--fyxvo-text)]">
                {(portal.onchainSnapshot.treasurySolBalance / 1_000_000_000).toFixed(2)} SOL
              </div>
            </div>
            <ProgressBar value={reservePercentage} label="Reserve headroom" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  Total funded
                </div>
                <div className="mt-2 font-display text-2xl font-semibold text-[var(--fyxvo-text)]">
                  {(Number(totalSolFunded) / 1_000_000_000).toFixed(3)} SOL
                </div>
              </div>
              <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  Rate limits observed
                </div>
                <div className="mt-2 font-display text-2xl font-semibold text-[var(--fyxvo-text)]">
                  {formatInteger(rateLimitedCount)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <SectionErrorBoundary>
          <BarChartCard
            title="Funding rhythm"
            description="Reserve changes across the week so project owners can top up before gateway costs start to compete with priority traffic."
            points={fundingTrend}
          />
        </SectionErrorBoundary>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Project readiness</CardTitle>
            <CardDescription>
              Activation, funding, API keys, and observed traffic in one view so the next action is
              obvious.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {projectReadyStates.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-[var(--fyxvo-text)]">{item.label}</div>
                  <Badge tone={item.ready ? "success" : "neutral"}>
                    {item.ready ? "ready" : "next"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>RPC endpoint</CardTitle>
            <CardDescription>
              Copy this endpoint and use your API key to start sending requests immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
              <div className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                Standard RPC
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="font-mono text-sm text-[var(--fyxvo-text)]">{rpcEndpoint}</p>
                <CopyButton value={rpcEndpoint} className="shrink-0" />
              </div>
            </div>
            <GatewayHealthCard />
            <Notice tone="neutral" title="Current access model">
              The owner wallet is the live control point today. Admin sessions can review broader
              platform state, but collaborator roles are a prepared next step, not a shipped claim.
            </Notice>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/funding">Open funding</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/api-keys">Manage API keys</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/analytics">View analytics</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <CopyButton value={projectUrl} label="Copy project URL" />
              <CopyButton value={webEnv.statusPageUrl} label="Copy status URL" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Template-specific getting started */}
      {project.templateType ? (
        <section>
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Getting started</CardTitle>
              <CardDescription>
                {project.templateType === "defi"
                  ? "Quick start for DeFi priority relay — use these snippets to send your first swap."
                  : project.templateType === "indexing"
                    ? "Quick start for on-chain indexing — stream program accounts with this example."
                    : "Quick start for your Solana project — copy and run these examples."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.templateType === "defi" ? (
                <>
                  <p className="text-sm text-[var(--fyxvo-text-soft)]">
                    Send a priority relay request. Requires a key with both <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs">rpc:request</code> and <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs">priority:relay</code> scopes.
                  </p>
                  <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                    <div className="flex items-center justify-between gap-2 pb-2">
                      <span className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">curl — priority relay</span>
                      <CopyButton value={`curl -X POST ${rpcEndpoint} \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Fyxvo-Priority: true" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot","params":[]}'`} />
                    </div>
                    <pre className="overflow-x-auto font-mono text-xs leading-6 text-[var(--fyxvo-text-soft)]">{`curl -X POST ${rpcEndpoint} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "X-Fyxvo-Priority: true" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot","params":[]}'`}</pre>
                  </div>
                </>
              ) : project.templateType === "indexing" ? (
                <>
                  <p className="text-sm text-[var(--fyxvo-text-soft)]">
                    Fetch all accounts owned by a program. Requires a key with <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs">rpc:request</code> scope.
                  </p>
                  <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                    <div className="flex items-center justify-between gap-2 pb-2">
                      <span className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">curl — getProgramAccounts</span>
                      <CopyButton value={`curl -X POST ${rpcEndpoint} \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"getProgramAccounts","params":["YOUR_PROGRAM_ID",{"encoding":"base64","dataSlice":{"offset":0,"length":64}}]}'`} />
                    </div>
                    <pre className="overflow-x-auto font-mono text-xs leading-6 text-[var(--fyxvo-text-soft)]">{`curl -X POST ${rpcEndpoint} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getProgramAccounts",
  "params":["YOUR_PROGRAM_ID",
    {"encoding":"base64","dataSlice":{"offset":0,"length":64}}]}'`}</pre>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-[var(--fyxvo-text-soft)]">
                    Send your first RPC request. Requires a key with <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs">rpc:request</code> scope.
                  </p>
                  <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                    <div className="flex items-center justify-between gap-2 pb-2">
                      <span className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">curl — getSlot</span>
                      <CopyButton value={`curl -X POST ${rpcEndpoint} \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot","params":[]}'`} />
                    </div>
                    <pre className="overflow-x-auto font-mono text-xs leading-6 text-[var(--fyxvo-text-soft)]">{`curl -X POST ${rpcEndpoint} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot","params":[]}'`}</pre>
                  </div>
                </>
              )}
              <p className="text-xs text-[var(--fyxvo-text-muted)]">
                Replace <code className="font-mono">YOUR_API_KEY</code> with a key from the API keys page. Keys must be active and have the correct scopes.
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Status code distribution</CardTitle>
            <CardDescription>
              Small slices of 402, 429, and 503 traffic reveal reserve pressure and failover
              conditions long before totals look alarming.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {portal.projectAnalytics.statusCodes.length === 0 ? (
              <p className="text-sm text-[var(--fyxvo-text-muted)]">
                No requests recorded yet. Send traffic to populate this chart.
              </p>
            ) : (
              portal.projectAnalytics.statusCodes.map((entry) => (
                <div
                  key={entry.statusCode}
                  className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-[var(--fyxvo-text)]">{entry.statusCode}</span>
                    <span className="text-[var(--fyxvo-text-muted)]">
                      {formatInteger(entry.count)} events
                    </span>
                  </div>
                  <ProgressBar
                    value={
                      portal.projectAnalytics.totals.requestLogs > 0
                        ? (entry.count / portal.projectAnalytics.totals.requestLogs) * 100
                        : 0
                    }
                    className="mt-3"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Table
          columns={requestColumns}
          rows={portal.projectAnalytics.recentRequests}
          getRowKey={(request) => request.id}
        />
      </section>
      </>
      )}
    </div>
  );
}
