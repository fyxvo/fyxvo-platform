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
import { getStatusSnapshot } from "../../lib/server-status";
import { getServiceHealthHistory, getIncidents } from "../../lib/api";
import { webEnv } from "../../lib/env";
import { formatDuration, shortenAddress } from "../../lib/format";
import { liveDevnetState } from "../../lib/live-state";
import { StatusRefreshIndicator } from "../../components/status-refresh-indicator";
import { ResponseTimeTicker } from "../../components/response-time-ticker";
import { StatusSubscribeForm } from "../../components/status-subscribe-form";
import { StatusRegions, StatusHealthCalendar } from "../../components/status-regions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Status — Fyxvo"
  },
  description:
    "Live service readiness for the Fyxvo devnet control plane, gateway, and on-chain protocol accounts.",
  alternates: {
    canonical: `${webEnv.siteUrl}/status`,
  },
  openGraph: {
    title: "Status — Fyxvo",
    description:
      "Live service readiness for the Fyxvo devnet control plane, gateway, and on-chain protocol accounts.",
    url: `${webEnv.siteUrl}/status`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Status — Fyxvo",
    description:
      "Live service readiness for the Fyxvo devnet control plane, gateway, and on-chain protocol accounts.",
    images: [webEnv.socialImageUrl]
  }
};

function percentage(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(1)}%`
    : "Unavailable";
}

function computeUptime(
  snapshots: { checkedAt: string; status: string }[],
  days = 90,
): { uptime: number; actualDays: number } {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = snapshots.filter(
    (s) => new Date(s.checkedAt).getTime() >= cutoff,
  );
  if (recent.length === 0) return { uptime: 100, actualDays: days };
  const healthy = recent.filter((s) => s.status === "healthy").length;
  const uptime = Math.round((healthy / recent.length) * 1000) / 10;
  const oldest = Math.min(...recent.map((s) => new Date(s.checkedAt).getTime()));
  const actualDays = Math.max(1, Math.round((Date.now() - oldest) / (24 * 60 * 60 * 1000)));
  return { uptime, actualDays };
}

interface NetworkCapacityResponse {
  readonly requestsPerMinute?: number;
  readonly capacityPerMinute?: number;
}

async function fetchNetworkCapacity(): Promise<NetworkCapacityResponse | null> {
  try {
    const res = await fetch(new URL("/v1/network/capacity", webEnv.apiBaseUrl).toString(), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as NetworkCapacityResponse;
  } catch {
    return null;
  }
}

export default async function StatusPage() {
  const [status, serviceHealth, incidents, networkCapacity] = await Promise.all([
    getStatusSnapshot(),
    getServiceHealthHistory().catch(() => null),
    getIncidents().catch(() => []),
    fetchNetworkCapacity().catch(() => null),
  ]);
  const readiness = status.apiStatus.protocolReadiness;
  const gatewayMetrics = status.gatewayStatus.metrics;
  const healthy =
    status.apiHealth.status === "ok" &&
    status.gatewayHealth.status === "ok" &&
    Boolean(readiness?.ready);

  const apiUptime = computeUptime(serviceHealth?.api ?? []);
  const gatewayUptime = computeUptime(serviceHealth?.gateway ?? []);

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
      {/* Hero status banner */}
      <div className="flex flex-col items-center text-center py-8 gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`h-4 w-4 rounded-full ${healthy ? "bg-emerald-500" : "bg-amber-500"} shadow-lg`}
          />
          <h1 className="text-3xl font-bold text-[var(--fyxvo-text)]">
            {healthy ? "All Systems Operational" : "Attention Needed"}
          </h1>
        </div>
        <p className="text-sm text-[var(--fyxvo-text-muted)] max-w-lg">
          Live condition across the Fyxvo control plane, relay gateway, and Solana devnet program.
        </p>
        <StatusRefreshIndicator />
        <ResponseTimeTicker apiBase={webEnv.apiBaseUrl} />
      </div>

      {/* Three service cards */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Card 1 — Control Plane (API) */}
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Control Plane (API)</CardTitle>
            <Badge tone={status.apiHealth.status === "ok" ? "success" : "warning"}>
              {status.apiHealth.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold text-[var(--fyxvo-text)]">
              {status.apiStatus.solanaCluster}
            </div>
            <p className="text-xs text-[var(--fyxvo-text-muted)]">Solana cluster</p>
            <div className="space-y-1 text-xs text-[var(--fyxvo-text-muted)]">
              <p>
                Database:{" "}
                <span className="text-[var(--fyxvo-text-soft)]">
                  {status.apiStatus.dependencies?.databaseConfigured ? "configured" : "not configured"}
                </span>
              </p>
              <p>
                Redis:{" "}
                <span className="text-[var(--fyxvo-text-soft)]">
                  {status.apiStatus.dependencies?.redisConfigured ? "configured" : "not configured"}
                </span>
              </p>
            </div>
            <Link
              href={new URL("/health", webEnv.apiBaseUrl).toString()}
              target="_blank"
              className="text-xs text-[var(--fyxvo-brand)] hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
            >
              API health endpoint →
            </Link>
            <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
              {apiUptime.uptime}% uptime over the last {apiUptime.actualDays} days
            </p>
          </CardContent>
        </Card>

        {/* Card 2 — Relay Gateway */}
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relay Gateway</CardTitle>
            <Badge tone={status.gatewayHealth.status === "ok" ? "success" : "warning"}>
              {status.gatewayHealth.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold text-[var(--fyxvo-text)]">
              {percentage(gatewayMetrics?.standard?.successRate)}
            </div>
            <p className="text-xs text-[var(--fyxvo-text-muted)]">Standard success rate</p>
            <div className="space-y-1 text-xs text-[var(--fyxvo-text-muted)]">
              <p>
                Standard latency:{" "}
                <span className="text-[var(--fyxvo-text-soft)]">
                  {typeof gatewayMetrics?.standard?.averageLatencyMs === "number"
                    ? formatDuration(gatewayMetrics.standard.averageLatencyMs)
                    : "Unavailable"}
                </span>
              </p>
              <p>
                Priority latency:{" "}
                <span className="text-[var(--fyxvo-text-soft)]">
                  {typeof gatewayMetrics?.priority?.averageLatencyMs === "number"
                    ? formatDuration(gatewayMetrics.priority.averageLatencyMs)
                    : "Unavailable"}
                </span>
              </p>
              <p>
                Upstream nodes:{" "}
                <span className="text-[var(--fyxvo-text-soft)]">
                  {status.gatewayStatus.nodeCount ?? 0}
                </span>
              </p>
            </div>
            <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
              {gatewayUptime.uptime}% uptime over the last {gatewayUptime.actualDays} days
            </p>
          </CardContent>
        </Card>

        {/* Card 3 — Protocol (On-chain) */}
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protocol (On-chain)</CardTitle>
            <Badge tone={readiness?.ready ? "success" : "warning"}>
              {readiness?.ready ? "ready" : "attention"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold text-[var(--fyxvo-text)]">
              {shortenAddress(liveDevnetState.programId)}
            </div>
            <p className="text-xs text-[var(--fyxvo-text-muted)]">Program ID</p>
            <div className="space-y-1 text-xs text-[var(--fyxvo-text-muted)]">
              <p>
                Cluster:{" "}
                <span className="text-[var(--fyxvo-text-soft)]">
                  {status.apiStatus.solanaCluster}
                </span>
              </p>
              <p>
                SOL:{" "}
                <span className="text-[var(--fyxvo-text-soft)]">live</span>
              </p>
              <p>
                USDC:{" "}
                <span className="text-[var(--fyxvo-text-soft)]">
                  {status.apiStatus.acceptedAssets?.usdcEnabled ? "enabled" : "gated"}
                </span>
              </p>
              <p>
                Authority:{" "}
                <span className="text-[var(--fyxvo-text-soft)]">
                  {status.apiStatus.authorityPlan?.mode ?? "unavailable"}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Uptime timeline */}
      {serviceHealth && Object.keys(serviceHealth).length > 0 ? (
        <section>
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Uptime timeline</CardTitle>
              <CardDescription>Last 48 health checks per service, newest right. Green = healthy, amber = degraded, red = unreachable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(["api", "gateway", "worker"] as const).map((svc) => {
                const snapshots = serviceHealth[svc] ?? [];
                if (snapshots.length === 0) return null;
                const orderedOldestFirst = [...snapshots].reverse();
                const uptimePct = snapshots.length > 0
                  ? Math.round((snapshots.filter((s) => s.status === "healthy").length / snapshots.length) * 100)
                  : 100;

                return (
                  <div key={svc} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--fyxvo-text)] capitalize">{svc}</span>
                      <span className="text-xs text-[var(--fyxvo-text-muted)]">{uptimePct}% uptime</span>
                    </div>
                    <div className="flex gap-0.5">
                      {orderedOldestFirst.map((snapshot) => (
                        <div
                          key={snapshot.id}
                          title={`${new Date(snapshot.checkedAt).toLocaleString()} — ${snapshot.status}${snapshot.responseTimeMs != null ? ` (${snapshot.responseTimeMs}ms)` : ""}`}
                          className={`h-6 flex-1 rounded-sm ${
                            snapshot.status === "healthy"
                              ? "bg-emerald-500"
                              : snapshot.status === "degraded"
                                ? "bg-amber-400"
                                : "bg-red-500"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* Detailed service information */}
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
                <div className="text-xs uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
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

      {/* Incident history */}
      <section>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Incident history</CardTitle>
            <CardDescription>Service incidents automatically detected by the monitoring worker.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incidents.length === 0 ? (
                <p className="text-sm text-[var(--fyxvo-text-muted)]">No incidents recorded.</p>
              ) : (
                incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-[var(--fyxvo-text)] capitalize">{incident.serviceName}</div>
                      <Badge tone={incident.resolvedAt ? "success" : "warning"}>
                        {incident.resolvedAt ? "resolved" : "open"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex gap-2 text-xs text-[var(--fyxvo-text-muted)]">
                      <span className="capitalize">{incident.severity}</span>
                      <span>·</span>
                      <span>{new Date(incident.startedAt).toLocaleString()}</span>
                      {incident.resolvedAt && (
                        <>
                          <span>–</span>
                          <span>{new Date(incident.resolvedAt).toLocaleString()}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-[var(--fyxvo-text-soft)]">{incident.description}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Network Capacity */}
      <section>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Network Capacity</CardTitle>
            <CardDescription>
              Current request throughput versus managed infrastructure capacity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const CAPACITY_MAX = 10_000;
              const current = networkCapacity?.requestsPerMinute ?? 0;
              const capacity = networkCapacity?.capacityPerMinute ?? CAPACITY_MAX;
              const utilizationPct = Math.min(100, Math.round((current / capacity) * 100));
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--fyxvo-text-muted)]">Requests/min (current)</span>
                    <span className="font-mono font-medium text-[var(--fyxvo-text)]">
                      {networkCapacity ? current.toLocaleString() : "Unavailable"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--fyxvo-text-muted)]">Capacity</span>
                    <span className="font-mono font-medium text-[var(--fyxvo-text)]">{capacity.toLocaleString()} req/min</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--fyxvo-text-muted)]">Utilization</span>
                    <span className="font-mono font-medium text-[var(--fyxvo-text)]">{utilizationPct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--fyxvo-panel-soft)]">
                    <div
                      style={{ width: `${utilizationPct}%` }}
                      className="h-2 rounded bg-[var(--fyxvo-brand)] transition-[width]"
                    />
                  </div>
                  <p className="text-xs text-[var(--fyxvo-text-muted)]">
                    Capacity estimate is based on current managed infrastructure. Increases with operator network growth.
                  </p>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </section>

      {/* Gateway Regions */}
      <section>
        <StatusRegions />
      </section>

      {/* 30-Day Network Health Calendar */}
      <section>
        <StatusHealthCalendar />
      </section>

      {/* Subscribe to status updates */}
      <StatusSubscribeForm />
    </div>
  );
}
