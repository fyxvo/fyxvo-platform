"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import dynamic from "next/dynamic";
const LineChartCard = dynamic(() => import("../../components/charts").then((m) => ({ default: m.LineChartCard })), { ssr: false, loading: () => <div className="h-56 animate-pulse rounded-2xl bg-[var(--fyxvo-panel-soft)]" /> });
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
  formatPercent,
  formatRelativeDate,
  formatSol,
  shortenAddress,
} from "../../lib/format";
import { GatewayHealthCard } from "../../components/gateway-health";
import { OnboardingChecklist } from "../../components/onboarding-checklist";
import { TosModal } from "../../components/tos-modal";
import { FirstRequestCelebration } from "../../components/first-request-celebration";
import { QuickstartLauncher } from "../../components/quickstart-launcher";
import type {
  AdminEmailDeliveryStatus,
  AdminDeploymentReadiness,
  AdminObservability,
  AdminOverview,
  AlertCenterItem,
  DashboardPreferences,
  FeedbackInboxItem,
  NetworkStats,
  OnboardingFunnelSummary,
  PortalProject,
  PortalServiceStatus,
  ReleaseReadinessSummary,
  RetentionCohortSummary,
  WebDeploymentStatus
} from "../../lib/types";
import { webEnv } from "../../lib/env";
import { liveDevnetState } from "../../lib/live-state";
import {
  getAlertCenter,
  dismissWhatsNew,
  fetchApiStatus,
  fetchGatewayStatus,
  fetchWebDeploymentStatus,
  getActiveAnnouncement,
  getAdminEmailDeliveryStatus,
  getAdminObservability,
  getAdminDeploymentReadiness,
  getDashboardPreferences,
  getFeedbackInbox,
  getNetworkStats,
  getOnboardingFunnel,
  getRetentionCohorts,
  getReleaseReadiness,
  getWhatsNew,
  listProjectMembers,
  updateFeedbackInboxItem,
  updateDashboardPreferences
} from "../../lib/api";

interface ProjectHealthInput {
  activated: boolean;
  apiKeyCount: number;
  hasTraffic: boolean;
}

function computeHealthScore(p: ProjectHealthInput): number {
  let score = 0;
  if (p.activated) score += 30;
  if (p.apiKeyCount > 0) score += 20;
  if (p.hasTraffic) score += 20;
  return Math.min(100, score);
}

function healthColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400 border-green-500/20 bg-green-500/5";
  if (score >= 50) return "text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5";
  return "text-red-600 dark:text-red-400 border-red-500/20 bg-red-500/5";
}

const projectColumns: readonly TableColumn<PortalProject>[] = [
  {
    key: "name",
    header: "Project",
    cell: (project) => {
      const isActivated = !!(
        project.onChainProjectPda &&
        project.onChainProjectPda.length > 10 &&
        !project.archivedAt
      );
      const score = computeHealthScore({
        activated: isActivated,
        apiKeyCount: project._count?.apiKeys ?? 0,
        hasTraffic: (project._count?.requestLogs ?? 0) > 0,
      });
      return (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[var(--fyxvo-text)]">{project.name}</span>
            <span
              title={`Health ${score}/100\n${isActivated ? "✓" : "✗"} Activated\n${(project._count?.apiKeys ?? 0) > 0 ? "✓" : "✗"} Has API keys\n${(project._count?.requestLogs ?? 0) > 0 ? "✓" : "✗"} Has traffic`}
              className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${healthColor(score)}`}
            >
              {score}
            </span>
            {project.starred ? (
              <span className="text-xs text-[var(--fyxvo-accent)]" title="Starred">★</span>
            ) : null}
            {project.environment && project.environment !== "development" ? (
              <Badge tone={project.environment === "production" ? "danger" : "warning"} className="text-[10px]">
                {project.environment}
              </Badge>
            ) : null}
          </div>
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--fyxvo-text-muted)]">
            {project.slug}
          </div>
          {((project as { tags?: string[] }).tags ?? []).length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {((project as { tags?: string[] }).tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      );
    },
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

function getWorkspaceSections(selectedProjectSlug?: string) {
  return [
  {
    title: "Projects",
    body: "Keep project activation, on-chain identity, and ownership close together.",
    href: selectedProjectSlug ? `/projects/${selectedProjectSlug}` : "/dashboard",
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
}

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

function formatCommitSha(value: string | null | undefined) {
  if (!value) return "Unavailable";
  return value.slice(0, 7);
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

  const formatInterestAreas = (areas: readonly string[]) =>
    areas
      .map((area) =>
        area === "rpc"
          ? "standard RPC"
          : area === "priority-relay"
          ? "priority relay"
          : area === "operator-participation"
            ? "operator participation"
            : area
      )
      .join(", ");

  const interestFollowUpCue = (
    entry: AdminOverview["interestSubmissions"]["recent"][number]
  ) => {
    if (entry.operatorInterest) {
      return "Operator conversation";
    }
    if (
      entry.interestAreas.includes("priority-relay") ||
      entry.expectedRequestVolume.includes("1M") ||
      entry.expectedRequestVolume.includes("10M")
    ) {
      return "Founder review";
    }
    return "Quickstart follow-up";
  };

  const feedbackFollowUpCue = (
    entry: AdminOverview["feedbackSubmissions"]["recent"][number]
  ) => {
    if (entry.category === "SUPPORT_REQUEST") {
      return "Direct support";
    }
    if (entry.category === "ONBOARDING_FRICTION") {
      return "Onboarding review";
    }
    if (entry.category === "BUG_REPORT") {
      return "Product fix";
    }
    return "Product review";
  };

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
      title: `${entry.name} · ${interestFollowUpCue(entry)}`,
      meta: `${entry.status} · ${entry.expectedRequestVolume} · ${entry.source} · ${formatRelativeDate(entry.createdAt)}`,
      body: `${entry.email}${entry.team ? ` from ${entry.team}` : ""} wants ${formatInterestAreas(entry.interestAreas)}. Use case: ${entry.useCase}${entry.operatorInterest ? " Operator participation is also in scope." : ""}`,
      tone:
        entry.status === "QUALIFIED" || entry.status === "CONTACTED"
          ? ("success" as const)
          : ("neutral" as const),
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
      meta: `${feedbackFollowUpCue(entry)} · ${entry.status} · ${entry.source}${entry.page ? ` · ${entry.page}` : ""} · ${formatRelativeDate(entry.createdAt)}`,
      body: `${entry.message}${entry.project ? ` Project context: ${entry.project.name}.` : ""}`,
      tone:
        entry.category === "BUG_REPORT" || entry.category === "ONBOARDING_FRICTION"
          ? ("warning" as const)
          : ("neutral" as const),
    })),
  };
}

const DASHBOARD_WIDGETS = [
  "quick_stats",
  "next_step",
  "recent_wins",
  "alerts_preview",
  "project_list",
  "gateway_health",
] as const;

type DashboardWidgetId = (typeof DASHBOARD_WIDGETS)[number];

const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  widgetOrder: [...DASHBOARD_WIDGETS],
  hiddenWidgets: [],
  updatedAt: null,
};

export default function DashboardPage() {
  const portal = usePortal();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectTemplate, setProjectTemplate] = useState<"blank" | "defi" | "indexing">("blank");
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [announcement, setAnnouncement] = useState<{ id: string; message: string; severity: string } | null>(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [announcementSeverity, setAnnouncementSeverity] = useState<"info" | "warning" | "critical">("info");
  const [announcementStartAt, setAnnouncementStartAt] = useState("");
  const [announcementEndAt, setAnnouncementEndAt] = useState("");
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [whatsNew, setWhatsNew] = useState<{ id: string; title: string; description: string; version: string } | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(() => typeof window !== "undefined" && sessionStorage.getItem("onboarding_banner_dismissed") === "1");
  const [pendingInvitations, setPendingInvitations] = useState<Array<{
    id: string;
    projectId: string;
    projectName: string;
    inviterWallet: string;
    invitedAt: string;
  }>>([]);
  const [celebrationProject, setCelebrationProject] = useState<PortalProject | null>(null);
  const [celebrationRequestSummary, setCelebrationRequestSummary] = useState<{
    method: string;
    latencyMs: number;
    createdAt: string;
  } | null>(null);
  const [cspViolations, setCspViolations] = useState<
    Array<{ blockedUri: string; violatedDirective: string; timestamp: string; receivedAt: string }>
  >([]);
  const [webDeploymentStatus, setWebDeploymentStatus] = useState<WebDeploymentStatus | null>(null);
  const [apiDeploymentStatus, setApiDeploymentStatus] = useState<PortalServiceStatus | null>(null);
  const [gatewayDeploymentStatus, setGatewayDeploymentStatus] = useState<PortalServiceStatus | null>(null);
  const [deploymentReadiness, setDeploymentReadiness] = useState<AdminDeploymentReadiness | null>(null);
  const [adminEmailDeliveryStatus, setAdminEmailDeliveryStatus] = useState<AdminEmailDeliveryStatus | null>(null);
  const [adminObservability, setAdminObservability] = useState<AdminObservability | null>(null);
  const [releaseReadiness, setReleaseReadiness] = useState<ReleaseReadinessSummary | null>(null);
  const [onboardingFunnel7d, setOnboardingFunnel7d] = useState<OnboardingFunnelSummary | null>(null);
  const [onboardingFunnel30d, setOnboardingFunnel30d] = useState<OnboardingFunnelSummary | null>(null);
  const [retentionCohorts, setRetentionCohorts] = useState<RetentionCohortSummary | null>(null);
  const [feedbackInbox, setFeedbackInbox] = useState<FeedbackInboxItem[]>([]);
  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences>(DEFAULT_DASHBOARD_PREFERENCES);
  const [alertsPreview, setAlertsPreview] = useState<AlertCenterItem[]>([]);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const celebrationProjectId = celebrationProject?.id ?? null;
  const isAdminAuthorityWallet =
    portal.walletPhase === "authenticated" &&
    portal.walletAddress === liveDevnetState.adminAuthority &&
    Boolean(portal.token);

  useEffect(() => {
    void getNetworkStats().then(setNetworkStats).catch(() => {});
  }, []);

  useEffect(() => {
    getActiveAnnouncement().then((data) => {
      if (data.announcement) {
        setAnnouncement(data.announcement);
        setAnnouncementDraft(data.announcement.message);
        setAnnouncementSeverity(data.announcement.severity as "info" | "warning" | "critical");
        setAnnouncementStartAt(data.announcement.startAt ? data.announcement.startAt.slice(0, 16) : "");
        setAnnouncementEndAt(data.announcement.endAt ? data.announcement.endAt.slice(0, 16) : "");
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!portal.token || portal.walletPhase !== "authenticated") return;
    getWhatsNew(portal.token).then((data) => {
      if (data.item) setWhatsNew(data.item);
    }).catch(() => undefined);
  }, [portal.token, portal.walletPhase]);

  // Pending invitations: scan all projects for members where userId === portal.user.id and acceptedAt is null
  useEffect(() => {
    if (!portal.token || portal.walletPhase !== "authenticated" || !portal.user || portal.projects.length === 0) return;
    const userId = portal.user.id;
    const tok = portal.token;
    void Promise.all(
      portal.projects.map((project) =>
        listProjectMembers(project.id, tok)
          .then((data) => {
            const pending = data.items.filter(
              (m) => m.userId === userId && m.acceptedAt === null
            );
            return pending.map((m) => ({
              id: m.id,
              projectId: project.id,
              projectName: project.name,
              inviterWallet: project.owner.walletAddress,
              invitedAt: m.invitedAt,
            }));
          })
          .catch(() => [])
      )
    ).then((results) => {
      setPendingInvitations(results.flat());
    });
  }, [portal.token, portal.walletPhase, portal.user, portal.projects]);

  // First-request celebration
  useEffect(() => {
    if (portal.walletPhase !== "authenticated" || portal.loading) return;
    const candidate = portal.projects.find(
      (p) => (p._count?.requestLogs ?? 0) > 0 && !p.firstRequestCelebrationShown
    );
    if (candidate) {
      setCelebrationProject(candidate);
    }
  }, [portal.projects, portal.walletPhase, portal.loading]);

  useEffect(() => {
    if (!celebrationProjectId || !portal.token) {
      setCelebrationRequestSummary(null);
      return;
    }

    let cancelled = false;

    fetch(new URL(`/v1/projects/${celebrationProjectId}/requests/first`, webEnv.apiBaseUrl), {
      headers: {
        authorization: `Bearer ${portal.token}`
      }
    })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{
              item: { method: string; durationMs: number; createdAt: string } | null;
            }>)
          : null
      )
      .then((data) => {
        if (cancelled) return;
        setCelebrationRequestSummary(
          data?.item
            ? {
                method: data.item.method,
                latencyMs: data.item.durationMs,
                createdAt: data.item.createdAt
              }
            : null
        );
      })
      .catch(() => {
        if (cancelled) return;
        setCelebrationRequestSummary(null);
      });

    return () => {
      cancelled = true;
    };
  }, [celebrationProjectId, portal.token]);

  useEffect(() => {
    if (!portal.adminOverview || !portal.token) {
      setCspViolations([]);
      return;
    }

    let cancelled = false;

    fetch(new URL("/v1/admin/csp-violations", webEnv.apiBaseUrl), {
      headers: {
        authorization: `Bearer ${portal.token}`
      }
    })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{
              violations: Array<{
                blockedUri: string;
                violatedDirective: string;
                timestamp: string;
                receivedAt: string;
              }>;
            }>)
          : null
      )
      .then((data) => {
        if (cancelled) return;
        setCspViolations(data?.violations ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setCspViolations([]);
      });

    return () => {
      cancelled = true;
    };
  }, [portal.adminOverview, portal.token]);

  useEffect(() => {
    if (!isAdminAuthorityWallet || !portal.token) {
      setWebDeploymentStatus(null);
      setApiDeploymentStatus(null);
      setGatewayDeploymentStatus(null);
      setDeploymentReadiness(null);
      setAdminEmailDeliveryStatus(null);
      setAdminObservability(null);
      return;
    }

    let cancelled = false;

    Promise.allSettled([
      fetchWebDeploymentStatus(),
      fetchApiStatus(),
      fetchGatewayStatus(),
      getAdminDeploymentReadiness(portal.token),
      getAdminEmailDeliveryStatus(portal.token),
    ])
      .then(([webResult, apiResult, gatewayResult, readinessResult, emailResult]) => {
        if (cancelled) return;

        setWebDeploymentStatus(webResult.status === "fulfilled" ? webResult.value : null);
        setApiDeploymentStatus(apiResult.status === "fulfilled" ? apiResult.value : null);
        setGatewayDeploymentStatus(gatewayResult.status === "fulfilled" ? gatewayResult.value : null);
        setDeploymentReadiness(readinessResult.status === "fulfilled" ? readinessResult.value.item : null);
        setAdminEmailDeliveryStatus(emailResult.status === "fulfilled" ? emailResult.value.item : null);
      })
      .catch(() => {
        if (cancelled) return;
        setWebDeploymentStatus(null);
        setApiDeploymentStatus(null);
        setGatewayDeploymentStatus(null);
        setDeploymentReadiness(null);
        setAdminEmailDeliveryStatus(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdminAuthorityWallet, portal.token]);

  useEffect(() => {
    if (!isAdminAuthorityWallet || !portal.token) {
      setAdminObservability(null);
      return;
    }
    let cancelled = false;
    getAdminObservability(portal.token)
      .then((data) => {
        if (!cancelled) {
          setAdminObservability(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAdminObservability(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAdminAuthorityWallet, portal.token]);

  useEffect(() => {
    if (portal.walletPhase !== "authenticated" || !portal.token) {
      setDashboardPreferences(DEFAULT_DASHBOARD_PREFERENCES);
      setAlertsPreview([]);
      return;
    }
    let cancelled = false;
    Promise.allSettled([
      getDashboardPreferences(portal.token),
      getAlertCenter(portal.token),
    ]).then(([preferencesResult, alertsResult]) => {
      if (cancelled) return;
      setDashboardPreferences(
        preferencesResult.status === "fulfilled" ? preferencesResult.value : DEFAULT_DASHBOARD_PREFERENCES
      );
      setAlertsPreview(alertsResult.status === "fulfilled" ? alertsResult.value.slice(0, 4) : []);
    });
    return () => {
      cancelled = true;
    };
  }, [portal.token, portal.walletPhase]);

  useEffect(() => {
    if (!isAdminAuthorityWallet || !portal.token) {
      setReleaseReadiness(null);
      setOnboardingFunnel7d(null);
      setOnboardingFunnel30d(null);
      setRetentionCohorts(null);
      setFeedbackInbox([]);
      return;
    }
    let cancelled = false;
    Promise.allSettled([
      getReleaseReadiness(portal.token),
      getOnboardingFunnel(7, portal.token),
      getOnboardingFunnel(30, portal.token),
      getRetentionCohorts(portal.token),
      getFeedbackInbox(portal.token),
    ]).then(([readinessResult, funnel7Result, funnel30Result, retentionResult, feedbackResult]) => {
      if (cancelled) return;
      setReleaseReadiness(readinessResult.status === "fulfilled" ? readinessResult.value : null);
      setOnboardingFunnel7d(funnel7Result.status === "fulfilled" ? funnel7Result.value : null);
      setOnboardingFunnel30d(funnel30Result.status === "fulfilled" ? funnel30Result.value : null);
      setRetentionCohorts(retentionResult.status === "fulfilled" ? retentionResult.value : null);
      setFeedbackInbox(feedbackResult.status === "fulfilled" ? feedbackResult.value.items.slice(0, 8) : []);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdminAuthorityWallet, portal.token]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        router.push("/projects?new=1");
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        void navigator.clipboard.writeText(window.location.href);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  function handleCreateClose() {
    setCreateOpen(false);
    setCreateStep(1);
    setSlug("");
    setName("");
    setDescription("");
    setProjectTemplate("blank");
  }

  function handleCelebrationDismiss() {
    const project = celebrationProject;
    setCelebrationProject(null);
    if (!project || !portal.token) return;
    // Best-effort PATCH — dismiss in session regardless of server response
    void fetch(new URL(`/v1/projects/${project.id}`, webEnv.apiBaseUrl), {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${portal.token}`,
      },
      body: JSON.stringify({ firstRequestCelebrationShown: true }),
    }).catch(() => undefined);
  }

  async function handleAcceptInvitation(invitationId: string, projectId: string) {
    if (!portal.token) return;
    await fetch(
      new URL(`/v1/projects/${projectId}/members/${invitationId}/accept`, webEnv.apiBaseUrl),
      {
        method: "PATCH",
        headers: { authorization: `Bearer ${portal.token}` },
      }
    ).catch(() => undefined);
    setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    await portal.refresh();
  }

  async function handleDeclineInvitation(invitationId: string) {
    if (!portal.token) return;
    setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    await fetch(
      new URL(`/v1/me/invitations/${invitationId}`, webEnv.apiBaseUrl),
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${portal.token}` },
      }
    ).catch(() => undefined);
  }

  // Navigate to project page after successful creation
  useEffect(() => {
    if (portal.projectCreationState.phase === "confirmed" && slug && createOpen) {
      handleCreateClose();
      router.push(`/projects/${slug}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal.projectCreationState.phase]);

  const hasProjects = portal.projects.length > 0;
  const workspaceSections = getWorkspaceSections(portal.selectedProject?.slug);
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
  const nextBestAction = (() => {
    if (!portal.selectedProject) {
      return { label: "Create a project", reason: "A project is the control point for funding, API keys, alerts, and analytics.", href: "/dashboard" };
    }
    if (!portal.onchainSnapshot.projectAccountExists) {
      return { label: "Activate your project", reason: "Activation makes the project usable for funded request flow.", href: `/projects/${portal.selectedProject.slug}` };
    }
    if (!hasFunding) {
      return { label: "Fund your project", reason: "Spendable SOL credits are still required before real request flow can happen.", href: "/funding" };
    }
    if (!hasApiKeys) {
      return { label: "Create an API key", reason: "A scoped key is the next unlock for real request traffic.", href: "/api-keys" };
    }
    if (!hasRelayTraffic) {
      return { label: "Send the first request", reason: "You have the infrastructure ready; the next proof point is live traffic.", href: "/playground" };
    }
    return { label: "Open analytics", reason: "Traffic is landing now, so analytics is the best next place to inspect health and latency.", href: "/analytics" };
  })();
  const recentWins = [
    portal.onchainSnapshot.projectAccountExists ? "Project activated" : null,
    hasApiKeys ? "API key ready" : null,
    hasRelayTraffic ? "First request made" : null,
    portal.selectedProject?.isPublic && portal.selectedProject?.publicSlug ? "Public project shared" : null,
  ].filter(Boolean) as string[];
  const orderedHomeWidgets = useMemo(() => {
    const preferred = dashboardPreferences.widgetOrder.filter((widget): widget is DashboardWidgetId =>
      DASHBOARD_WIDGETS.includes(widget as DashboardWidgetId)
    );
    const remaining = DASHBOARD_WIDGETS.filter((widget) => !preferred.includes(widget));
    return [...preferred, ...remaining].filter(
      (widget) => !dashboardPreferences.hiddenWidgets.includes(widget)
    );
  }, [dashboardPreferences]);

  async function persistDashboardWidgetPreferences(next: DashboardPreferences) {
    setDashboardPreferences(next);
    if (!portal.token) return;
    try {
      const saved = await updateDashboardPreferences(
        {
          widgetOrder: next.widgetOrder,
          hiddenWidgets: next.hiddenWidgets,
        },
        portal.token
      );
      setDashboardPreferences(saved);
    } catch {
      // keep optimistic UI; the next refresh will reconcile if needed
    }
  }

  function moveDashboardWidget(widget: DashboardWidgetId, direction: -1 | 1) {
    const current = [...orderedHomeWidgets];
    const index = current.indexOf(widget);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return;
    [current[index], current[nextIndex]] = [current[nextIndex]!, current[index]!];
    void persistDashboardWidgetPreferences({
      ...dashboardPreferences,
      widgetOrder: current,
    });
  }

  function toggleDashboardWidget(widget: DashboardWidgetId) {
    const hidden = dashboardPreferences.hiddenWidgets.includes(widget)
      ? dashboardPreferences.hiddenWidgets.filter((item) => item !== widget)
      : [...dashboardPreferences.hiddenWidgets, widget];
    void persistDashboardWidgetPreferences({
      ...dashboardPreferences,
      hiddenWidgets: hidden,
    });
  }

  function renderHomeWidget(widget: DashboardWidgetId) {
    switch (widget) {
      case "quick_stats":
        return (
          <Card key={widget} className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Quick stats</CardTitle>
              <CardDescription>Today&apos;s calm summary across the current workspace.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Projects</div>
                <div className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">{portal.projects.length}</div>
              </div>
              <div className="rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">API keys</div>
                <div className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">{portal.apiKeys.length}</div>
              </div>
              <div className="rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Requests</div>
                <div className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">{formatInteger(portal.projectAnalytics.totals.requestLogs)}</div>
              </div>
            </CardContent>
          </Card>
        );
      case "next_step":
        return (
          <Card key={widget} className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>What should I do next?</CardTitle>
              <CardDescription>One concrete next step based on the current project state.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-lg font-semibold text-[var(--fyxvo-text)]">{nextBestAction.label}</div>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--fyxvo-text-soft)]">{nextBestAction.reason}</p>
              </div>
              <Button asChild>
                <Link href={nextBestAction.href}>Do this next</Link>
              </Button>
            </CardContent>
          </Card>
        );
      case "recent_wins":
        return (
          <Card key={widget} className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Recent wins</CardTitle>
              <CardDescription>Subtle momentum markers from the live workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentWins.length > 0 ? recentWins.map((item) => (
                <div key={item} className="rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)]">
                  {item}
                </div>
              )) : (
                <Notice tone="neutral" title="Wins will appear as you progress">
                  Activate a project, fund it, create a key, or send traffic to start building a visible operating history.
                </Notice>
              )}
            </CardContent>
          </Card>
        );
      case "alerts_preview":
        return (
          <Card key={widget} className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Alerts preview</CardTitle>
              <CardDescription>The latest operational signals without leaving the dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {alertsPreview.length > 0 ? alertsPreview.map((item) => (
                <div key={item.id} className="rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-[var(--fyxvo-text)]">{item.title}</div>
                    <Badge tone={item.severity === "critical" ? "danger" : item.severity === "warning" ? "warning" : "neutral"}>
                      {item.state}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.description}</p>
                </div>
              )) : (
                <Notice tone="success" title="No active alerts right now">
                  The current workspace is clear on recent low balance, webhook, assistant, and incident-linked alerts.
                </Notice>
              )}
              <Button asChild size="sm" variant="secondary">
                <Link href="/alerts">Open alert center</Link>
              </Button>
            </CardContent>
          </Card>
        );
      case "project_list":
        return (
          <Card key={widget} className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Project list</CardTitle>
              <CardDescription>Keep the active workspace close when switching between operating surfaces.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {portal.projects.slice(0, 4).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.slug}`}
                  className="block rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
                >
                  <div className="text-sm font-semibold text-[var(--fyxvo-text)]">{project.name}</div>
                  <div className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">{project.slug}</div>
                </Link>
              ))}
            </CardContent>
          </Card>
        );
      case "gateway_health":
        return <GatewayHealthCard key={widget} />;
      default:
        return null;
    }
  }

  async function updateFeedbackItemStatus(
    item: FeedbackInboxItem,
    status: FeedbackInboxItem["status"],
    tags?: readonly string[]
  ) {
    if (!portal.token) return;
    await updateFeedbackInboxItem(
      {
        type: item.type,
        id: item.id,
        status,
        ...(tags ? { tags } : {}),
      },
      portal.token
    );
    setFeedbackInbox((current) =>
      current.map((entry) =>
        entry.id === item.id && entry.type === item.type
          ? { ...entry, status, ...(tags ? { tags } : {}) }
          : entry
      )
    );
  }
  async function saveAnnouncementSchedule() {
    if (!portal.token || !announcementDraft.trim()) return;
    setAnnouncementSaving(true);
    try {
      await fetch(new URL("/v1/admin/announcements", webEnv.apiBaseUrl), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${portal.token}`,
        },
        body: JSON.stringify({
          message: announcementDraft,
          severity: announcementSeverity,
          startAt: announcementStartAt ? new Date(announcementStartAt).toISOString() : null,
          endAt: announcementEndAt ? new Date(announcementEndAt).toISOString() : null,
        }),
      });
      setAnnouncement({
        id: announcement?.id ?? crypto.randomUUID(),
        message: announcementDraft,
        severity: announcementSeverity,
      });
    } finally {
      setAnnouncementSaving(false);
    }
  }

  const journeySteps = [
    {
      title: "Connect wallet",
      href: "/dashboard",
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
      href: hasProjects ? `/projects/${portal.selectedProject?.slug ?? ""}` : "/dashboard",
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
      href: "/funding",
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
      href: "/api-keys",
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
      href: "/playground",
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
      href: "/analytics",
      body: "Once traffic lands, use analytics and status to validate latency, errors, and spend posture.",
      complete: hasRelayTraffic,
      action: (
        <Button asChild size="sm" variant="secondary">
          <Link href="/analytics">Open analytics</Link>
        </Button>
      ),
    },
  ];

  const hasCompletedOnboarding = journeySteps.every((s) => s.complete);
  const incompleteSteps = journeySteps.filter((s) => !s.complete);
  const nextStep = incompleteSteps[0];

  const availableSolCredits = portal.onchainSnapshot.balances?.availableSolCredits;
  const availableSolDisplay = availableSolCredits
    ? `${(Number(BigInt(availableSolCredits)) / 1e9).toFixed(3)} SOL`
    : "0.000 SOL";

  const totalRequests = portal.projectAnalytics.totals.requestLogs;
  const successCount = portal.projectAnalytics.statusCodes
    .filter((entry) => entry.statusCode < 400)
    .reduce((sum, entry) => sum + entry.count, 0);
  const successRateDisplay =
    totalRequests > 0 ? formatPercent((successCount / totalRequests) * 100) : "–";

  const activeProjects = portal.projects.filter((p) => !p.archivedAt);

  return (
    <div className="space-y-10 lg:space-y-12">
      <TosModal />
      {celebrationProject ? (
        <FirstRequestCelebration
          project={celebrationProject}
          requestSummary={celebrationRequestSummary}
          onDismiss={handleCelebrationDismiss}
        />
      ) : null}
      {pendingInvitations.length > 0 ? (
        <div className="space-y-3">
          {pendingInvitations.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[var(--fyxvo-text)]">
                  You have been invited to{" "}
                  <span className="font-semibold">{inv.projectName}</span>
                </p>
                <p className="text-xs text-[var(--fyxvo-text-muted)]">
                  Invited by {inv.inviterWallet.slice(0, 8)}…{inv.inviterWallet.slice(-4)} on{" "}
                  {new Date(inv.invitedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleAcceptInvitation(inv.id, inv.projectId)}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleDeclineInvitation(inv.id)}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {announcement && !announcementDismissed && (
        <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 ${
          announcement.severity === "critical"
            ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
            : announcement.severity === "warning"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "border-brand-500/30 bg-brand-500/10 text-[var(--fyxvo-text)]"
        }`}>
          <p className="text-sm">{announcement.message}</p>
          <button
            onClick={() => setAnnouncementDismissed(true)}
            className="shrink-0 text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {whatsNew && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">What&apos;s new in {whatsNew.version}</p>
            <p className="mt-0.5 text-sm font-medium text-[var(--fyxvo-text)]">{whatsNew.title}</p>
            <p className="text-xs text-[var(--fyxvo-text-muted)]">{whatsNew.description}</p>
          </div>
          <button
            onClick={() => {
              setWhatsNew(null);
              if (portal.token) void dismissWhatsNew(whatsNew.version, portal.token);
            }}
            className="shrink-0 text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {portal.walletPhase === "authenticated" && portal.selectedProject ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-[var(--fyxvo-text-muted)]">Project</span>
              <span className="text-sm font-semibold text-[var(--fyxvo-text)]">
                {portal.selectedProject.name}
              </span>
            </div>
            <span className="rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-2 py-0.5 font-mono text-xs text-[var(--fyxvo-text-muted)]">
              {portal.selectedProject.slug}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              {portal.onchainSnapshot.projectAccountExists ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Activated
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    Not activated
                  </span>
                </>
              )}
            </div>
            {portal.projects.length > 1 ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/projects">Switch project</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

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

      {portal.walletPhase === "authenticated" ? (
        <section className="space-y-4">
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Dashboard home</CardTitle>
              <CardDescription>Reorder or hide the widgets you want closest during day-to-day operation.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              {DASHBOARD_WIDGETS.map((widget) => {
                const hidden = dashboardPreferences.hiddenWidgets.includes(widget);
                const currentIndex = orderedHomeWidgets.indexOf(widget);
                return (
                  <div
                    key={widget}
                    className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-[var(--fyxvo-text)]">
                        {widget.replace(/_/g, " ")}
                      </div>
                      <div className="text-xs text-[var(--fyxvo-text-muted)]">
                        {hidden ? "Hidden from home" : "Visible on home"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => moveDashboardWidget(widget, -1)} disabled={currentIndex <= 0 || hidden}>
                        Up
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => moveDashboardWidget(widget, 1)} disabled={currentIndex < 0 || currentIndex === orderedHomeWidgets.length - 1 || hidden}>
                        Down
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleDashboardWidget(widget)}>
                        {hidden ? "Show" : "Hide"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <section className="grid gap-4 xl:grid-cols-2">
            {orderedHomeWidgets.map((widget) => renderHomeWidget(widget))}
          </section>
        </section>
      ) : null}

      <QuickstartLauncher project={portal.selectedProject} />

      {portal.walletPhase === "authenticated" ? (
        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>What should I do next?</CardTitle>
              <CardDescription>One concrete next step based on the current project state, not a generic checklist.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-lg font-semibold text-[var(--fyxvo-text)]">{nextBestAction.label}</div>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--fyxvo-text-soft)]">{nextBestAction.reason}</p>
              </div>
              <Button asChild>
                <Link href={nextBestAction.href}>Do this next</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Recent wins</CardTitle>
              <CardDescription>Subtle momentum markers from the real current workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentWins.length > 0 ? recentWins.map((item) => (
                <div key={item} className="rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)]">
                  {item}
                </div>
              )) : (
                <Notice tone="neutral" title="Wins will appear as you progress">
                  Activate a project, fund it, create a key, or send traffic to start building a visible operating history.
                </Notice>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {!hasCompletedOnboarding && !bannerDismissed && !portal.loading && portal.user && nextStep ? (
        <div className="mb-4 flex items-center justify-between rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm">
          <span className="text-[var(--fyxvo-text-muted)]">
            <span className="font-medium text-[var(--fyxvo-text)]">{incompleteSteps.length} step{incompleteSteps.length !== 1 ? "s" : ""}</span>
            {" "}remaining to your first Fyxvo request.{" "}
            <Link href={nextStep.href} className="underline text-[var(--fyxvo-brand)]">
              {nextStep.title} →
            </Link>
          </span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => { sessionStorage.setItem("onboarding_banner_dismissed", "1"); setBannerDismissed(true); }}
            className="ml-4 text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
          >
            ✕
          </button>
        </div>
      ) : null}

      {portal.walletPhase === "authenticated" ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
            <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Active projects</p>
            <p className="mt-1 font-display text-2xl font-semibold text-[var(--fyxvo-text)]">{activeProjects.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
            <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Active API keys</p>
            <p className="mt-1 font-display text-2xl font-semibold text-[var(--fyxvo-text)]">{portal.apiKeys.filter((k) => k.status === "ACTIVE").length}</p>
          </div>
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
            <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Total requests</p>
            <p className="mt-1 font-display text-2xl font-semibold text-[var(--fyxvo-text)]">{portal.projects.reduce((s, p) => s + (p._count?.requestLogs ?? 0), 0).toLocaleString()}</p>
          </div>
        </div>
      ) : null}

      {portal.walletPhase === "authenticated" && portal.projects.length > 1 ? (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
          <span className="text-sm text-[var(--fyxvo-text-soft)]">You have {portal.projects.length} projects.</span>
          <Button asChild variant="secondary" size="sm">
            <Link href="/compare">Compare projects</Link>
          </Button>
        </div>
      ) : null}

      {portal.walletPhase !== "authenticated" ? <AuthGate /> : null}
      {portal.loading ? <LoadingGrid /> : null}

      <Modal
        open={createOpen}
        onClose={handleCreateClose}
        title={
          createStep === 1 ? "Name your project" :
          createStep === 2 ? "Choose a template" :
          "Review and activate"
        }
        description={
          createStep === 1 ? "Give your project a name. The slug is generated automatically and can be adjusted." :
          createStep === 2 ? "Select a starting template for your project configuration." :
          "Confirm the details below. Activation creates the on-chain project account."
        }
        footer={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[var(--fyxvo-text-muted)]">
              Step {createStep} of 3{createStep === 3 ? ` · ${portal.projectCreationState.message}` : ""}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {createStep > 1 ? (
                <Button variant="ghost" onClick={() => setCreateStep((s) => (s - 1) as 1 | 2 | 3)}>
                  Back
                </Button>
              ) : (
                <Button variant="ghost" onClick={handleCreateClose}>
                  Cancel
                </Button>
              )}
              {createStep === 1 ? (
                <Button
                  onClick={() => setCreateStep(2)}
                  disabled={!name || name.trim().length < 2}
                >
                  Next
                </Button>
              ) : createStep === 2 ? (
                <Button onClick={() => setCreateStep(3)}>
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    void portal.createProject({
                      slug,
                      name,
                      ...(description ? { description } : {}),
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
              )}
            </div>
          </div>
        }
      >
        {createStep === 1 && (
          <div className="space-y-4">
            <Input
              label="Project name"
              value={name}
              onChange={(event) => {
                const v = event.target.value;
                setName(v);
                setSlug(v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64));
              }}
              placeholder="Northwind Relay"
            />
            <Input
              label="Project slug"
              value={slug}
              onChange={(event) =>
                setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
              }
              placeholder="northwind-relay"
              hint="Lowercase letters, numbers, and hyphens only. Auto-generated from the name."
            />
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--fyxvo-text-soft)]">Description (optional)</span>
              <textarea
                className="min-h-20 rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-4 py-3 text-[var(--fyxvo-text)] outline-none transition focus:border-brand-400"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Explain how this project will use Fyxvo on devnet."
              />
            </label>
          </div>
        )}
        {createStep === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--fyxvo-text-muted)]">Choose a starting template for your project:</p>
            {[
              { id: "blank" as const, name: "Blank project", desc: "No configuration. Configure everything yourself." },
              { id: "defi" as const, name: "DeFi trading", desc: "Optimized for sendTransaction and priority relay. Suggested funding: 0.1 SOL." },
              { id: "indexing" as const, name: "Data indexing", desc: "Optimized for high-volume reads. Ideal for getProgramAccounts workflows." },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setProjectTemplate(t.id)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${projectTemplate === t.id ? "border-brand-500/50 bg-brand-500/10" : "border-[var(--fyxvo-border)] hover:border-brand-500/30"}`}
              >
                <p className="font-medium text-[var(--fyxvo-text)]">{t.name}</p>
                <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">{t.desc}</p>
              </button>
            ))}
          </div>
        )}
        {createStep === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[var(--fyxvo-text-muted)]">Name</span>
                <span className="font-medium text-[var(--fyxvo-text)]">{name}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[var(--fyxvo-text-muted)]">Slug</span>
                <span className="font-mono text-sm text-[var(--fyxvo-text)]">{slug}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[var(--fyxvo-text-muted)]">Network</span>
                <Badge tone="success">Solana Devnet</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[var(--fyxvo-text-muted)]">Template</span>
                <span className="text-sm font-medium text-[var(--fyxvo-text)] capitalize">{projectTemplate === "blank" ? "Blank project" : projectTemplate === "defi" ? "DeFi trading" : "Data indexing"}</span>
              </div>
              {description ? (
                <div className="border-t border-[var(--fyxvo-border)] pt-3">
                  <p className="text-xs text-[var(--fyxvo-text-muted)]">Description</p>
                  <p className="mt-1 text-sm text-[var(--fyxvo-text-soft)]">{description}</p>
                </div>
              ) : null}
            </div>
            {portal.projectCreationState.phase === "error" ? (
              <Notice tone="warning" title="Activation failed">
                {portal.projectCreationState.message}
              </Notice>
            ) : null}
          </div>
        )}
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
                  <div className="text-xs uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">
                    Step {index + 1}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item}</p>
                </div>
              ))}
            </CardContent>
            <div className="px-6 pb-6">
              <Button onClick={() => setCreateOpen(true)}>
                Create your first project
              </Button>
            </div>
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
                    <div className="text-xs uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">
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
                {step.title === "Generate API key" && !hasApiKeys && (
                  <div className="mt-2 rounded-lg border border-[var(--fyxvo-brand,#7c3aed)]/20 bg-[var(--fyxvo-brand,#7c3aed)]/5 px-4 py-3">
                    <p className="text-sm font-medium text-[var(--fyxvo-text)]">
                      You don&apos;t have any API keys yet.
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--fyxvo-text-muted)]">
                      Create one to start routing requests.
                    </p>
                    <Link
                      href="/api-keys"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[var(--fyxvo-brand,#7c3aed)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
                    >
                      Create API key →
                    </Link>
                  </div>
                )}
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

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          label="Total Requests"
          value={formatInteger(portal.projectAnalytics.totals.requestLogs)}
          detail="Relay request logs recorded for the selected project."
          accent={<DeltaBadge value="log-backed" />}
        />
        <MetricCard
          label="Success Rate"
          value={successRateDisplay}
          detail="Requests returning a status code below 400, relative to total requests."
          accent={<DeltaBadge value="observed" positive={successCount >= totalRequests * 0.9} />}
        />
        <MetricCard
          label="Avg Latency"
          value={formatDuration(portal.projectAnalytics.latency.averageMs)}
          detail="Mean end-to-end latency across all recorded relay requests."
          accent={<DeltaBadge value="ms" />}
        />
        <MetricCard
          label="Available SOL"
          value={availableSolDisplay}
          detail="Spendable SOL credits in the project treasury available for relay access."
          accent={<DeltaBadge value="chain-backed" />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <GatewayHealthCard />
        {portal.projectAnalytics.totals.requestLogs > 0 ? (
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[var(--fyxvo-text)]">Recent Requests</h3>
              <p className="mt-0.5 text-xs text-[var(--fyxvo-text-muted)]">
                Latest relay calls for the selected project
              </p>
            </div>
            <div className="space-y-2">
              {portal.projectAnalytics.recentRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium text-[var(--fyxvo-text)]">
                      {request.method} {request.route}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--fyxvo-text-muted)]">
                      {request.service.toUpperCase()} · {formatRelativeDate(request.createdAt)} · {formatDuration(request.durationMs)}
                    </div>
                  </div>
                  <Badge tone={request.statusCode >= 400 ? "warning" : "success"}>
                    {request.statusCode}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <OnboardingChecklist
            projectId={portal.selectedProject?.id ?? ""}
            projectSlug={portal.selectedProject?.slug ?? ""}
            onchain={portal.onchainSnapshot}
            apiKeys={portal.apiKeys}
            requestCount={portal.projectAnalytics.totals.requestLogs}
          />
        )}
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
        <div className="space-y-3">
          {(() => {
            const allTags = [...new Set(
              portal.projects.flatMap((p) => (p as { tags?: string[] }).tags ?? [])
            )];
            return allTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTagFilter((prev) => (prev === tag ? null : tag))}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      activeTagFilter === tag
                        ? "bg-[var(--fyxvo-brand)] text-white"
                        : "bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {activeTagFilter ? (
                  <button
                    type="button"
                    onClick={() => setActiveTagFilter(null)}
                    className="rounded-full border border-[var(--fyxvo-border)] px-2 py-1 text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
                  >
                    Clear filter
                  </button>
                ) : null}
              </div>
            ) : null;
          })()}
          <Table
            columns={projectColumns}
            rows={activeTagFilter
              ? portal.projects.filter((p) =>
                  ((p as { tags?: string[] }).tags ?? []).includes(activeTagFilter)
                )
              : portal.projects
            }
            getRowKey={(item) => item.id}
          />
        </div>

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
            {networkStats?.totalSolFees !== undefined && (
              <MetricCard
                label="Total SOL collected"
                value={networkStats.totalSolFees ? formatSol(Number(BigInt(networkStats.totalSolFees)) / 1_000_000_000) : "0 SOL"}
                detail="Total lamports from confirmed funding transactions across all projects."
                accent={<DeltaBadge value="all-time" />}
              />
            )}
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
                <CardTitle>Founder follow-up rhythm</CardTitle>
                <CardDescription>
                  This is the lightweight founder workflow for reviewing new teams without
                  pretending there is a full CRM behind the product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                <p>
                  Start with the interest queue when the question is fit, traffic shape, founder
                  review, or rollout planning. Use the feedback queue when the question is bug
                  reproduction, onboarding friction, or direct support.
                </p>
                <p>
                  For each serious early team, capture the concrete use case, expected request
                  volume, whether priority relay matters, whether operator participation came up,
                  the first blocker, and the next committed action.
                </p>
                <p>
                  Keep the success bar honest: one wallet can sign, one project can activate, one
                  SOL funding transaction can confirm, and one key can send one real request.
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
                <Notice tone="neutral" title="Lightweight notes, not a fake CRM">
                  The current product supports queue status and context, not account-planning
                  automation. Follow-up notes should stay simple: owner, date, use case, blocker,
                  and next action.
                </Notice>
              </CardContent>
            </Card>
          </section>

          {isAdminAuthorityWallet ? (
            <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <CardTitle>Deployment readiness</CardTitle>
                <CardDescription>
                  Lightweight release checks for commit lineage, assistant health, and production
                  migration drift.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Frontend commit",
                      value: formatCommitSha(webDeploymentStatus?.commit),
                      detail: webDeploymentStatus?.environment ?? "Environment unavailable"
                    },
                    {
                      label: "API commit",
                      value: formatCommitSha(apiDeploymentStatus?.commit ?? deploymentReadiness?.commit),
                      detail: apiDeploymentStatus?.version ?? deploymentReadiness?.version ?? "Version unavailable"
                    },
                    {
                      label: "Gateway commit",
                      value: formatCommitSha(gatewayDeploymentStatus?.commit),
                      detail: gatewayDeploymentStatus?.environment ?? "Environment unavailable"
                    },
                    {
                      label: "Checked at",
                      value: formatRelativeDate(deploymentReadiness?.timestamp ?? new Date().toISOString()),
                      detail: deploymentReadiness?.environment ?? "Environment unavailable"
                    }
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[1.25rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-4 py-4"
                    >
                      <div className="text-xs uppercase tracking-[0.14em] text-[color:var(--fyxvo-text-muted)]">
                        {item.label}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-[color:var(--fyxvo-text)]">{item.value}</div>
                      <div className="mt-1 text-xs text-[color:var(--fyxvo-text-muted)]">{item.detail}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-[1.25rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={(apiDeploymentStatus?.assistantAvailable ?? deploymentReadiness?.assistantAvailable) ? "success" : "warning"}>
                        {(apiDeploymentStatus?.assistantAvailable ?? deploymentReadiness?.assistantAvailable)
                          ? "Assistant available"
                          : "Assistant unavailable"}
                      </Badge>
                      <Badge tone={deploymentReadiness?.pendingMigrations.detected ? "warning" : "success"}>
                        {deploymentReadiness?.pendingMigrations.detected
                          ? `${deploymentReadiness.pendingMigrations.count} migration${deploymentReadiness.pendingMigrations.count === 1 ? "" : "s"} pending`
                          : "No pending migrations"}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-[color:var(--fyxvo-text-muted)]">
                      <div className="flex items-center justify-between gap-3">
                        <span>API environment</span>
                        <span className="font-medium text-[color:var(--fyxvo-text)]">
                          {apiDeploymentStatus?.environment ?? deploymentReadiness?.environment ?? "Unavailable"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Gateway region</span>
                        <span className="font-medium text-[color:var(--fyxvo-text)]">
                          {gatewayDeploymentStatus?.region ?? "Unavailable"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Migration check</span>
                        <span className="font-medium text-[color:var(--fyxvo-text)]">
                          {deploymentReadiness?.pendingMigrations.checkedAt
                            ? formatRelativeDate(deploymentReadiness.pendingMigrations.checkedAt)
                            : "Unavailable"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.25rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-[color:var(--fyxvo-text-muted)]">
                      Migration notes
                    </div>
                    {deploymentReadiness?.pendingMigrations.error ? (
                      <p className="mt-3 text-sm leading-6 text-[color:var(--fyxvo-text-muted)]">
                        Prisma migration status could not be confirmed: {deploymentReadiness.pendingMigrations.error}
                      </p>
                    ) : deploymentReadiness?.pendingMigrations.names.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {deploymentReadiness.pendingMigrations.names.slice(0, 4).map((name) => (
                          <Badge key={name} tone="warning">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-[color:var(--fyxvo-text-muted)]">
                        Production schema matches the committed Prisma migrations.
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button asChild size="sm" variant="secondary">
                        <Link href="/status">Open status page</Link>
                      </Button>
                      <Button asChild size="sm" variant="secondary">
                        <Link href="/assistant">Open assistant</Link>
                      </Button>
                    </div>
                  </div>
                </div>

                {adminEmailDeliveryStatus ? (
                  <div className="rounded-[1.25rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.14em] text-[color:var(--fyxvo-text-muted)]">
                          Email delivery
                        </div>
                        <div className="mt-2 text-sm text-[color:var(--fyxvo-text-muted)]">
                          Verification, digests, and operational notices from the live provider.
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={adminEmailDeliveryStatus.configured ? "success" : "warning"}>
                          {adminEmailDeliveryStatus.configured ? "Configured" : "Not configured"}
                        </Badge>
                        <Badge tone={adminEmailDeliveryStatus.digestEnabledUsers > 0 ? "success" : "neutral"}>
                          {adminEmailDeliveryStatus.digestEnabledUsers} digest users
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        {
                          label: "Verified inboxes",
                          value: formatInteger(adminEmailDeliveryStatus.verifiedUsers),
                          detail: adminEmailDeliveryStatus.fromAddress ?? "No sender configured",
                        },
                        {
                          label: "Digest schedules",
                          value: formatInteger(adminEmailDeliveryStatus.activeDigestSchedules),
                          detail: `${formatInteger(adminEmailDeliveryStatus.statusSubscribers)} status subscribers`,
                        },
                        {
                          label: "Latest generated digest",
                          value: adminEmailDeliveryStatus.latestDigestGeneratedAt
                            ? formatRelativeDate(adminEmailDeliveryStatus.latestDigestGeneratedAt)
                            : "None yet",
                          detail: adminEmailDeliveryStatus.latestDigestSentAt
                            ? `Sent ${formatRelativeDate(adminEmailDeliveryStatus.latestDigestSentAt)}`
                            : "No sent digest recorded",
                        },
                        {
                          label: "Reply-to",
                          value: adminEmailDeliveryStatus.replyToAddress ?? "Default sender",
                          detail: `Provider ${adminEmailDeliveryStatus.provider}`,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-[1.1rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-bg)] px-4 py-4"
                        >
                          <div className="text-xs uppercase tracking-[0.14em] text-[color:var(--fyxvo-text-muted)]">
                            {item.label}
                          </div>
                          <div className="mt-2 text-base font-semibold text-[color:var(--fyxvo-text)]">{item.value}</div>
                          <div className="mt-1 text-xs text-[color:var(--fyxvo-text-muted)]">{item.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {isAdminAuthorityWallet && releaseReadiness ? (
            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <CardTitle>Release readiness</CardTitle>
                <CardDescription>
                  Founder cockpit for infrastructure, product traction, and operational posture using live platform data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(releaseReadiness, null, 2)], { type: "application/json" });
                      const href = URL.createObjectURL(blob);
                      const anchor = document.createElement("a");
                      anchor.href = href;
                      anchor.download = "fyxvo-release-readiness.json";
                      anchor.click();
                      URL.revokeObjectURL(href);
                    }}
                  >
                    Export JSON
                  </Button>
                </div>
                <div className="grid gap-4 xl:grid-cols-3">
                  {[
                    {
                      title: "Infrastructure",
                      status: releaseReadiness.infrastructure.status,
                      lines: [
                        `Frontend ${formatCommitSha(webDeploymentStatus?.commit)}`,
                        `API ${formatCommitSha(releaseReadiness.infrastructure.apiCommit)}`,
                        `Gateway ${gatewayDeploymentStatus?.status ?? releaseReadiness.infrastructure.gatewayHealth}`,
                        `${releaseReadiness.infrastructure.currentIncidentCount} active incidents`,
                        `${releaseReadiness.infrastructure.cspViolationsLast24h} CSP violations / 24h`,
                        `${releaseReadiness.infrastructure.webhookFailureRate}% webhook failures / 24h`,
                      ],
                    },
                    {
                      title: "Product",
                      status: releaseReadiness.product.status,
                      lines: [
                        `${formatInteger(releaseReadiness.product.totalUsers)} users`,
                        `${formatInteger(releaseReadiness.product.totalActiveProjects)} active projects`,
                        `${formatInteger(releaseReadiness.product.projectsWithRecentTraffic)} projects with recent traffic`,
                        `${releaseReadiness.product.projectsWithLowBalanceAlerts} low-balance projects`,
                        `${releaseReadiness.product.projectsWithHighErrorRates} high-error projects`,
                        `${formatInteger(releaseReadiness.product.assistantUsageToday)} assistant prompts today`,
                      ],
                    },
                    {
                      title: "Operations",
                      status: releaseReadiness.operations.status,
                      lines: [
                        releaseReadiness.operations.pendingMigrations.detected
                          ? `${releaseReadiness.operations.pendingMigrations.count} pending migrations`
                          : "No pending migrations",
                        `${releaseReadiness.operations.openSupportTickets} open support tickets`,
                        `${releaseReadiness.operations.activeIncidents.length} active incidents`,
                        `${releaseReadiness.operations.statusSubscriberCount} status subscribers`,
                        releaseReadiness.operations.latestAnnouncement
                          ? `Announcement: ${releaseReadiness.operations.latestAnnouncement.severity}`
                          : "No announcement",
                        releaseReadiness.operations.latestChangelogVersion
                          ? `Changelog ${releaseReadiness.operations.latestChangelogVersion.version}`
                          : "No changelog version",
                      ],
                    },
                  ].map((section) => (
                    <div
                      key={section.title}
                      className="rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-[var(--fyxvo-text)]">{section.title}</div>
                        <Badge tone={section.status === "healthy" ? "success" : section.status === "blocked" ? "danger" : "warning"}>
                          {section.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-[var(--fyxvo-text-soft)]">
                        {section.lines.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              </Card>

              <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
                <CardHeader>
                  <CardTitle>Onboarding funnel</CardTitle>
                  <CardDescription>Counts and conversion posture across the last 7 and 30 days.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(onboardingFunnel7d?.steps ?? []).map((step, index) => (
                    <div
                      key={step.key}
                      className="rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[var(--fyxvo-text)]">{step.label}</div>
                          <div className="text-xs text-[var(--fyxvo-text-muted)]">
                            {index === 0 ? "Top of funnel" : `${step.conversionPercentage}% conversion from previous step`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-[var(--fyxvo-text)]">{formatInteger(step.count)}</div>
                          <div className="text-xs text-[var(--fyxvo-text-muted)]">
                            30d: {formatInteger(onboardingFunnel30d?.steps[index]?.count ?? 0)} · {step.trend}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          ) : null}

          {isAdminAuthorityWallet && retentionCohorts ? (
            <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <CardTitle>Retention and usage cohorts</CardTitle>
                <CardDescription>
                  Real user return behavior, adoption surfaces, and repeat traffic posture across 7-day, 30-day, and all-time windows.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 xl:grid-cols-3">
                {[
                  { label: "7 days", data: retentionCohorts.sevenDay },
                  { label: "30 days", data: retentionCohorts.thirtyDay },
                  { label: "All time", data: retentionCohorts.allTime },
                ].map((window) => (
                  <div key={window.label} className="rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-[var(--fyxvo-text)]">{window.label}</div>
                      <Badge tone="neutral">{formatInteger(window.data.totals.newUsers)} new users</Badge>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-[var(--fyxvo-text-soft)]">
                      <div>D1 returners: {formatInteger(window.data.retained.day1)}</div>
                      <div>D7 returners: {formatInteger(window.data.retained.day7)}</div>
                      <div>D30 returners: {formatInteger(window.data.retained.day30)}</div>
                      <div>Projects with first traffic: {formatInteger(window.data.totals.firstTrafficProjects)}</div>
                      <div>Projects with repeat traffic: {formatInteger(window.data.totals.repeatTrafficProjects)}</div>
                      <div>Assistant users: {formatInteger(window.data.totals.assistantUsers)}</div>
                      <div>Playground users: {formatInteger(window.data.totals.playgroundUsers)}</div>
                      <div>API key creators: {formatInteger(window.data.totals.apiKeyCreators)}</div>
                      <div>Funded users: {formatInteger(window.data.totals.fundedUsers)}</div>
                      <div>Public sharers / leaderboard opt-ins: {formatInteger(window.data.totals.publicSharers)}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {isAdminAuthorityWallet && feedbackInbox.length > 0 ? (
            <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <CardTitle>Feedback inbox</CardTitle>
                <CardDescription>
                  Triage incoming feedback, assistant sentiment, support work, newsletter sources, and referral conversions in one queue.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-2">
                {feedbackInbox.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{item.type.replace(/_/g, " ")}</Badge>
                      <Badge tone={item.status === "resolved" ? "success" : item.status === "planned" ? "warning" : "neutral"}>
                        {item.status}
                      </Badge>
                      {item.tags.map((tag) => (
                        <Badge key={tag} tone="brand">{tag}</Badge>
                      ))}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-[var(--fyxvo-text)]">{item.title}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.summary}</p>
                    <div className="mt-2 text-xs text-[var(--fyxvo-text-muted)]">
                      {item.actor} · {item.source} · {formatRelativeDate(item.createdAt)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="ghost" onClick={() => void updateFeedbackItemStatus(item, "reviewed")}>
                        Reviewed
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void updateFeedbackItemStatus(item, "planned")}>
                        Planned
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void updateFeedbackItemStatus(item, "resolved")}>
                        Resolved
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const next = window.prompt("Comma-separated tags", item.tags.join(", "));
                          if (next === null) return;
                          const tags = next
                            .split(",")
                            .map((tag) => tag.trim())
                            .filter(Boolean);
                          void updateFeedbackItemStatus(item, item.status, tags);
                        }}
                      >
                        Edit tags
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {isAdminAuthorityWallet && adminObservability ? (
            <Card id="admin-observability" className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <CardTitle>Admin observability</CardTitle>
                <CardDescription>
                  Operational hotspots across failing methods, webhook destinations, project error posture, runway risk, assistant health, and support categories.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 xl:grid-cols-3">
                {[
                  {
                    label: "Top failing RPC methods",
                    items: adminObservability.topFailingMethods.map((item) => `${item.route} · ${item.count}`),
                  },
                  {
                    label: "Top webhook failure destinations",
                    items: adminObservability.topWebhookFailureDestinations.map((item) => `${item.url} · ${item.failures}`),
                  },
                  {
                    label: "Projects with highest error rate",
                    items: adminObservability.highestErrorRateProjects.map(
                      (item) => `${item.projectName} · ${formatPercent(item.errorRate * 100)}`
                    ),
                  },
                  {
                    label: "Lowest remaining runway",
                    items: adminObservability.lowestRemainingRunwayProjects.map(
                      (item) => `${item.projectName} · ${item.requestCount7d.toLocaleString()} req / 7d`
                    ),
                  },
                  {
                    label: "Assistant reliability",
                    items: [
                      `Error rate · ${formatPercent(adminObservability.assistant.errorRate * 100)}`,
                      `Average latency · ${formatDuration(adminObservability.assistant.averageLatencyMs)}`,
                    ],
                  },
                  {
                    label: "Support categories",
                    items: adminObservability.supportCategories.map(
                      (item) => `${item.category.replace(/_/g, " ").toLowerCase()} · ${item.count}`
                    ),
                  },
                ].map((section) => (
                  <div
                    key={section.label}
                    className="rounded-[1.25rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
                  >
                    <div className="text-xs uppercase tracking-[0.14em] text-[color:var(--fyxvo-text-muted)]">
                      {section.label}
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-[color:var(--fyxvo-text-soft)]">
                      {section.items.length > 0 ? (
                        section.items.slice(0, 5).map((item) => <div key={item}>{item}</div>)
                      ) : (
                        <div>No signals yet.</div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {isAdminAuthorityWallet ? (
            <Card id="admin-actions" className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <CardTitle>Admin actions</CardTitle>
                <CardDescription>Quick operational jumps for the things that usually need attention first.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[
                  { label: "View active incidents", href: "/status" },
                  { label: "View unresolved support tickets", href: "/support" },
                  { label: "View webhook failure clusters", href: "/alerts?type=webhook_failure" },
                  { label: "View assistant feedback", href: "/assistant" },
                  { label: "View lowest-runway projects", href: "/dashboard#admin-observability" },
                  { label: "View highest-error-rate projects", href: "/dashboard#admin-observability" },
                  { label: "Create system announcement", href: "/dashboard#announcement-scheduling" },
                ].map((action) => (
                  <Button key={action.label} asChild variant="secondary" size="sm">
                    <Link href={action.href}>{action.label}</Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {cspViolations.length > 0 ? (
            <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <CardTitle>Recent CSP violations</CardTitle>
                <CardDescription>
                  Browser CSP reports forwarded through `/api/csp-report`, with blocked URLs,
                  violated directives, and timestamps for quick admin review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {cspViolations.map((violation) => (
                  <div
                    key={`${violation.receivedAt}-${violation.blockedUri}-${violation.violatedDirective}`}
                    className="rounded-[1.25rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="warning">{violation.violatedDirective}</Badge>
                      <span className="text-xs text-[var(--fyxvo-text-muted)]">
                        {formatRelativeDate(violation.timestamp)}
                      </span>
                    </div>
                    <div className="mt-2 break-all text-sm text-[var(--fyxvo-text)]">
                      {violation.blockedUri}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {isAdminAuthorityWallet ? (
            <Card id="announcement-scheduling" className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <CardTitle>Announcement scheduling</CardTitle>
                <CardDescription>
                  Schedule a system announcement with optional start and end times. Active announcements are shown only while the current time is inside the configured window.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-[1fr_180px_180px_180px]">
                <Input
                  value={announcementDraft}
                  onChange={(event) => setAnnouncementDraft(event.target.value)}
                  placeholder="Announcement message"
                />
                <select
                  value={announcementSeverity}
                  onChange={(event) => setAnnouncementSeverity(event.target.value as "info" | "warning" | "critical")}
                  className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)]"
                >
                  <option value="info">info</option>
                  <option value="warning">warning</option>
                  <option value="critical">critical</option>
                </select>
                <input
                  type="datetime-local"
                  value={announcementStartAt}
                  onChange={(event) => setAnnouncementStartAt(event.target.value)}
                  className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)]"
                />
                <input
                  type="datetime-local"
                  value={announcementEndAt}
                  onChange={(event) => setAnnouncementEndAt(event.target.value)}
                  className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)]"
                />
                <div className="md:col-span-4">
                  <Button onClick={() => void saveAnnouncementSchedule()} disabled={announcementSaving || !announcementDraft.trim()}>
                    {announcementSaving ? "Saving…" : "Save announcement"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

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
              description="Public launch-interest submissions with use-case, volume, and follow-up cues."
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
              description="Alpha issue submissions and support reports with routing cues from the product."
              items={opsItems.feedback}
              emptyLabel="Support submissions will appear here when teams report friction from the product surfaces."
            />
          </section>
        </section>
      ) : null}
    </div>
  );
}
