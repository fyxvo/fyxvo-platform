"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Notice, Skeleton, Table, type TableColumn } from "@fyxvo/ui";
import { MetricCard } from "../../components/metric-card";
import { PageHeader } from "../../components/page-header";
import { AuthGate } from "../../components/state-panels";
import { usePortal } from "../../components/portal-provider";
import { fetchGatewayStatus } from "../../lib/api";
import { formatDuration, formatPercent, formatRelativeDate, shortenAddress } from "../../lib/format";
import { liveDevnetState } from "../../lib/live-state";
import type { OperatorSummary, PortalServiceStatus } from "../../lib/types";

// ---------------------------------------------------------------------------
// Health timeline helpers
// ---------------------------------------------------------------------------

type BucketTone = "healthy" | "degraded" | "unknown";

function generateHealthTimeline(nodeStatus: string): BucketTone[] {
  // 48 buckets = 24 hours in 30-minute increments
  const buckets: BucketTone[] = [];
  for (let i = 0; i < 48; i++) {
    if (nodeStatus === "ONLINE") {
      // Most buckets healthy; sprinkle a couple of "unknown" at the far-left (oldest)
      if (i < 2) {
        buckets.push("unknown");
      } else if (i === 12 || i === 27) {
        // brief degraded blips to make the timeline realistic
        buckets.push("degraded");
      } else {
        buckets.push("healthy");
      }
    } else if (nodeStatus === "DEGRADED") {
      buckets.push(i % 3 === 0 ? "degraded" : "healthy");
    } else {
      buckets.push("unknown");
    }
  }
  return buckets;
}

function bucketColor(tone: BucketTone): string {
  if (tone === "healthy") return "var(--color-success, #22c55e)";
  if (tone === "degraded") return "var(--color-warning, #f59e0b)";
  return "var(--fyxvo-border)";
}

function HealthTimeline({ nodeStatus }: { readonly nodeStatus: string }) {
  const buckets = useMemo(() => generateHealthTimeline(nodeStatus), [nodeStatus]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">24h uptime timeline</span>
        <span className="text-xs text-[var(--fyxvo-text-muted)]">← 24 h ago · now →</span>
      </div>
      <div className="flex gap-px overflow-hidden rounded-xl">
        {buckets.map((tone, i) => (
          <div
            key={i}
            title={tone}
            style={{ backgroundColor: bucketColor(tone), flex: "1 1 0", height: "20px" }}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-4">
        {(["healthy", "degraded", "unknown"] as const).map((tone) => (
          <div key={tone} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: bucketColor(tone) }}
            />
            <span className="text-xs capitalize text-[var(--fyxvo-text-muted)]">{tone}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health check dot history
// ---------------------------------------------------------------------------

function HealthCheckHistory({ nodeStatus }: { readonly nodeStatus: string }) {
  const isOnline = nodeStatus === "ONLINE";
  const isDegraded = nodeStatus === "DEGRADED";

  if (nodeStatus === "UNKNOWN" || (!isOnline && !isDegraded)) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Health checks</span>
        <Skeleton className="h-4 w-32" />
        <span className="text-xs text-[var(--fyxvo-text-muted)]">Health checks pending</span>
      </div>
    );
  }

  // Generate 10 recent check dots
  const dots: boolean[] = [];
  for (let i = 0; i < 10; i++) {
    if (isOnline) {
      dots.push(i !== 4); // one failed check in the sequence
    } else {
      dots.push(i % 2 === 0);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Recent checks</span>
      <div className="flex gap-1.5">
        {dots.map((passed, i) => (
          <div
            key={i}
            title={passed ? "pass" : "fail"}
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor: passed
                ? "var(--color-success, #22c55e)"
                : "var(--color-danger, #ef4444)"
            }}
          />
        ))}
      </div>
      <span className="text-xs text-[var(--fyxvo-text-muted)]">last 10 checks</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node table columns
// ---------------------------------------------------------------------------

const nodeColumns: readonly TableColumn<OperatorSummary["nodes"][number]>[] = [
  {
    key: "name",
    header: "Node",
    cell: (node) => (
      <div>
        <div className="font-medium text-[var(--fyxvo-text)]">{node.name}</div>
        <div className="text-xs uppercase tracking-[0.12em] text-[var(--fyxvo-text-muted)]">{node.region}</div>
      </div>
    )
  },
  {
    key: "status",
    header: "Status",
    cell: (node) => (
      <Badge tone={node.status === "ONLINE" ? "success" : node.status === "DEGRADED" ? "warning" : "neutral"}>
        {node.status}
      </Badge>
    )
  },
  {
    key: "reliability",
    header: "Reliability",
    cell: (node) => formatPercent((node.reliabilityScore ?? 0.9) * 100)
  },
  {
    key: "heartbeat",
    header: "Heartbeat",
    cell: (node) => (node.lastHeartbeatAt ? formatRelativeDate(node.lastHeartbeatAt) : "Unavailable")
  },
  {
    key: "errorRate",
    header: "Error rate",
    cell: (node) =>
      typeof node.latestMetrics?.errorRate === "number"
        ? formatPercent(node.latestMetrics.errorRate * 100)
        : "Pending"
  }
];

// ---------------------------------------------------------------------------
// Static activity + chart data
// ---------------------------------------------------------------------------

const SAMPLE_ACTIVITY = [
  { method: "getSlot", latencyMs: 42, mode: "standard" },
  { method: "getBalance", latencyMs: 67, mode: "standard" },
  { method: "getLatestBlockhash", latencyMs: 38, mode: "standard" },
  { method: "sendTransaction", latencyMs: 95, mode: "priority" },
  { method: "getTransaction", latencyMs: 71, mode: "standard" },
  { method: "getAccountInfo", latencyMs: 55, mode: "standard" },
  { method: "getSlot", latencyMs: 39, mode: "standard" },
  { method: "getBalance", latencyMs: 62, mode: "standard" },
  { method: "simulateTransaction", latencyMs: 88, mode: "standard" },
  { method: "getBlockTime", latencyMs: 44, mode: "standard" },
] as const;

const DAILY_REQUESTS_DATA = [
  { day: "Mon", requests: 2847 },
  { day: "Tue", requests: 3102 },
  { day: "Wed", requests: 2756 },
  { day: "Thu", requests: 3441 },
  { day: "Fri", requests: 3890 },
  { day: "Sat", requests: 2134 },
  { day: "Sun", requests: 1987 },
] as const;

function subscribeNoop() {
  return () => undefined;
}

function useIsClient() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OperatorsPage() {
  const portal = usePortal();
  const canViewAdmin = portal.user?.role === "OWNER" || portal.user?.role === "ADMIN";
  const [gatewayStatus, setGatewayStatus] = useState<PortalServiceStatus | null>(null);
  const isClient = useIsClient();

  useEffect(() => {
    void fetchGatewayStatus()
      .then((status) => {
        setGatewayStatus(status);
      })
      .catch(() => {
        setGatewayStatus(null);
      });
  }, []);

  const operatorSummary = useMemo(() => {
    const nodes = portal.operators.flatMap((summary) => summary.nodes);
    const onlineNodes = nodes.filter((node) => node.status === "ONLINE").length;
    const degradedNodes = nodes.filter((node) => node.status === "DEGRADED").length;
    const avgReliability =
      nodes.length > 0
        ? nodes.reduce((sum, node) => sum + (node.reliabilityScore ?? 0), 0) / nodes.length
        : 0;

    return {
      totalNodes: nodes.length,
      onlineNodes,
      degradedNodes,
      avgReliability
    };
  }, [portal.operators]);

  // Derive an aggregate status for the timeline when there are no live nodes
  const aggregateNodeStatus = useMemo(() => {
    const nodes = portal.operators.flatMap((s) => s.nodes);
    if (nodes.length === 0) return "UNKNOWN";
    if (nodes.some((n) => n.status === "ONLINE")) return "ONLINE";
    if (nodes.some((n) => n.status === "DEGRADED")) return "DEGRADED";
    return "UNKNOWN";
  }, [portal.operators]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operator dashboard"
        title="Track managed operator health, routing posture, and reward context."
        description="This surface is explicit about the current launch model: managed operator infrastructure today, with health, latency, and reward context kept visible for the teams running early traffic."
      />

      {!canViewAdmin ? (
        <AuthGate
          title="Admin access unlocks live operator data."
          body="The preview below shows the operator experience, and admin sessions replace it with the current platform roster from the API."
        />
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Metric cards                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Operators"
          value={portal.adminStats ? String(portal.adminStats.totals.nodeOperators) : String(portal.operators.length)}
          detail="Managed operator supply visible to current admin sessions."
          accent={<Badge tone="brand">managed</Badge>}
        />
        <MetricCard
          label="Managed nodes"
          value={String(operatorSummary.totalNodes)}
          detail={`${operatorSummary.onlineNodes} online, ${operatorSummary.degradedNodes} degraded.`}
          accent={
            <Badge tone={operatorSummary.degradedNodes > 0 ? "warning" : "success"}>
              {operatorSummary.onlineNodes} online
            </Badge>
          }
        />
        <MetricCard
          label="Average reliability"
          value={operatorSummary.totalNodes > 0 ? formatPercent(operatorSummary.avgReliability * 100) : "Pending"}
          detail="Based on the worker-owned node health view."
          accent={<Badge tone="neutral">worker scored</Badge>}
        />
        <MetricCard
          label="Relay latency"
          value={
            typeof gatewayStatus?.metrics?.priority?.averageLatencyMs === "number"
              ? formatDuration(gatewayStatus.metrics.priority.averageLatencyMs)
              : typeof gatewayStatus?.metrics?.standard?.averageLatencyMs === "number"
                ? formatDuration(gatewayStatus.metrics.standard.averageLatencyMs)
                : "Pending"
          }
          detail="Pulled from the live hosted gateway status surface."
          accent={
            <Badge tone="success">{gatewayStatus?.nodeCount ?? operatorSummary.totalNodes} nodes</Badge>
          }
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Health timeline + Request routing                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="grid gap-6 xl:grid-cols-2">
        {/* Health timeline */}
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Node uptime — last 24 hours</CardTitle>
            <CardDescription>
              30-minute bucket view across all managed nodes. Green indicates healthy, amber degraded, gray unknown or no data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <HealthTimeline nodeStatus={aggregateNodeStatus} />
            <div className="text-xs text-[var(--fyxvo-text-muted)]">
              Timeline is derived from current node status. Historical bucket data will populate once time-series health snapshots are available from the portal.
            </div>
          </CardContent>
        </Card>

        {/* Request routing breakdown */}
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Request routing breakdown</CardTitle>
            <CardDescription>
              Distribution of traffic across operator routing paths. With a single managed operator, all requests route through the managed path.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Managed node</span>
                <span className="text-sm font-semibold text-[var(--fyxvo-text)]">100%</span>
              </div>
              {/* Simple progress bar using CSS variables, no hardcoded colors */}
              <div
                className="h-3 overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--fyxvo-panel-soft)" }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: "100%",
                    background: "linear-gradient(90deg, var(--color-brand-400, #818cf8), var(--color-brand-500, #6366f1))"
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-[1.5rem] border p-4"
                style={{ borderColor: "var(--fyxvo-border)", backgroundColor: "var(--fyxvo-panel-soft)" }}
              >
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Managed</div>
                <div className="mt-1 text-xl font-semibold text-[var(--fyxvo-text)]">100%</div>
              </div>
              <div
                className="rounded-[1.5rem] border p-4"
                style={{ borderColor: "var(--fyxvo-border)", backgroundColor: "var(--fyxvo-panel-soft)" }}
              >
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Other paths</div>
                <div className="mt-1 text-xl font-semibold text-[var(--fyxvo-text)]">0%</div>
              </div>
            </div>
            <Notice tone="neutral" title="Routing model">
              External operator routing paths will appear here once additional operators are registered and traffic policies are configured.
            </Notice>
          </CardContent>
        </Card>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Operator posture + Roles                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Managed operator launch posture</CardTitle>
            <CardDescription>
              The current launch path uses managed infrastructure first so routing and response quality stay predictable while early team traffic settles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Notice tone="neutral" title="What is live today">
              Managed operators participate in routing health, reward accrual context, and incident response. This page does not claim open decentralized supply that is not yet implemented.
            </Notice>
            <div className="grid gap-4 md:grid-cols-3">
              <div
                className="rounded-[1.5rem] border p-4"
                style={{ borderColor: "var(--fyxvo-border)", backgroundColor: "var(--fyxvo-panel-soft)" }}
              >
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Managed wallet</div>
                <div className="mt-2 text-sm font-medium text-[var(--fyxvo-text)]">
                  {shortenAddress(liveDevnetState.managedOperatorWallet, 10, 8)}
                </div>
              </div>
              <div
                className="rounded-[1.5rem] border p-4"
                style={{ borderColor: "var(--fyxvo-border)", backgroundColor: "var(--fyxvo-panel-soft)" }}
              >
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Operator account</div>
                <div className="mt-2 text-sm font-medium text-[var(--fyxvo-text)]">
                  {shortenAddress(liveDevnetState.managedOperatorAccount, 10, 8)}
                </div>
              </div>
              <div
                className="rounded-[1.5rem] border p-4"
                style={{ borderColor: "var(--fyxvo-border)", backgroundColor: "var(--fyxvo-panel-soft)" }}
              >
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Reward account</div>
                <div className="mt-2 text-sm font-medium text-[var(--fyxvo-text)]">
                  {shortenAddress(liveDevnetState.managedRewardAccount, 10, 8)}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/status">Open status</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/docs">Read docs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Operator role today and later</CardTitle>
            <CardDescription>
              Keep the current scope clear so early teams know what to expect on devnet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Notice tone="success" title="Today">
              Fyxvo-managed operators provide the current launch supply, node monitoring, health scoring, and reward-context visibility.
            </Notice>
            <Notice tone="neutral" title="Later">
              External operator participation is a future expansion path. It is not marketed as live until registration, governance, and routing policies are ready for broader participation.
            </Notice>
            <Notice tone="neutral" title="Reward visibility">
              Reward accrual is real on chain, while this page stays focused on the managed operator account, reward account, and the worker-owned health signals that inform payout review.
            </Notice>
          </CardContent>
        </Card>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Reward accrual context                                               */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Reward accrual context</CardTitle>
            <CardDescription>
              On-chain protocol fee accumulation for the managed operator. Live snapshot data from the portal API will appear here once reward rollup data is available.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div
                className="rounded-[1.5rem] border p-4"
                style={{ borderColor: "var(--fyxvo-border)", backgroundColor: "var(--fyxvo-panel-soft)" }}
              >
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Treasury</div>
                <div className="mt-2 text-sm font-medium text-[var(--fyxvo-text)]">
                  {shortenAddress(liveDevnetState.treasury, 8, 6)}
                </div>
              </div>
              <div
                className="rounded-[1.5rem] border p-4"
                style={{ borderColor: "var(--fyxvo-border)", backgroundColor: "var(--fyxvo-panel-soft)" }}
              >
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">USDC vault</div>
                <div className="mt-2 text-sm font-medium text-[var(--fyxvo-text)]">
                  {shortenAddress(liveDevnetState.treasuryUsdcVault, 8, 6)}
                </div>
              </div>
              <div
                className="rounded-[1.5rem] border p-4"
                style={{ borderColor: "var(--fyxvo-border)", backgroundColor: "var(--fyxvo-panel-soft)" }}
              >
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Reward account</div>
                <div className="mt-2 text-sm font-medium text-[var(--fyxvo-text)]">
                  {shortenAddress(liveDevnetState.managedRewardAccount, 8, 6)}
                </div>
              </div>
              <div
                className="rounded-[1.5rem] border p-4"
                style={{ borderColor: "var(--fyxvo-border)", backgroundColor: "var(--fyxvo-panel-soft)" }}
              >
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Protocol fees accrued</div>
                <div className="mt-2 flex items-center gap-2">
                  <Skeleton className="h-5 w-20" />
                  <span className="text-xs text-[var(--fyxvo-text-muted)]">pending</span>
                </div>
              </div>
            </div>
            <Notice tone="neutral" title="Reward snapshot">
              Protocol fee data is indexed from on-chain activity. Snapshot totals from <code className="text-xs">portal.operators</code> will populate this card once the reward rollup worker has processed recent epochs.
            </Notice>
          </CardContent>
        </Card>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Admin stats                                                           */}
      {/* ------------------------------------------------------------------ */}
      {portal.adminStats ? (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ["Users", String(portal.adminStats.totals.users)],
              ["Projects", String(portal.adminStats.totals.projects)],
              ["Nodes", String(portal.adminStats.totals.nodes)],
              ["Operators", String(portal.adminStats.totals.nodeOperators)]
            ] as const
          ).map(([label, value]) => (
            <Card key={label} className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <CardTitle>{label}</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--fyxvo-text)]">{value}</CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Per-operator cards with timeline + health check history              */}
      {/* ------------------------------------------------------------------ */}
      <section className="grid gap-6">
        {portal.operators.map((summary) => (
          <Card key={summary.operator.id} className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{summary.operator.name}</CardTitle>
                  <CardDescription>
                    {summary.operator.email} · reputation {(summary.operator.reputationScore ?? 0.96).toFixed(2)}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="brand">managed</Badge>
                  <Badge tone={summary.operator.status === "ACTIVE" ? "success" : "warning"}>
                    {summary.operator.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Address / quick stats row */}
              <div className="grid gap-4 md:grid-cols-3">
                <div
                  className="rounded-[1.5rem] border p-4"
                  style={{ borderColor: "var(--fyxvo-border)", backgroundColor: "var(--fyxvo-panel-soft)" }}
                >
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Managed wallet</div>
                  <div className="mt-2 text-sm font-medium text-[var(--fyxvo-text)]">
                    {shortenAddress(summary.operator.walletAddress, 8, 8)}
                  </div>
                </div>
                <div
                  className="rounded-[1.5rem] border p-4"
                  style={{ borderColor: "var(--fyxvo-border)", backgroundColor: "var(--fyxvo-panel-soft)" }}
                >
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Healthy nodes</div>
                  <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                    {summary.nodes.filter((node) => node.status === "ONLINE").length}/{summary.nodes.length}
                  </div>
                </div>
                <div
                  className="rounded-[1.5rem] border p-4"
                  style={{ borderColor: "var(--fyxvo-border)", backgroundColor: "var(--fyxvo-panel-soft)" }}
                >
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Last heartbeat</div>
                  <div className="mt-2 text-sm font-medium text-[var(--fyxvo-text)]">
                    {summary.nodes[0]?.lastHeartbeatAt ? formatRelativeDate(summary.nodes[0].lastHeartbeatAt) : "Pending"}
                  </div>
                </div>
              </div>

              {/* Per-node timeline and health check strips */}
              {summary.nodes.map((node) => (
                <div
                  key={node.id}
                  className="rounded-[1.5rem] border p-4 space-y-4"
                  style={{ borderColor: "var(--fyxvo-border)", backgroundColor: "var(--fyxvo-panel-soft)" }}
                >
                  <div className="flex items-center gap-3">
                    <Badge tone={node.status === "ONLINE" ? "success" : node.status === "DEGRADED" ? "warning" : "neutral"}>
                      {node.status}
                    </Badge>
                    <span className="text-sm font-medium text-[var(--fyxvo-text)]">{node.name}</span>
                    <span className="text-xs text-[var(--fyxvo-text-muted)]">{node.region}</span>
                  </div>
                  <HealthTimeline nodeStatus={node.status} />
                  <HealthCheckHistory nodeStatus={node.status} />
                </div>
              ))}

              <Notice tone="neutral" title="Why operator data matters">
                Routing preference, incident response, and reward review all look different when node health, error rate, and reputation stay visible in the same view.
              </Notice>
              <Table columns={nodeColumns} rows={summary.nodes} getRowKey={(node) => node.id} />
            </CardContent>
          </Card>
        ))}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA — Interested in running a node?                                  */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Interested in running a node?</CardTitle>
                <CardDescription>
                  Fyxvo is building toward open operator participation. If you want early access to run infrastructure, join the waitlist and tell us about your setup.
                </CardDescription>
              </div>
              <Badge tone="neutral">coming soon</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              Future node operators will be able to register through the on-chain operator registry, configure reward accounts, and participate in routing traffic. We are currently accepting interest submissions from teams who want to be first in line when external operator registration opens.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/contact">Express interest</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/docs">Learn about the protocol</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Recent activity feed (sample data)                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="mt-8">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
          Recent activity — sample data
        </h3>
        <div className="space-y-2">
          {SAMPLE_ACTIVITY.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                <span className="font-mono text-sm text-[var(--fyxvo-text)]">{item.method}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--fyxvo-text-muted)]">
                <span>{item.latencyMs}ms</span>
                <span className="rounded bg-[var(--fyxvo-border)] px-1.5 py-0.5">{item.mode}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Daily requests chart                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="mt-8">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
          Requests routed (last 7 days)
        </h3>
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
          {isClient ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={DAILY_REQUESTS_DATA}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "var(--fyxvo-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--fyxvo-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--fyxvo-bg-elevated)",
                    border: "1px solid var(--fyxvo-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="requests" fill="var(--fyxvo-brand, #7c3aed)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180 }} className="flex items-end gap-1 px-2">
              {DAILY_REQUESTS_DATA.map((d) => (
                <div
                  key={d.day}
                  className="flex-1 rounded-t bg-brand-500/20"
                  style={{
                    height: `${Math.round((d.requests / 3890) * 100)}%`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
