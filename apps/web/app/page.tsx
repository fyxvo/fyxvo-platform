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
} from "@fyxvo/ui";
import { LineChartCard } from "../components/charts";
import { CopyButton } from "../components/copy-button";
import { MetricCard } from "../components/metric-card";
import { BrandLogo } from "../components/brand-logo";
import { SocialLinkButtons } from "../components/social-links";
import { TrackedLinkButton } from "../components/tracked-link-button";
import { getStatusSnapshot } from "../lib/server-status";
import { webEnv } from "../lib/env";
import { formatDuration } from "../lib/format";
import { liveDevnetState } from "../lib/live-state";
import { dashboardTrend } from "../lib/sample-data";

export default async function HomePage() {
  const status = await getStatusSnapshot();
  const gatewayLatency = status.gatewayStatus.metrics?.standard?.averageLatencyMs ?? 0;
  const gatewaySuccessRate = status.gatewayStatus.metrics?.standard?.successRate ?? 0;
  const totalRequests = status.gatewayStatus.metrics?.totals?.requests ?? 0;
  const quickstartCurl = `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "content-type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'`;

  return (
    <div className="space-y-10 lg:space-y-12">
      <section className="fyxvo-scroll-section grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)] overflow-hidden">
          <CardContent className="grid gap-8 px-6 py-8 md:px-8 md:py-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-4 py-2 text-sm text-brand-200">
                <span className="h-2 w-2 rounded-full bg-brand-400" />
                Private alpha · SOL devnet path live
              </div>
              <BrandLogo iconClassName="h-14 w-14" className="gap-4" />
              <div className="space-y-4">
                <h1 className="max-w-3xl font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-5xl md:text-6xl">
                  Fund a Solana project on devnet, issue a key, and send the first real request
                  without losing the thread.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-[var(--fyxvo-text-muted)]">
                  Fyxvo keeps the alpha surface calm and explicit: SOL funding is live today, USDC
                  stays gated until enabled, the current operator path is managed infrastructure,
                  and early teams can get from wallet auth to a first real request in minutes on
                  devnet.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <TrackedLinkButton
                  href="/docs"
                  eventName="landing_cta_clicked"
                  eventSource="home-hero-quickstart"
                  size="lg"
                  className="w-full justify-center sm:w-auto"
                >
                  Start quickstart
                </TrackedLinkButton>
                <TrackedLinkButton
                  href="/dashboard"
                  eventName="landing_cta_clicked"
                  eventSource="home-hero-dashboard"
                  size="lg"
                  variant="secondary"
                  className="w-full justify-center sm:w-auto"
                >
                  Open dashboard
                </TrackedLinkButton>
                <TrackedLinkButton
                  href="/status"
                  eventName="landing_cta_clicked"
                  eventSource="home-hero-status"
                  size="lg"
                  variant="ghost"
                  className="w-full justify-center sm:w-auto"
                >
                  Check live status
                </TrackedLinkButton>
                <TrackedLinkButton
                  href="/contact"
                  eventName="landing_cta_clicked"
                  eventSource="home-hero-contact"
                  size="lg"
                  variant="ghost"
                  className="w-full justify-center sm:w-auto"
                >
                  Talk to the team
                </TrackedLinkButton>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "Wallet-authenticated API access",
                  "Funded gateway routing",
                  "Managed operator launch mode",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.4rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-4 py-4 text-sm text-[var(--fyxvo-text-soft)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <MetricCard
            label="Standard relay latency"
            value={gatewayLatency > 0 ? formatDuration(gatewayLatency) : "Live"}
            detail="Pulled from the current gateway status surface. This is the live relay path, not static marketing copy."
            accent={
              <Badge tone={status.gatewayHealth.status === "ok" ? "success" : "warning"}>
                {status.gatewayHealth.status}
              </Badge>
            }
          />
          <MetricCard
            label="Gateway success rate"
            value={gatewaySuccessRate > 0 ? `${gatewaySuccessRate.toFixed(1)}%` : "Stable"}
            detail="Fyxvo keeps the reliability signal visible beside funding and operator context so teams can react before credits or upstreams degrade."
            accent={<Badge tone="brand">{status.gatewayStatus.nodeCount ?? 0} nodes</Badge>}
          />
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Live deployment</CardTitle>
              <CardDescription>
                The frontend, API, gateway, and status surfaces are all pointing at the hosted stack
                and the deployed devnet program.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  Program ID
                </div>
                <div className="mt-2 break-all text-sm font-medium text-[var(--fyxvo-text)]">
                  {liveDevnetState.programId}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                    Requests tracked
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                    {totalRequests}
                  </div>
                </div>
                <div className="rounded-[1.4rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                    USDC path
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                    {webEnv.enableUsdc ? "Enabled" : "Gated"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="fyxvo-scroll-section grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Public trust surface</CardTitle>
            <CardDescription>
              The launch state is explicit. What is live, what is gated, and what is still managed
              are all visible without reading between the lines.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                SOL path
              </div>
              <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                Live on devnet
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                Project activation, funding, API keys, funded relay access, request logging, and
                analytics are all operating against the deployed devnet program.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                USDC path
              </div>
              <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                {webEnv.enableUsdc ? "Enabled by config" : "Intentionally gated"}
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                The asset path exists on chain, but the public product keeps it gated until the
                deployment explicitly enables it.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Operator topology
              </div>
              <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                Managed infrastructure
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                The current operator path is managed by Fyxvo. It is described as managed
                infrastructure, not as open decentralized supply.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Public health links
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button asChild size="sm" variant="secondary">
                  <Link href={webEnv.statusPageUrl}>Status page</Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href={new URL("/health", webEnv.apiBaseUrl).toString()} target="_blank">
                    API health
                  </Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link
                    href={new URL("/v1/status", webEnv.gatewayBaseUrl).toString()}
                    target="_blank"
                  >
                    RPC status
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Fastest path to first request</CardTitle>
            <CardDescription>
              This is the shortest working path through the live product for a new developer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="overflow-x-auto rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4 text-xs leading-6 text-[var(--fyxvo-text-soft)]">
              <code>{quickstartCurl}</code>
            </pre>
            <div className="flex flex-wrap gap-3">
              <CopyButton value={quickstartCurl} label="Copy curl example" />
              <CopyButton value={`${webEnv.gatewayBaseUrl}/rpc`} label="Copy standard endpoint" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.4rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  Need a key first?
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  Connect a wallet, activate one project, fund it with SOL, then create one API key
                  from the dashboard or API keys page.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  Want the full flow?
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  The docs page now includes quickstart, SDK usage, priority relay examples,
                  troubleshooting, and direct status links.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="features" className="fyxvo-scroll-section grid gap-6 lg:grid-cols-3">
        {[
          {
            title: "Funded relay access",
            body: "Projects move from wallet auth to on-chain activation to spendable RPC access without fake balance assumptions or hidden service states.",
          },
          {
            title: "One operator surface",
            body: "Projects, keys, funding, analytics, and managed operator context stay in one structured flow instead of four disconnected dashboards.",
          },
          {
            title: "Honest public status",
            body: "Fyxvo shows live readiness, managed infrastructure posture, and configuration-gated asset support without pretending the launch topology is more decentralized than it is.",
          },
        ].map((item) => (
          <Card key={item.title} className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section
        id="community"
        className="fyxvo-scroll-section grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"
      >
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Launch with direct lines to the team</CardTitle>
            <CardDescription>
              Fyxvo is live on devnet today. Community paths are open for launch questions,
              integration feedback, and managed operator conversations. Private alpha support is
              real and routed through the product, not hidden behind a vague contact promise.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Who this is for
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                Teams that want to validate funded Solana RPC, priority relay behavior, on-chain
                project activation, and analytics visibility before expanding beyond the current
                managed launch topology.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Start in minutes
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                Connect a supported wallet, activate one project, fund it with a small SOL devnet
                transaction, generate one key, and send one request to the hosted relay.
              </p>
            </div>
            <SocialLinkButtons />
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Choose the right next step</CardTitle>
            <CardDescription>
              The launch path stays honest about what is ready for self-serve evaluation and what
              still benefits from a direct conversation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Notice tone="success" title="Live today">
              Wallet auth, project activation, SOL funding, standard RPC, priority relay, request
              logging, and analytics are all live on Solana devnet.
            </Notice>
            <Notice tone="neutral" title="Still gated">
              USDC stays disabled until explicitly enabled in runtime configuration and validated
              for the target deployment.
            </Notice>
            <Notice tone="neutral" title="Managed first">
              The current launch path uses managed operator infrastructure so routing behavior and
              response quality stay predictable while early traffic patterns settle.
            </Notice>
            <div className="flex flex-wrap gap-3">
              <TrackedLinkButton
                href="/pricing"
                eventName="landing_cta_clicked"
                eventSource="home-community-pricing"
                variant="secondary"
              >
                Review pricing
              </TrackedLinkButton>
              <TrackedLinkButton
                href="/contact"
                eventName="landing_cta_clicked"
                eventSource="home-community-contact"
                variant="secondary"
              >
                Request access
              </TrackedLinkButton>
            </div>
          </CardContent>
        </Card>
      </section>

      <section
        id="how-it-works"
        className="fyxvo-scroll-section grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"
      >
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>How the live path works</CardTitle>
            <CardDescription>
              The product is organized around the actual sequence teams follow in production, not
              around internal service boundaries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Connect a wallet and prove ownership with a signed challenge.",
              "Create a project and confirm the live on-chain activation transaction.",
              "Prepare a SOL funding transaction, sign it in the wallet, and confirm it on devnet.",
              "Generate one API key, hit the funded relay once, and watch logs and analytics react.",
            ].map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-[1.4rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-sm font-semibold text-brand-300">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <LineChartCard
          title="Relay demand shape"
          description="Traffic shape matters more than vanity totals. The gateway, funding logic, and operator path all benefit when the busy windows are visible."
          points={dashboardTrend}
        />
      </section>

      <section
        id="developer-flow"
        className="fyxvo-scroll-section grid gap-6 xl:grid-cols-[1.08fr_0.92fr]"
      >
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Developer flow</CardTitle>
            <CardDescription>
              The shortest path through Fyxvo is clear: authenticate, activate, fund, issue a key,
              and send traffic.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Control API", value: webEnv.apiBaseUrl },
              { label: "RPC endpoint", value: `${webEnv.gatewayBaseUrl}/rpc` },
              { label: "Priority relay", value: `${webEnv.gatewayBaseUrl}/priority` },
              { label: "Status surface", value: webEnv.statusPageUrl },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                      {label}
                    </div>
                    <div className="mt-2 break-all text-sm font-medium text-[var(--fyxvo-text)]">
                      {value}
                    </div>
                  </div>
                  <CopyButton value={value} className="self-start sm:shrink-0" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Notice tone="success" title="SOL is live">
            Wallet-authenticated project activation, funding, funded relay access, request logging,
            worker rollups, and analytics are live on Solana devnet.
          </Notice>
          <Notice tone="neutral" title="USDC remains gated">
            The protocol asset path exists, but the public product keeps USDC disabled until you
            intentionally enable and validate it for the current deployment.
          </Notice>
          <Notice tone="neutral" title="Managed launch topology">
            The current operator path is managed infrastructure operated by Fyxvo. The product says
            that plainly instead of dressing it up as an open external operator market.
          </Notice>
        </div>
      </section>

      <section id="operators" className="fyxvo-scroll-section grid gap-6 lg:grid-cols-3">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)] lg:col-span-2">
          <CardHeader>
            <CardTitle>Node operator launch mode</CardTitle>
            <CardDescription>
              Fyxvo launches with a managed operator path so routing quality and response times stay
              predictable while the public product matures.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {[
              ["Managed operator wallet", liveDevnetState.managedOperatorWallet],
              ["Operator account", liveDevnetState.managedOperatorAccount],
              ["Reward account", liveDevnetState.managedRewardAccount],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
              >
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  {label}
                </div>
                <div className="mt-2 break-all text-sm text-[var(--fyxvo-text)]">{value}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Next operator action</CardTitle>
            <CardDescription>
              Build funded projects, observe relay pressure, and use analytics to decide when the
              managed topology needs broader node supply.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-muted)]">
            <p>Watch request pressure and latency together.</p>
            <p>Keep treasury reserve visible before priority demand spikes.</p>
            <p>Use the status page as the external truth surface during rollout.</p>
          </CardContent>
        </Card>
      </section>

      <section
        id="status-preview"
        className="fyxvo-scroll-section grid gap-6 xl:grid-cols-[1fr_1fr]"
      >
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Status preview</CardTitle>
            <CardDescription>
              These values come from the hosted API and gateway surfaces. They update with the live
              stack.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                API
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Badge tone={status.apiHealth.status === "ok" ? "success" : "warning"}>
                  {status.apiHealth.status}
                </Badge>
                <span className="text-sm text-[var(--fyxvo-text-soft)]">
                  {status.apiStatus.environment ?? "hosted"}
                </span>
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Gateway
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Badge tone={status.gatewayHealth.status === "ok" ? "success" : "warning"}>
                  {status.gatewayHealth.status}
                </Badge>
                <span className="text-sm text-[var(--fyxvo-text-soft)]">
                  {status.gatewayStatus.nodeCount ?? 0} nodes
                </span>
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Program
              </div>
              <div className="mt-2 text-sm font-medium text-[var(--fyxvo-text)]">
                {liveDevnetState.programId}
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Success rate
              </div>
              <div className="mt-2 text-sm font-medium text-[var(--fyxvo-text)]">
                {gatewaySuccessRate > 0
                  ? `${gatewaySuccessRate.toFixed(1)}%`
                  : "Waiting for traffic"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Ready to continue</CardTitle>
            <CardDescription>
              The shortest live path through the product is available from the dashboard once the
              wallet session is active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Suggested next action
              </div>
              <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                Connect a wallet, activate a project, fund with SOL, then copy the RPC endpoint from
                the dashboard.
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <TrackedLinkButton
                href="/dashboard"
                eventName="landing_cta_clicked"
                eventSource="home-status-dashboard"
              >
                Go to dashboard
              </TrackedLinkButton>
              <TrackedLinkButton
                href="/docs"
                eventName="landing_cta_clicked"
                eventSource="home-status-docs"
                variant="secondary"
              >
                Read docs
              </TrackedLinkButton>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
