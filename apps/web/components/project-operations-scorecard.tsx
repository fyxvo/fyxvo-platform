"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@fyxvo/ui";
import { getProjectHealth, getProjectHealthHistory, getProjectRequestLogs, listProjectMembers, listWebhooks } from "../lib/api";
import { formatDuration, formatPercent } from "../lib/format";
import type { OnChainProjectSnapshot, PortalProject, ProjectAnalytics, ProjectHealthScore } from "../lib/types";

type ScorecardItem = {
  label: string;
  state: string;
  tone: "success" | "warning" | "neutral";
  why: string;
  nextAction: { label: string; href: string } | null;
};

function itemTone(strong: boolean, warning = false): "success" | "warning" | "neutral" {
  if (strong) return "success";
  if (warning) return "warning";
  return "neutral";
}

export function ProjectOperationsScorecard({
  project,
  analytics,
  onchainSnapshot,
  token,
}: {
  readonly project: PortalProject;
  readonly analytics: ProjectAnalytics;
  readonly onchainSnapshot: OnChainProjectSnapshot;
  readonly token: string;
}) {
  const [memberCount, setMemberCount] = useState(1);
  const [activeWebhooks, setActiveWebhooks] = useState(0);
  const [simulatedCount, setSimulatedCount] = useState(0);
  const [health, setHealth] = useState<ProjectHealthScore | null>(null);
  const [historyRange, setHistoryRange] = useState<"7d" | "30d">("7d");
  const [history, setHistory] = useState<Array<{ date: string; score: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    listProjectMembers(project.id, token)
      .then((data) => {
        if (!cancelled) setMemberCount(Math.max(1, data.items.length));
      })
      .catch(() => undefined);
    listWebhooks(project.id, token)
      .then((data) => {
        if (!cancelled) {
          setActiveWebhooks(data.items.filter((item) => item.active).length);
        }
      })
      .catch(() => undefined);
    getProjectRequestLogs(project.id, token, {
      simulatedOnly: true,
      page: 1,
      pageSize: 20,
      range: "7d",
    })
      .then((data) => {
        if (!cancelled) setSimulatedCount(data.totalCount);
      })
      .catch(() => undefined);
    getProjectHealth(project.id, token)
      .then((data) => {
        if (!cancelled) setHealth(data.health);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [project.id, token]);

  useEffect(() => {
    let cancelled = false;
    getProjectHealthHistory(project.id, token, historyRange)
      .then((data) => {
        if (!cancelled) setHistory(data.history);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [historyRange, project.id, token]);

  const requestTotal = analytics.totals.requestLogs;
  const successTotal = analytics.statusCodes
    .filter((entry) => entry.statusCode < 400)
    .reduce((sum, entry) => sum + entry.count, 0);
  const successRate = requestTotal > 0 ? successTotal / requestTotal : 0;
  const availableSol = (() => {
    try {
      return Number(BigInt(onchainSnapshot.balances?.availableSolCredits ?? "0")) / 1_000_000_000;
    } catch {
      return 0;
    }
  })();

  const scorecard: ScorecardItem[] = [
    {
      label: "Activation",
      state: onchainSnapshot.projectAccountExists ? "On-chain project is active" : "Activation still needed",
      tone: itemTone(onchainSnapshot.projectAccountExists, !onchainSnapshot.projectAccountExists),
      why: "Activation is what makes the project treasury and funded gateway access real.",
      nextAction: onchainSnapshot.projectAccountExists ? null : { label: "Open project overview", href: `/projects/${project.slug}` },
    },
    {
      label: "Funding",
      state: availableSol > 0 ? `${availableSol.toFixed(3)} SOL spendable` : "No spendable SOL credits",
      tone: itemTone(availableSol > 0.01, availableSol === 0),
      why: "Funded credits are required before the gateway can relay real devnet traffic.",
      nextAction: availableSol > 0 ? null : { label: "Fund project", href: "/funding" },
    },
    {
      label: "API key coverage",
      state: `${project._count?.apiKeys ?? 0} key${(project._count?.apiKeys ?? 0) === 1 ? "" : "s"} issued`,
      tone: itemTone((project._count?.apiKeys ?? 0) > 0, (project._count?.apiKeys ?? 0) === 0),
      why: "Teams need scoped credentials before they can route traffic or test relay modes safely.",
      nextAction: (project._count?.apiKeys ?? 0) > 0 ? null : { label: "Create API key", href: "/api-keys" },
    },
    {
      label: "Recent traffic",
      state: requestTotal > 0 ? `${requestTotal.toLocaleString()} requests recorded` : "No traffic yet",
      tone: itemTone(requestTotal > 0, requestTotal === 0),
      why: "Recent traffic proves the integration is sending real requests through the project path.",
      nextAction: requestTotal > 0 ? { label: "Inspect request logs", href: `/projects/${project.slug}?tab=logs` } : { label: "Open playground", href: "/playground" },
    },
    {
      label: "Success rate",
      state: requestTotal > 0 ? formatPercent(successRate * 100) : "No request sample yet",
      tone: itemTone(successRate >= 0.97 && requestTotal > 0, successRate < 0.9 && requestTotal > 0),
      why: "A healthy success rate catches auth, funding, and upstream issues before they become incidents.",
      nextAction: successRate >= 0.97 || requestTotal === 0 ? null : { label: "Open analytics", href: "/analytics" },
    },
    {
      label: "Latency",
      state: analytics.latency.averageMs > 0 ? formatDuration(analytics.latency.averageMs) : "No latency baseline yet",
      tone: itemTone(analytics.latency.averageMs > 0 && analytics.latency.averageMs <= 150, analytics.latency.averageMs > 350),
      why: "Latency trends tell you whether standard routing is enough or priority relay needs to be tested.",
      nextAction: analytics.latency.averageMs > 0 ? { label: "Review analytics", href: "/analytics" } : null,
    },
    {
      label: "Webhook health",
      state: activeWebhooks > 0 ? `${activeWebhooks} active webhook${activeWebhooks === 1 ? "" : "s"}` : "No active webhooks",
      tone: itemTone(activeWebhooks > 0, activeWebhooks === 0),
      why: "Webhook coverage makes funding, key, and incident events visible outside the dashboard.",
      nextAction: activeWebhooks > 0 ? { label: "Open settings", href: "/settings" } : { label: "Configure webhook", href: "/settings" },
    },
    {
      label: "Team setup",
      state: memberCount > 1 ? `${memberCount} collaborators have access` : "Owner-only workspace",
      tone: itemTone(memberCount > 1, memberCount === 1),
      why: "Shared operational access reduces single-person bottlenecks during debugging and rollout work.",
      nextAction: memberCount > 1 ? null : { label: "Invite teammate", href: "/settings" },
    },
    {
      label: "Public visibility",
      state: project.isPublic && project.publicSlug ? "Public project page is live" : "Private by default",
      tone: itemTone(Boolean(project.isPublic && project.publicSlug)),
      why: "Public visibility makes it easier to share live status and usage proof with external teams.",
      nextAction: project.isPublic && project.publicSlug ? null : { label: "Open settings", href: "/settings" },
    },
    {
      label: "Simulation usage",
      state: simulatedCount > 0 ? `${simulatedCount} simulated request${simulatedCount === 1 ? "" : "s"} in the last 7 days` : "No recent simulation usage",
      tone: itemTone(simulatedCount > 0),
      why: "Simulation is the safest way to validate payloads and teach the integration team before real traffic.",
      nextAction: simulatedCount > 0 ? { label: "Open playground", href: "/playground" } : { label: "Try simulation mode", href: "/playground?simulate=true" },
    },
  ];

  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
      <CardHeader>
        <CardTitle>Operations scorecard</CardTitle>
        <CardDescription>
          A live engineering readiness view for this project: what is strong, what still matters, and the next concrete move when something is weak.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {scorecard.map((item) => (
          <div key={item.label} className="rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-[var(--fyxvo-text)]">{item.label}</div>
              <Badge tone={item.tone}>{item.tone === "success" ? "strong" : item.tone === "warning" ? "watch" : "next"}</Badge>
            </div>
            <div className="mt-3 text-sm font-medium text-[var(--fyxvo-text)]">{item.state}</div>
            <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.why}</p>
            {item.nextAction ? (
              <Link href={item.nextAction.href} className="mt-4 inline-flex text-sm font-medium text-[var(--fyxvo-brand)] hover:underline">
                {item.nextAction.label}
              </Link>
            ) : null}
          </div>
        ))}
      </CardContent>
      {health ? (
        <CardContent className="space-y-5 border-t border-[var(--fyxvo-border)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-[var(--fyxvo-text)]">Health breakdown</div>
              <p className="text-sm text-[var(--fyxvo-text-soft)]">
                A real-data breakdown of what is helping or hurting this project’s readiness score.
              </p>
            </div>
            {health.weeklyChange ? (
              <Badge tone={health.weeklyChange.direction === "up" ? "success" : health.weeklyChange.direction === "down" ? "warning" : "neutral"}>
                {health.weeklyChange.direction} · {health.weeklyChange.reason}
              </Badge>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {(health.breakdown ?? []).map((item) => (
              <div key={item.key} className="rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-[var(--fyxvo-text)]">{item.label}</div>
                  <Badge tone={item.value >= item.max ? "success" : item.value === 0 ? "warning" : "neutral"}>
                    {item.value}/{item.max}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.summary}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-[var(--fyxvo-text)]">Health history</div>
                <p className="text-sm text-[var(--fyxvo-text-soft)]">See whether the project is improving or drifting over time.</p>
              </div>
              <div className="flex gap-2">
                {(["7d", "30d"] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setHistoryRange(range)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      historyRange === range
                        ? "border-brand-500/40 bg-brand-500/10 text-[var(--fyxvo-text)]"
                        : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)]"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            {history.length > 1 ? (
              <div className="mt-4 overflow-x-auto">
                <svg viewBox={`0 0 ${Math.max(history.length - 1, 1) * 18 + 12} 48`} className="h-16 w-full min-w-[240px]">
                  <path
                    d={history
                      .map((point, index) => {
                        const x = 6 + index * 18;
                        const y = 42 - (point.score / 100) * 36;
                        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="var(--fyxvo-brand)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--fyxvo-text-muted)]">Health history will appear once enough daily data points are available.</p>
            )}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
