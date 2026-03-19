"use client";

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
  const project =
    portal.projects.find((item) => item.slug === params.slug) ??
    portal.selectedProject ??
    portal.projects[0] ??
    null;

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
            <Badge tone={project.ownerId === portal.user?.id ? "success" : "neutral"}>
              {project.ownerId === portal.user?.id ? "owner session" : "workspace view"}
            </Badge>
          </div>
        }
      />

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

      <section className="grid gap-4">
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

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
    </div>
  );
}
