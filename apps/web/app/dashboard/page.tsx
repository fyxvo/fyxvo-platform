"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  Notice,
  Table,
  type TableColumn,
} from "@fyxvo/ui";
import { LineChartCard } from "../../components/charts";
import { CopyButton } from "../../components/copy-button";
import { DeltaBadge, MetricCard } from "../../components/metric-card";
import { PageHeader } from "../../components/page-header";
import { AuthGate, EmptyProjectState, LoadingGrid } from "../../components/state-panels";
import { FeedbackCaptureForm } from "../../components/feedback-capture-form";
import { usePortal } from "../../components/portal-provider";
import { dashboardTrend } from "../../lib/sample-data";
import {
  formatDuration,
  formatInteger,
  formatRelativeDate,
  formatSol,
  shortenAddress,
} from "../../lib/format";
import type { AdminOverview, PortalProject } from "../../lib/types";
import { webEnv } from "../../lib/env";

const projectColumns: readonly TableColumn<PortalProject>[] = [
  {
    key: "name",
    header: "Project",
    cell: (project) => (
      <div>
        <div className="font-medium text-[var(--fyxvo-text)]">{project.name}</div>
        <div className="text-xs uppercase tracking-[0.12em] text-[var(--fyxvo-text-muted)]">
          {project.slug}
        </div>
      </div>
    ),
  },
  {
    key: "requests",
    header: "Request logs",
    cell: (project) => formatInteger(project._count?.requestLogs ?? 0),
  },
  {
    key: "apiKeys",
    header: "API keys",
    cell: (project) => String(project._count?.apiKeys ?? 0),
  },
  {
    key: "pda",
    header: "Project PDA",
    cell: (project) => shortenAddress(project.onChainProjectPda, 6, 6),
  },
];

const workspaceSections = [
  {
    title: "Projects",
    body: "Keep project activation, on-chain identity, and ownership close together.",
    href: "/projects/solstice-labs",
  },
  {
    title: "API keys",
    body: "Generate scoped credentials, then copy a ready-to-run request example.",
    href: "/api-keys",
  },
  {
    title: "Funding",
    body: "Prepare and confirm SOL funding without losing the wallet session context.",
    href: "/funding",
  },
  {
    title: "Analytics",
    body: "Watch request logs and latency once the first relay call lands.",
    href: "/analytics",
  },
  {
    title: "Docs",
    body: "Keep quickstart, endpoints, and funding instructions close to the product.",
    href: "/docs",
  },
  {
    title: "Status",
    body: "Check hosted service condition, protocol readiness, and managed infrastructure posture.",
    href: "/status",
  },
] as const;

function hasSpendableSolCredits(value: string | undefined) {
  if (!value) {
    return false;
  }

  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

function statusTone(value: boolean) {
  return value ? "success" : "neutral";
}

function formatLamportStringAsSol(value: string | null) {
  if (!value) {
    return "Unavailable";
  }

  try {
    return formatSol(Number(BigInt(value)) / 1_000_000_000);
  } catch {
    return value;
  }
}

function OpsTimeline({
  title,
  description,
  items,
  emptyLabel,
}: {
  readonly title: string;
  readonly description: string;
  readonly items: readonly {
    readonly id: string;
    readonly title: string;
    readonly meta: string;
    readonly body: string;
    readonly tone: "success" | "warning" | "danger" | "neutral";
  }[];
  readonly emptyLabel: string;
}) {
  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <Notice tone="neutral" title="No items yet">
            {emptyLabel}
          </Notice>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-[var(--fyxvo-text)]">{item.title}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    {item.meta}
                  </div>
                </div>
                <Badge tone={item.tone}>{item.tone}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.body}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function buildOpsItems(overview: AdminOverview | null) {
  if (!overview) {
    return {
      errors: [],
      funding: [],
      activity: [],
      interest: [],
      apiKeys: [],
      feedback: [],
    };
  }

  return {
    errors: overview.recentErrors.map((entry) => ({
      id: entry.id,
      title: `${entry.service.toUpperCase()} ${entry.statusCode}`,
      meta: `${entry.method} ${entry.route} · ${formatRelativeDate(entry.createdAt)}`,
      body: entry.project
        ? `${entry.project.name} saw a ${entry.statusCode} response in ${formatDuration(entry.durationMs)}.`
        : `A platform request returned ${entry.statusCode} in ${formatDuration(entry.durationMs)}.`,
      tone:
        entry.statusCode >= 500
          ? ("danger" as const)
          : entry.statusCode >= 429
            ? ("warning" as const)
            : ("neutral" as const),
    })),
    funding: overview.recentFundingEvents.map((entry) => ({
      id: entry.id,
      title: `${entry.project.name} funded with ${entry.asset}`,
      meta: `${formatRelativeDate(entry.createdAt)} · ${entry.amount} raw units`,
      body: entry.confirmedAt
        ? `Confirmed by ${entry.requestedBy.displayName} at ${formatRelativeDate(entry.confirmedAt)}.`
        : `Prepared by ${entry.requestedBy.displayName}. Confirmation is still pending.`,
      tone: entry.confirmedAt ? ("success" as const) : ("warning" as const),
    })),
    activity: overview.recentProjectActivity.map((entry) => ({
      id: entry.id,
      title: `${entry.project?.name ?? "Platform"} ${entry.method} ${entry.route}`,
      meta: `${entry.service.toUpperCase()} · ${formatRelativeDate(entry.createdAt)}`,
      body: `Returned ${entry.statusCode} in ${formatDuration(entry.durationMs)}.`,
      tone: entry.statusCode >= 500 ? ("danger" as const) : ("neutral" as const),
    })),
    interest: overview.interestSubmissions.recent.map((entry) => ({
      id: entry.id,
      title: `${entry.name} · ${entry.role}`,
      meta: `${formatRelativeDate(entry.createdAt)} · ${entry.expectedRequestVolume}`,
      body: `${entry.email}${entry.team ? ` from ${entry.team}` : ""} is interested in ${entry.interestAreas.join(", ")}${entry.operatorInterest ? " and operator participation" : ""}.`,
      tone: "neutral" as const,
    })),
    apiKeys: overview.recentApiKeyActivity.map((entry) => ({
      id: entry.id,
      title: `${entry.project.name} · ${entry.label}`,
      meta: `${entry.prefix} · ${entry.lastUsedAt ? `used ${formatRelativeDate(entry.lastUsedAt)}` : `created ${formatRelativeDate(entry.createdAt)}`}`,
      body: `Issued by ${entry.createdBy.displayName}. Current status is ${entry.status}.`,
      tone: entry.status === "ACTIVE" ? ("success" as const) : ("warning" as const),
    })),
    feedback: overview.feedbackSubmissions.recent.map((entry) => ({
      id: entry.id,
      title: `${entry.category.replaceAll("_", " ")} · ${entry.name}`,
      meta: `${formatRelativeDate(entry.createdAt)} · ${entry.source}${entry.page ? ` · ${entry.page}` : ""}`,
      body: `${entry.message}${entry.project ? ` Project context: ${entry.project.name}.` : ""}`,
      tone:
        entry.category === "BUG_REPORT" || entry.category === "ONBOARDING_FRICTION"
          ? ("warning" as const)
          : ("neutral" as const),
    })),
  };
}

export default function DashboardPage() {
  const portal = usePortal();
  const [createOpen, setCreateOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const hasProjects = portal.projects.length > 0;
  const hasApiKeys = portal.apiKeys.length > 0;
  const hasFunding =
    hasSpendableSolCredits(portal.onchainSnapshot.balances?.availableSolCredits) ||
    (portal.selectedProject?._count?.fundingRequests ?? 0) > 0;
  const hasRelayTraffic = portal.projectAnalytics.totals.requestLogs > 0;
  const endpointExample = `${webEnv.gatewayBaseUrl}/rpc`;
  const firstRequestSnippet = `curl -X POST ${endpointExample} \\
  -H "content-type: application/json" \\
  -H "x-api-key: ${portal.lastGeneratedApiKey ?? "YOUR_API_KEY"}" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'`;
  const opsItems = useMemo(() => buildOpsItems(portal.adminOverview), [portal.adminOverview]);

  const journeySteps = [
    {
      title: "Connect wallet",
      body: "Use a supported Solana wallet to open a signed session. Fyxvo never stores a private key.",
      complete: portal.walletPhase === "authenticated",
      action:
        portal.walletPhase === "authenticated" ? (
          <Badge tone="success">{portal.walletName ?? "wallet connected"}</Badge>
        ) : (
          <Badge tone="warning">Waiting on wallet auth</Badge>
        ),
    },
    {
      title: "Create project",
      body: "Create the project record and sign the live on-chain activation transaction.",
      complete: hasProjects,
      action: hasProjects ? (
        <Button asChild size="sm" variant="secondary">
          <Link href={`/projects/${portal.selectedProject?.slug ?? "solstice-labs"}`}>
            Open project
          </Link>
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          disabled={portal.walletPhase !== "authenticated"}
        >
          Create project
        </Button>
      ),
    },
    {
      title: "Fund with SOL",
      body: "Prepare the funding transaction, sign it in the wallet, and confirm it on devnet.",
      complete: hasFunding,
      action: (
        <Button asChild size="sm" variant="secondary">
          <Link href="/funding">{hasFunding ? "Review funding" : "Fund project"}</Link>
        </Button>
      ),
    },
    {
      title: "Generate API key",
      body: "Create a scoped key, then copy the RPC endpoint and request example.",
      complete: hasApiKeys,
      action: (
        <Button asChild size="sm" variant="secondary">
          <Link href="/api-keys">{hasApiKeys ? "Manage keys" : "Create key"}</Link>
        </Button>
      ),
    },
    {
      title: "Make first request",
      body: "Send a standard relay request with the generated key and watch analytics update.",
      complete: hasRelayTraffic,
      action: (
        <div className="flex flex-wrap gap-2">
          <CopyButton value={endpointExample} label="Copy endpoint" />
          <CopyButton value={firstRequestSnippet} label="Copy request" />
        </div>
      ),
    },
    {
      title: "View analytics",
      body: "Once traffic lands, use analytics and status to validate latency, errors, and spend posture.",
      complete: hasRelayTraffic,
      action: (
        <Button asChild size="sm" variant="secondary">
          <Link href="/analytics">Open analytics</Link>
        </Button>
      ),
    },
  ] as const;

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        eyebrow="Dashboard"
        title="Move from wallet auth to funded relay traffic without guessing the next step."
        description="The dashboard is organized around the live first-user path: authenticate, activate a project, fund it, issue a key, send traffic, and confirm that analytics and ops surfaces react."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setCreateOpen(true)}
              disabled={portal.walletPhase !== "authenticated"}
            >
              Create project
            </Button>
            <CopyButton value={endpointExample} label="Copy RPC endpoint" />
            <Button asChild variant="secondary">
              <Link href="/docs">Open quickstart</Link>
            </Button>
          </>
        }
      />

      {portal.walletPhase !== "authenticated" ? <AuthGate /> : null}
      {portal.loading ? <LoadingGrid /> : null}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create a devnet project"
        description="Project creation prepares the real activation transaction right away, so funding and relay usage can begin immediately after confirmation."
        footer={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[var(--fyxvo-text-muted)]">
              {portal.projectCreationState.message}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  void portal
                    .createProject({
                      slug,
                      name,
                      ...(description ? { description } : {}),
                    })
                    .then(() => {
                      setCreateOpen(false);
                      setSlug("");
                      setName("");
                      setDescription("");
                    });
                }}
                loading={
                  portal.projectCreationState.phase === "preparing" ||
                  portal.projectCreationState.phase === "awaiting_signature" ||
                  portal.projectCreationState.phase === "submitting"
                }
                disabled={!slug || !name || portal.walletPhase !== "authenticated"}
              >
                Activate project
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Project name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Northwind Relay"
          />
          <Input
            label="Project slug"
            value={slug}
            onChange={(event) =>
              setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
            }
            placeholder="northwind-relay"
            hint="Lowercase letters, numbers, and single hyphens only."
          />
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-[var(--fyxvo-text-soft)]">Description</span>
            <textarea
              className="min-h-28 rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-4 py-3 text-[var(--fyxvo-text)] outline-none transition focus:border-brand-400"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Explain how this project will use Fyxvo on devnet."
            />
          </label>
          {portal.projectCreationState.signature ? (
            <Notice
              tone={portal.projectCreationState.phase === "error" ? "warning" : "success"}
              title="Latest activation signature"
            >
              <div className="break-all">{portal.projectCreationState.signature}</div>
            </Notice>
          ) : null}
        </div>
      </Modal>

      {!portal.loading && portal.walletPhase === "authenticated" && !hasProjects ? (
        <div className="space-y-6">
          <EmptyProjectState />
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Get started in one path</CardTitle>
              <CardDescription>
                Your first successful outcome is simple: activate a project, fund it with SOL,
                generate a key, then send one relay request.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {[
                "Create the first project from this dashboard.",
                "Open funding and send a small SOL devnet transaction.",
                "Generate an API key and copy the request example from the API keys page.",
              ].map((item, index) => (
                <div
                  key={item}
                  className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
                >
                  <div className="text-xs uppercase tracking-[0.16em] text-brand-300">
                    Step {index + 1}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>
              Each step reflects the current live session state, so the next action stays obvious.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {journeySteps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.16em] text-brand-300">
                      Step {index + 1}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                      {step.title}
                    </div>
                  </div>
                  <Badge tone={statusTone(step.complete)}>{step.complete ? "done" : "next"}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{step.body}</p>
                <div className="mt-4">{step.action}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>First request kit</CardTitle>
            <CardDescription>
              The key, endpoint, and sample request stay close together so the first relay call does
              not depend on guesswork.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Selected project
              </div>
              <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                {portal.selectedProject?.name ?? "Create a project first"}
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                    RPC endpoint
                  </div>
                  <div className="mt-2 break-all text-sm font-medium text-[var(--fyxvo-text)]">
                    {endpointExample}
                  </div>
                </div>
                <CopyButton value={endpointExample} className="self-start sm:shrink-0" />
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                    First request
                  </div>
                  <pre className="mt-3 overflow-x-auto text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                    <code>{firstRequestSnippet}</code>
                  </pre>
                </div>
                <CopyButton value={firstRequestSnippet} className="self-start sm:shrink-0" />
              </div>
            </div>
            <Notice
              tone={hasRelayTraffic ? "success" : "neutral"}
              title={hasRelayTraffic ? "Traffic detected" : "Waiting for first relay call"}
            >
              {hasRelayTraffic
                ? "Request logs are already flowing into analytics for the selected project."
                : "Once this request lands, analytics and status pages will start reflecting the live project path."}
            </Notice>
            <Notice tone="neutral" title="Team-readiness note">
              The current launch flow is owner-admin driven. Collaborator roles and shared project
              access are the next honest step, but they are not claimed as live until the auth model
              supports them end to end.
            </Notice>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Projects"
          value={String(portal.projects.length)}
          detail="Each project maps to an on-chain account, funding history, and relay access boundary."
          accent={<DeltaBadge value="live control" />}
        />
        <MetricCard
          label="Average latency"
          value={formatDuration(portal.analyticsOverview.latency.averageMs)}
          detail="Blended request latency across API, gateway, and worker logs."
          accent={<DeltaBadge value="observed" />}
        />
        <MetricCard
          label="Treasury reserve"
          value={formatSol(portal.onchainSnapshot.treasurySolBalance)}
          detail="Treasury SOL visible before the standard relay floor is hit."
          accent={<DeltaBadge value="chain-backed" />}
        />
        <MetricCard
          label="Selected project"
          value={portal.selectedProject?.name ?? "None"}
          detail="Keys, funding, and analytics remain anchored to one active project."
          accent={<Badge tone="brand">{portal.selectedProject?.slug ?? "waiting"}</Badge>}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {workspaceSections.map((section) => (
          <Card key={section.title} className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.body}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary">
                <Link href={section.href}>Open {section.title.toLowerCase()}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <LineChartCard
          title="Request pressure"
          description="Traffic shape matters because credits, node pressure, and operator health rarely move together."
          points={dashboardTrend}
        />

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Selected project posture</CardTitle>
            <CardDescription>
              Keep the current project state visible while you move from activation into funding and
              traffic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Project PDA
              </div>
              <div className="mt-2 break-all font-medium text-[var(--fyxvo-text)]">
                {portal.onchainSnapshot.projectPda}
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Available SOL credits
              </div>
              <div className="mt-2 text-xl font-semibold text-[var(--fyxvo-text)]">
                {portal.onchainSnapshot.balances?.availableSolCredits ?? "0"}
              </div>
            </div>
            <Notice
              tone={hasFunding ? "success" : "neutral"}
              title={hasFunding ? "Funding detected" : "Funding still needed"}
            >
              {hasFunding
                ? "The project has passed the first funding step, so API keys can start driving real relay traffic."
                : "Funding is the next meaningful action after project activation. Use the funding page to prepare and confirm a SOL transaction."}
            </Notice>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Table columns={projectColumns} rows={portal.projects} getRowKey={(item) => item.id} />

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Recent project activity</CardTitle>
            <CardDescription>
              The most recent project requests stay visible so new teams can confirm the system is
              reacting after their first call.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {portal.projectAnalytics.recentRequests.length === 0 ? (
              <Notice tone="neutral" title="No project requests yet">
                Send the first relay request after generating an API key. Analytics will start
                filling in from the live request log stream.
              </Notice>
            ) : (
              portal.projectAnalytics.recentRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-[var(--fyxvo-text)]">
                        {request.method} {request.route}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                        {request.service.toUpperCase()} · {formatRelativeDate(request.createdAt)}
                      </div>
                    </div>
                    <Badge tone={request.statusCode >= 400 ? "warning" : "success"}>
                      {request.statusCode}
                    </Badge>
                  </div>
                  <div className="mt-3 text-sm text-[var(--fyxvo-text-soft)]">
                    Completed in {formatDuration(request.durationMs)}.
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {portal.adminOverview ? (
        <section className="space-y-6">
          <PageHeader
            eyebrow="Operations"
            title="Live operator and platform visibility for admin sessions."
            description="These views use secure admin data from the API. They show worker freshness, treasury and fee posture, authority warnings, recent failures, recent funding, and the latest project activity without exposing internal surfaces publicly."
          />

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Protocol readiness"
              value={portal.adminOverview.protocol.readiness?.ready ? "ready" : "attention"}
              detail="Read directly from the chain-backed readiness report used by the hosted API."
              accent={
                <Badge
                  tone={portal.adminOverview.protocol.readiness?.ready ? "success" : "warning"}
                >
                  {portal.adminOverview.protocol.readiness?.ready ? "green" : "check"}
                </Badge>
              }
            />
            <MetricCard
              label="Authority mode"
              value={portal.adminOverview.protocol.authorityPlan.mode}
              detail="Mainnet beta should not ship while protocol control remains single-signer."
              accent={
                <Badge
                  tone={
                    portal.adminOverview.protocol.authorityPlan.mode === "single-signer"
                      ? "warning"
                      : "success"
                  }
                >
                  {portal.adminOverview.protocol.authorityPlan.mode}
                </Badge>
              }
            />
            <MetricCard
              label="SOL fees owed"
              value={formatLamportStringAsSol(
                portal.adminOverview.protocol.treasury.protocolSolFeesOwed
              )}
              detail="Tracked fee liability on chain. This is not withdrawable revenue until a reviewed withdrawal path exists."
              accent={<DeltaBadge value="treasury liability" />}
            />
            <MetricCard
              label="Worker health"
              value={portal.adminOverview.worker.status}
              detail={
                portal.adminOverview.worker.lastRollupAt
                  ? `Last rollup ${formatRelativeDate(portal.adminOverview.worker.lastRollupAt)}`
                  : "No worker rollup recorded yet."
              }
              accent={
                <Badge
                  tone={portal.adminOverview.worker.status === "healthy" ? "success" : "warning"}
                >
                  {portal.adminOverview.worker.status}
                </Badge>
              }
            />
            <MetricCard
              label="Worker cursor"
              value={portal.adminOverview.worker.lastCursorKey ?? "None"}
              detail={
                portal.adminOverview.worker.lastCursorAt
                  ? `Updated ${formatRelativeDate(portal.adminOverview.worker.lastCursorAt)}`
                  : "No worker cursor has been written yet."
              }
              accent={
                <Badge tone="neutral">
                  {portal.adminOverview.worker.staleThresholdMinutes}m window
                </Badge>
              }
            />
            <MetricCard
              label="Recent errors"
              value={String(portal.adminOverview.recentErrors.length)}
              detail="Latest API and gateway failures pulled from real request logs."
              accent={<DeltaBadge value="log-backed" />}
            />
            <MetricCard
              label="Funding events"
              value={String(portal.adminOverview.recentFundingEvents.length)}
              detail="Latest prepared and confirmed funding coordinates."
              accent={<DeltaBadge value="treasury view" />}
            />
            <MetricCard
              label="API key activity"
              value={String(portal.adminOverview.recentApiKeyActivity.length)}
              detail="Recent key issuance and usage context for active projects."
              accent={<DeltaBadge value="access control" />}
            />
            <MetricCard
              label="Launch interest"
              value={String(portal.adminOverview.interestSubmissions.total)}
              detail="Captured request-access and waitlist submissions from public forms."
              accent={<DeltaBadge value="real leads" />}
            />
            <MetricCard
              label="Open feedback queue"
              value={String(portal.adminOverview.feedbackSubmissions.open)}
              detail="Alpha bugs, support requests, and onboarding friction that still need review."
              accent={<DeltaBadge value="support loop" />}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <CardTitle>Authority migration posture</CardTitle>
                <CardDescription>
                  Governance preparation is explicit here so mainnet work does not depend on
                  remembering which signer still controls what.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                      Protocol authority
                    </div>
                    <div className="mt-2 break-all text-sm font-medium text-[var(--fyxvo-text)]">
                      {portal.adminOverview.protocol.authorityPlan.protocolAuthority}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                      Pause authority
                    </div>
                    <div className="mt-2 break-all text-sm font-medium text-[var(--fyxvo-text)]">
                      {portal.adminOverview.protocol.authorityPlan.pauseAuthority}
                    </div>
                  </div>
                </div>
                <Notice
                  tone={
                    portal.adminOverview.protocol.authorityPlan.mode === "single-signer"
                      ? "warning"
                      : "success"
                  }
                  title="Current governance mode"
                >
                  {portal.adminOverview.protocol.authorityPlan.mode === "single-signer"
                    ? "The live stack still runs with a single protocol signer. The repo now exposes separate protocol, pause, and upgrade authority configuration so a governed migration can happen without code edits."
                    : "Authority configuration is separated in runtime config, so governed signer replacement can proceed without source changes."}
                </Notice>
                {portal.adminOverview.protocol.authorityPlan.warnings.map((warning) => (
                  <Notice key={warning} tone="warning" title="Governance warning">
                    {warning}
                  </Notice>
                ))}
              </CardContent>
            </Card>

            <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <CardTitle>Treasury and fee posture</CardTitle>
                <CardDescription>
                  These balances come from chain-backed protocol state and help operations
                  distinguish funded inventory from reserved rewards and accrued fees.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                      Treasury SOL
                    </div>
                    <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                      {formatLamportStringAsSol(portal.adminOverview.protocol.treasury.solBalance)}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                      Reserved SOL rewards
                    </div>
                    <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                      {formatLamportStringAsSol(
                        portal.adminOverview.protocol.treasury.reservedSolRewards
                      )}
                    </div>
                  </div>
                </div>
                <Notice tone="warning" title="Fee withdrawal is still intentionally blocked">
                  Protocol fees owed are visible here for reconciliation, but the withdrawal path is
                  not implemented and should not be treated as launch-ready revenue handling.
                </Notice>
                {portal.adminOverview.protocol.treasury.reconciliationWarnings.map((warning) => (
                  <Notice key={warning} tone="warning" title="Reconciliation warning">
                    {warning}
                  </Notice>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Landing CTA clicks"
              value={String(portal.adminOverview.launchFunnel.counts.landingCtaClicks)}
              detail={`First-party launch events from the last ${portal.adminOverview.launchFunnel.periodDays} days.`}
              accent={<DeltaBadge value="owned" />}
            />
            <MetricCard
              label="Wallet intent"
              value={String(portal.adminOverview.launchFunnel.counts.walletConnectIntent)}
              detail="Users who opened the wallet-auth flow from public or product surfaces."
              accent={<DeltaBadge value="launch funnel" />}
            />
            <MetricCard
              label="Project starts"
              value={String(portal.adminOverview.launchFunnel.counts.projectCreationStarted)}
              detail="Authenticated users who began the project activation path."
              accent={<DeltaBadge value="activation" />}
            />
            <MetricCard
              label="Funding starts"
              value={String(portal.adminOverview.launchFunnel.counts.fundingFlowStarted)}
              detail="Sessions that started the SOL funding flow."
              accent={<DeltaBadge value="funding" />}
            />
            <MetricCard
              label="API keys created"
              value={String(portal.adminOverview.launchFunnel.counts.apiKeyCreated)}
              detail="Successful key creation events captured by the product."
              accent={<DeltaBadge value="usage-ready" />}
            />
            <MetricCard
              label="Interest submitted"
              value={String(portal.adminOverview.launchFunnel.counts.interestSubmitted)}
              detail="Public request-access submissions captured through pricing and contact."
              accent={<DeltaBadge value="follow-up" />}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <FeedbackCaptureForm
              source="dashboard"
              page="/dashboard"
              title="Report alpha friction without leaving the workspace"
              description="Use this when an early team hits something confusing between wallet connect, project activation, funding, key creation, and first request verification."
            />

            <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <CardTitle>Private alpha checklist</CardTitle>
                <CardDescription>
                  This is the internal support rhythm for onboarding a new team without
                  overpromising what is live.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                <p>
                  Confirm the team understands this is a hosted devnet alpha with SOL funding live
                  and USDC still gated.
                </p>
                <p>
                  Make sure one wallet can sign, one project can activate, one SOL funding
                  transaction can confirm, and one key can send one real request.
                </p>
                <p>
                  Use the contact and feedback queue if the first request path stalls, rather than
                  asking teams to debug internal service boundaries on their own.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/docs">Open quickstart</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/contact">Open support path</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/status">Check status</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <OpsTimeline
              title="Recent errors"
              description="Useful for watching rate limits, upstream failures, and funding-related failures after release changes."
              items={opsItems.errors}
              emptyLabel="When errors are logged by the API or gateway they will appear here."
            />
            <OpsTimeline
              title="Recent funding events"
              description="Shows prepared and confirmed funding coordinates from the live control plane."
              items={opsItems.funding}
              emptyLabel="No funding events have been recorded yet."
            />
            <OpsTimeline
              title="Recent project activity"
              description="A secure summary of the latest project traffic and control-plane actions."
              items={opsItems.activity}
              emptyLabel="Project activity will appear after the first authenticated project action."
            />
            <OpsTimeline
              title="Recent launch interest"
              description="Public request-access submissions captured by the launch forms."
              items={opsItems.interest}
              emptyLabel="New pricing and contact submissions will appear here."
            />
            <OpsTimeline
              title="Recent API key activity"
              description="Shows which project keys were issued or used most recently so support and governance reviews have better context."
              items={opsItems.apiKeys}
              emptyLabel="API key issuance and usage will appear here once teams start generating keys."
            />
            <OpsTimeline
              title="Recent feedback and support"
              description="Alpha issue submissions and onboarding friction reports captured by the product."
              items={opsItems.feedback}
              emptyLabel="Support submissions will appear here when teams report friction from the product surfaces."
            />
          </section>
        </section>
      ) : null}
    </div>
  );
}
