import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, CardContent, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { getStatusSnapshot } from "../../lib/server-status";
import { getServiceHealthHistory, getIncidents, getNetworkStats } from "../../lib/api";
import { webEnv } from "../../lib/env";
import { liveDevnetState } from "../../lib/live-state";
import { formatDuration, shortenAddress } from "../../lib/format";
import { StatusRefreshIndicator } from "../../components/status-refresh-indicator";
import { StatusSubscribeForm } from "../../components/status-subscribe-form";
import { StatusRegions, StatusHealthCalendar } from "../../components/status-regions";
import { CopyButton } from "../../components/copy-button";
import type { StatusIncident } from "../../lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Status — Fyxvo" },
  description:
    "See what is running, what needs attention, and the current state of the Fyxvo devnet control plane, gateway, and on-chain protocol.",
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
    images: [{ url: webEnv.socialImageUrl }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Status — Fyxvo",
    description:
      "Live service readiness for the Fyxvo devnet control plane, gateway, and on-chain protocol accounts.",
    images: [webEnv.socialImageUrl],
  },
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
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as NetworkCapacityResponse;
  } catch {
    return null;
  }
}

export default async function StatusPage() {
  const [status, serviceHealth, incidents, networkCapacity, networkStats] = await Promise.all([
    getStatusSnapshot(),
    getServiceHealthHistory().catch(() => null),
    getIncidents().catch(() => [] as StatusIncident[]),
    fetchNetworkCapacity().catch(() => null),
    getNetworkStats().catch(() => null),
  ]);

  const readiness = status.apiStatus.protocolReadiness;
  const gatewayMetrics = status.gatewayStatus.metrics;

  const healthy =
    status.apiHealth.status === "ok" &&
    status.gatewayHealth.status === "ok" &&
    Boolean(readiness?.ready);

  const apiUptime = computeUptime(serviceHealth?.api ?? []);
  const gatewayUptime = computeUptime(serviceHealth?.gateway ?? []);

  return (
    <div className="space-y-10 lg:space-y-12">

      {/* Section 1 — Status headline */}
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex items-center gap-3">
          <span
            className={`h-4 w-4 rounded-full shadow-lg ${
              healthy ? "bg-[var(--fyxvo-success)]" : "bg-[var(--fyxvo-warning)]"
            }`}
          />
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-5xl">
            {healthy ? "All systems operational" : "Degraded performance"}
          </h1>
        </div>
        <p className="text-sm text-[var(--fyxvo-text-muted)]">
          Last updated {new Date(status.apiHealth.timestamp).toLocaleString()}
        </p>
        <StatusRefreshIndicator />
      </div>

      {/* Section 2 — Three component cards */}
      <section className="grid gap-4 md:grid-cols-3">

        {/* Control Plane */}
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Control Plane</CardTitle>
            <Badge tone={status.apiHealth.status === "ok" ? "success" : "warning"}>
              {status.apiHealth.status === "ok" ? "Operational" : "Degraded"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-[var(--fyxvo-text-muted)] font-mono break-all">
              {webEnv.apiBaseUrl}
            </p>
            <div className="space-y-1.5 text-xs text-[var(--fyxvo-text-muted)]">
              {status.apiStatus.version ? (
                <p>
                  Version{" "}
                  <span className="text-[var(--fyxvo-text-soft)]">{status.apiStatus.version}</span>
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    status.apiStatus.dependencies?.databaseConfigured
                      ? "bg-[var(--fyxvo-success)]"
                      : "bg-[var(--fyxvo-warning)]"
                  }`}
                />
                <span>
                  Database{" "}
                  <span className="text-[var(--fyxvo-text-soft)]">
                    {status.apiStatus.dependencies?.databaseConfigured ? "configured" : "not configured"}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    status.apiStatus.dependencies?.redisConfigured
                      ? "bg-[var(--fyxvo-success)]"
                      : "bg-[var(--fyxvo-warning)]"
                  }`}
                />
                <span>
                  Redis{" "}
                  <span className="text-[var(--fyxvo-text-soft)]">
                    {status.apiStatus.dependencies?.redisConfigured ? "configured" : "not configured"}
                  </span>
                </span>
              </div>
            </div>
            <p className="text-xs text-[var(--fyxvo-text-muted)]">
              {apiUptime.uptime}% uptime over {apiUptime.actualDays} days
            </p>
            <Link
              href={new URL("/health", webEnv.apiBaseUrl).toString()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--fyxvo-brand)] hover:underline"
            >
              Health endpoint
            </Link>
          </CardContent>
        </Card>

        {/* Relay Gateway */}
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relay Gateway</CardTitle>
            <Badge tone={status.gatewayHealth.status === "ok" ? "success" : "warning"}>
              {status.gatewayHealth.status === "ok" ? "Operational" : "Degraded"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-[var(--fyxvo-text-muted)] font-mono break-all">
              {webEnv.gatewayBaseUrl}
            </p>
            <div className="space-y-1.5 text-xs text-[var(--fyxvo-text-muted)]">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    status.gatewayStatus.upstreamReachable
                      ? "bg-[var(--fyxvo-success)]"
                      : "bg-[var(--fyxvo-warning)]"
                  }`}
                />
                <span>
                  Upstream{" "}
                  <span className="text-[var(--fyxvo-text-soft)]">
                    {status.gatewayStatus.upstreamReachable ? "reachable" : "unreachable"}
                  </span>
                </span>
              </div>
              <p>
                Avg latency{" "}
                <span className="text-[var(--fyxvo-text-soft)]">
                  {typeof gatewayMetrics?.standard?.averageLatencyMs === "number"
                    ? formatDuration(gatewayMetrics.standard.averageLatencyMs)
                    : "Unavailable"}
                </span>
              </p>
              <p>
                Success rate{" "}
                <span className="text-[var(--fyxvo-text-soft)]">
                  {percentage(gatewayMetrics?.standard?.successRate)}
                </span>
              </p>
            </div>
            <p className="text-xs text-[var(--fyxvo-text-muted)]">
              {gatewayUptime.uptime}% uptime over {gatewayUptime.actualDays} days
            </p>
            <Link
              href={new URL("/v1/status", webEnv.gatewayBaseUrl).toString()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--fyxvo-brand)] hover:underline"
            >
              Gateway status endpoint
            </Link>
          </CardContent>
        </Card>

        {/* Protocol */}
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protocol</CardTitle>
            <Badge tone={readiness?.ready ? "success" : "warning"}>
              {readiness?.ready ? "Ready" : "Attention needed"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-[var(--fyxvo-text)]">
                {shortenAddress(liveDevnetState.programId)}
              </span>
              <CopyButton value={liveDevnetState.programId} />
            </div>
            <p className="text-xs text-[var(--fyxvo-text-muted)]">Program ID</p>
            <div className="space-y-1.5 text-xs text-[var(--fyxvo-text-muted)]">
              <p>
                Cluster{" "}
                <span className="text-[var(--fyxvo-text-soft)]">
                  {status.apiStatus.solanaCluster ?? "devnet"}
                </span>
              </p>
              <p>
                SOL <span className="text-[var(--fyxvo-text-soft)]">live</span>
              </p>
              <p>
                USDC{" "}
                <span className="text-[var(--fyxvo-text-soft)]">
                  {status.apiStatus.acceptedAssets?.usdcEnabled ? "enabled" : "gated"}
                </span>
              </p>
            </div>
            <p className="text-xs text-[var(--fyxvo-text-soft)]">
              {readiness?.ready ? "Ready" : "Attention needed"}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Section 3 — Uptime timeline (48 slots) */}
      <section>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Uptime timeline</CardTitle>
            <p className="text-sm text-[var(--fyxvo-text-muted)]">
              Last 48 checks per service, newest on the right. Green is healthy, amber is
              degraded, gray is unknown.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {(["api", "gateway", "worker"] as const).map((svc) => {
              const snapshots = serviceHealth?.[svc] ?? [];
              const ordered = [...snapshots].slice(-48).reverse();
              const displayCount = 48;
              const fillerCount = Math.max(0, displayCount - ordered.length);
              const uptimePct =
                snapshots.length > 0
                  ? Math.round(
                      (snapshots.filter((s) => s.status === "healthy").length /
                        snapshots.length) *
                        100,
                    )
                  : 100;

              return (
                <div key={svc} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize text-[var(--fyxvo-text)]">
                      {svc}
                    </span>
                    <span className="text-xs text-[var(--fyxvo-text-muted)]">
                      {uptimePct}% uptime
                    </span>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: fillerCount }).map((_, i) => (
                      <div
                        key={`filler-${i}`}
                        className="h-6 flex-1 rounded-sm bg-[var(--fyxvo-border)]"
                      />
                    ))}
                    {ordered.map((snapshot) => (
                      <div
                        key={snapshot.id}
                        title={`${new Date(snapshot.checkedAt).toLocaleString()} — ${snapshot.status}`}
                        className={`h-6 flex-1 rounded-sm ${
                          snapshot.status === "healthy"
                            ? "bg-[var(--fyxvo-success)]"
                            : snapshot.status === "degraded"
                              ? "bg-[var(--fyxvo-warning)]"
                              : "bg-[var(--fyxvo-border-strong)]"
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

      {/* Section 4 — Hosted services (live numbers) */}
      <section>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Hosted services</CardTitle>
            <p className="text-sm text-[var(--fyxvo-text-muted)]">
              Live counters from the network stats endpoint. These numbers update on each page
              load.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Total requests
                </div>
                <div className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                  {networkStats?.totalRequests != null
                    ? networkStats.totalRequests.toLocaleString()
                    : "Unavailable"}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Total projects
                </div>
                <div className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                  {networkStats?.totalProjects != null
                    ? networkStats.totalProjects.toLocaleString()
                    : "Unavailable"}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Total API keys
                </div>
                <div className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                  {networkStats?.totalApiKeys != null
                    ? networkStats.totalApiKeys.toLocaleString()
                    : "Unavailable"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section 5 — Incident history */}
      <section>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Incident history</CardTitle>
            <p className="text-sm text-[var(--fyxvo-text-muted)]">
              Incidents detected automatically by the monitoring system.
            </p>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6 text-center">
                <p className="text-sm text-[var(--fyxvo-text-muted)]">No recent incidents.</p>
                <p className="mt-1 text-xs text-[var(--fyxvo-text-soft)]">
                  The monitoring system has not recorded any service disruptions. All checks are
                  passing normally.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.slice(0, 10).map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-medium capitalize text-[var(--fyxvo-text)]">
                        {incident.serviceName}
                      </div>
                      <Badge tone={incident.resolvedAt ? "success" : "warning"}>
                        {incident.resolvedAt ? "Resolved" : "Ongoing"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--fyxvo-text-muted)]">
                      <Badge tone="neutral">{incident.severity}</Badge>
                      <span>{new Date(incident.startedAt).toLocaleString()}</span>
                      {incident.resolvedAt ? (
                        <>
                          <span>to</span>
                          <span>{new Date(incident.resolvedAt).toLocaleString()}</span>
                        </>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-[var(--fyxvo-text-soft)]">
                      {incident.description}
                    </p>
                    {incident.updates && incident.updates.length > 0 ? (
                      <div className="mt-4 space-y-3 border-t border-[var(--fyxvo-border)] pt-4">
                        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                          Timeline
                        </div>
                        <div className="space-y-3">
                          {incident.updates.map((update, index) => (
                            <div key={update.id} className="flex gap-3">
                              <div className="flex w-5 flex-col items-center">
                                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--fyxvo-brand)]" />
                                {index < incident.updates!.length - 1 ? (
                                  <span className="mt-1 h-full w-px bg-[var(--fyxvo-border)]" />
                                ) : null}
                              </div>
                              <div className="flex-1 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--fyxvo-text-muted)]">
                                  <Badge
                                    tone={
                                      update.status === "resolved"
                                        ? "success"
                                        : update.status === "escalated"
                                          ? "warning"
                                          : "neutral"
                                    }
                                  >
                                    {update.status}
                                  </Badge>
                                  {update.severity ? (
                                    <span className="capitalize">{update.severity}</span>
                                  ) : null}
                                  <span>{new Date(update.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="mt-2 text-sm text-[var(--fyxvo-text-soft)]">
                                  {update.message}
                                </p>
                                {update.affectedServices.length > 0 ? (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {update.affectedServices.map((service) => (
                                      <Badge key={service} tone="neutral">
                                        {service}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Section 6 — Network capacity */}
      <section>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Network capacity</CardTitle>
            <p className="text-sm text-[var(--fyxvo-text-muted)]">
              How much of the current infrastructure capacity is in use.
            </p>
          </CardHeader>
          <CardContent>
            {networkCapacity ? (
              (() => {
                const CAPACITY_MAX = 10_000;
                const current = networkCapacity.requestsPerMinute ?? 0;
                const capacity = networkCapacity.capacityPerMinute ?? CAPACITY_MAX;
                const utilizationPct = Math.min(
                  100,
                  Math.round((current / capacity) * 100),
                );
                return (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                        <div className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                          Requests per minute
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                          {current.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                        <div className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                          Capacity limit
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                          {capacity.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                        <div className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                          Utilization
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                          {utilizationPct}%
                        </div>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--fyxvo-panel-soft)]">
                      <div
                        style={{ width: `${utilizationPct}%` }}
                        className="h-2 rounded bg-[var(--fyxvo-brand)] transition-[width]"
                      />
                    </div>
                    <p className="text-xs text-[var(--fyxvo-text-muted)]">
                      This capacity reflects the current managed infrastructure and will grow as
                      the operator network expands.
                    </p>
                  </div>
                );
              })()
            ) : (
              <Notice tone="neutral" title="Capacity data unavailable">
                The network capacity endpoint is not returning data right now. The rest of the
                status page reflects live data from the control plane and gateway.
              </Notice>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Section 7 — Gateway regions */}
      <section>
        <StatusRegions />
      </section>

      {/* Section 7b — 30-day health calendar */}
      <section>
        <StatusHealthCalendar />
      </section>

      {/* Section 8 — Protocol addresses */}
      <section>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Protocol addresses</CardTitle>
            <p className="text-sm text-[var(--fyxvo-text-muted)]">
              On-chain accounts for the live Fyxvo devnet program. These are the actual deployed
              addresses, not placeholders.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Config", value: liveDevnetState.protocolConfig },
                { label: "Treasury", value: liveDevnetState.treasury },
                { label: "Registry", value: liveDevnetState.operatorRegistry },
                { label: "USDC Vault", value: liveDevnetState.treasuryUsdcVault },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                >
                  <div className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    {label}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-sm text-[var(--fyxvo-text)] break-all">
                      {shortenAddress(value)}
                    </span>
                    <CopyButton value={value} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section 9 — Status subscriber */}
      <StatusSubscribeForm />
    </div>
  );
}
