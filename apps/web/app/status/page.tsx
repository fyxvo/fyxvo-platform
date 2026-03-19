import type { Metadata } from "next";
import Link from "next/link";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Notice,
} from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";
import { getStatusSnapshot } from "../../lib/server-status";
import { webEnv } from "../../lib/env";
import { formatDuration } from "../../lib/format";
import { liveDevnetState } from "../../lib/live-state";
import { StatusRefreshIndicator } from "../../components/status-refresh-indicator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status — Fyxvo",
  description:
    "Live service readiness for the Fyxvo devnet control plane, gateway, and on-chain protocol accounts.",
  alternates: {
    canonical: webEnv.statusPageUrl,
  },
};

function percentage(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(1)}%`
    : "Unavailable";
}

export default async function StatusPage() {
  const status = await getStatusSnapshot();
  const readiness = status.apiStatus.protocolReadiness;
  const gatewayMetrics = status.gatewayStatus.metrics;
  const healthy =
    status.apiHealth.status === "ok" &&
    status.gatewayHealth.status === "ok" &&
    Boolean(readiness?.ready);

  const notes = [
    {
      title: "SOL path is live on devnet",
      body: "Wallet-authenticated project activation, SOL funding, funded gateway access, request logging, worker rollups, and analytics are operating against the live devnet program.",
      tone: "success" as const,
    },
    {
      title: "USDC remains configuration-gated",
      body: status.apiStatus.acceptedAssets?.usdcEnabled
        ? "USDC has been explicitly enabled for this deployment."
        : "The on-chain asset path exists, but the public product keeps USDC disabled until you intentionally switch it on in runtime config.",
      tone: status.apiStatus.acceptedAssets?.usdcEnabled
        ? ("warning" as const)
        : ("neutral" as const),
    },
    {
      title: "Managed infrastructure is active",
      body: "The current launch topology uses Fyxvo-managed operator infrastructure. It is described as managed infrastructure, not as an open external operator marketplace.",
      tone: "neutral" as const,
    },
    {
      title: "Gateway keys are scope-enforced",
      body: "Standard relay requires rpc:request. Priority relay requires both rpc:request and priority:relay. Under-scoped keys are rejected instead of silently receiving broad access.",
      tone: "neutral" as const,
    },
    {
      title: "Authority control is still single-signer",
      body:
        status.apiStatus.authorityPlan?.mode === "single-signer"
          ? "The live devnet stack still uses single-signer protocol control. The repo now exposes separate protocol, pause, and upgrade authority configuration to prepare the governed migration path."
          : "The configured authority plan is no longer single-signer, but mainnet claims should still wait for on-chain governance changes.",
      tone:
        status.apiStatus.authorityPlan?.mode === "single-signer"
          ? ("warning" as const)
          : ("neutral" as const),
    },
  ];

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        eyebrow="Status"
        title="Live condition across the hosted control plane, relay, and protocol."
        description="This surface is the public truth layer for the current devnet launch. It shows what is live today, what is still managed by Fyxvo, and what remains intentionally gated so early teams can evaluate the product honestly."
      />

      <Notice tone="neutral" title="Share this during evaluation">
        Use this page with <Link href="/docs">the quickstart</Link> when a teammate needs the live
        condition, and use <Link href="/contact">contact</Link> when the next step is founder
        follow-up or support instead of more self-serve debugging.
      </Notice>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>System status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge tone={healthy ? "success" : "warning"}>
              {healthy ? "healthy" : "attention needed"}
            </Badge>
            <StatusRefreshIndicator />
          </CardContent>
        </Card>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>RPC latency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge tone="brand">
              {typeof gatewayMetrics?.standard?.averageLatencyMs === "number"
                ? formatDuration(gatewayMetrics.standard.averageLatencyMs)
                : "Unavailable"}
            </Badge>
            <p className="text-sm text-[var(--fyxvo-text-muted)]">
              Standard path average latency from the live gateway metrics surface.
            </p>
          </CardContent>
        </Card>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Gateway success rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge tone="success">{percentage(gatewayMetrics?.standard?.successRate)}</Badge>
            <p className="text-sm text-[var(--fyxvo-text-muted)]">
              Live success rate reported by the hosted relay.
            </p>
          </CardContent>
        </Card>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Protocol readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge tone={readiness?.ready ? "success" : "warning"}>
              {readiness?.ready ? "ready" : "needs attention"}
            </Badge>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Hosted services</CardTitle>
            <CardDescription>
              These values come from the live API and gateway status endpoints. They are not static
              copy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                    API
                  </div>
                  <div className="mt-2 text-sm text-[var(--fyxvo-text)]">
                    Cluster {status.apiStatus.solanaCluster}
                  </div>
                </div>
                <Badge tone={status.apiHealth.status === "ok" ? "success" : "warning"}>
                  {status.apiHealth.status}
                </Badge>
              </div>
              <div className="mt-3 text-sm text-[var(--fyxvo-text-muted)]">
                Database configured:{" "}
                {String(status.apiStatus.dependencies?.databaseConfigured ?? false)}. Redis
                configured: {String(status.apiStatus.dependencies?.redisConfigured ?? false)}.
              </div>
              <div className="mt-3 text-xs uppercase tracking-[0.16em]">
                <Link
                  href={new URL("/health", webEnv.apiBaseUrl).toString()}
                  className="text-[var(--fyxvo-brand)] hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
                >
                  API health endpoint
                </Link>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                    Gateway
                  </div>
                  <div className="mt-2 text-sm text-[var(--fyxvo-text)]">
                    {status.gatewayStatus.nodeCount ?? 0} upstream nodes
                  </div>
                </div>
                <Badge tone={status.gatewayHealth.status === "ok" ? "success" : "warning"}>
                  {status.gatewayHealth.status}
                </Badge>
              </div>
              <div className="mt-3 text-sm text-[var(--fyxvo-text-muted)]">
                Success rate {percentage(gatewayMetrics?.standard?.successRate)}. Priority latency{" "}
                {typeof gatewayMetrics?.priority?.averageLatencyMs === "number"
                  ? formatDuration(gatewayMetrics.priority.averageLatencyMs)
                  : "Unavailable"}
                .
              </div>
              <div className="mt-3 text-sm text-[var(--fyxvo-text-muted)]">
                Scope enforcement{" "}
                {status.gatewayStatus.scopeEnforcement?.enabled ? "enabled" : "unavailable"}.
                Standard requires{" "}
                {status.gatewayStatus.scopeEnforcement?.standardRequiredScopes?.join(", ") ??
                  "Unavailable"}
                .
              </div>
              <div className="mt-3 text-xs uppercase tracking-[0.16em]">
                <Link
                  href={new URL("/v1/status", webEnv.gatewayBaseUrl).toString()}
                  className="text-[var(--fyxvo-brand)] hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
                >
                  Gateway status endpoint
                </Link>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  Public links
                </div>
                <div className="mt-2 space-y-2 text-sm text-[var(--fyxvo-text)]">
                  <p className="break-all">{webEnv.apiBaseUrl}</p>
                  <p className="break-all">{webEnv.gatewayBaseUrl}</p>
                  <p className="break-all">{webEnv.statusPageUrl}</p>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  Accepted assets
                </div>
                <div className="mt-2 space-y-2 text-sm text-[var(--fyxvo-text)]">
                  <p>SOL is live</p>
                  <p>
                    USDC is {status.apiStatus.acceptedAssets?.usdcEnabled ? "enabled" : "gated"}
                  </p>
                  <p className="break-all">
                    {status.apiStatus.acceptedAssets?.usdcMintAddress ?? "No USDC mint configured"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={new URL("/health", webEnv.apiBaseUrl).toString()}
                target="_blank"
                className="text-sm text-[var(--fyxvo-brand)] hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
              >
                Open API health
              </Link>
              <Link
                href={new URL("/v1/status", webEnv.gatewayBaseUrl).toString()}
                target="_blank"
                className="text-sm text-[var(--fyxvo-brand)] hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
              >
                Open RPC status
              </Link>
              <Link
                href={new URL("/v1/metrics", webEnv.gatewayBaseUrl).toString()}
                target="_blank"
                className="text-sm text-[var(--fyxvo-brand)] hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
              >
                Open RPC metrics
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Protocol and launch state</CardTitle>
            <CardDescription>
              The wording stays explicit about what is live, what is managed, and what is
              intentionally still gated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  Core protocol accounts
                </div>
                <div className="mt-2 space-y-2 text-sm text-[var(--fyxvo-text)]">
                  <p className="break-all">Config {liveDevnetState.protocolConfig}</p>
                  <p className="break-all">Treasury {liveDevnetState.treasury}</p>
                  <p className="break-all">Registry {liveDevnetState.operatorRegistry}</p>
                  <p className="break-all">USDC vault {liveDevnetState.treasuryUsdcVault}</p>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  Managed infrastructure
                </div>
                <div className="mt-2 space-y-2 text-sm text-[var(--fyxvo-text)]">
                  <p className="break-all">Wallet {liveDevnetState.managedOperatorWallet}</p>
                  <p className="break-all">Operator {liveDevnetState.managedOperatorAccount}</p>
                  <p className="break-all">Rewards {liveDevnetState.managedRewardAccount}</p>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  Authority posture
                </div>
                <div className="mt-2 space-y-2 text-sm text-[var(--fyxvo-text)]">
                  <p>Mode {status.apiStatus.authorityPlan?.mode ?? "Unavailable"}</p>
                  <p className="break-all">
                    Protocol {status.apiStatus.authorityPlan?.protocolAuthority ?? "Unavailable"}
                  </p>
                  <p className="break-all">
                    Pause {status.apiStatus.authorityPlan?.pauseAuthority ?? "Unavailable"}
                  </p>
                </div>
              </div>
            </div>

            {notes.map((item) => (
              <Notice key={item.title} tone={item.tone} title={item.title}>
                {item.body}
              </Notice>
            ))}

            {readiness && !readiness.ready ? (
              <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-amber-300/80">
                  Readiness reasons
                </div>
                <div className="mt-2 space-y-2 text-sm text-[var(--fyxvo-text-soft)]">
                  {readiness.reasons.map((reason) => (
                    <p key={reason}>{reason}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
