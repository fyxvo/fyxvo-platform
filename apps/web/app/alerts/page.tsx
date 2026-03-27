"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";
import { usePortal } from "../../components/portal-provider";
import { SavedViewBar } from "../../components/saved-view-bar";
import { AuthGate } from "../../components/state-panels";
import { getAlertCenter, updateAlertState } from "../../lib/api";
import { formatRelativeDate } from "../../lib/format";
import type { AlertCenterItem } from "../../lib/types";

type AlertTypeFilter = AlertCenterItem["type"] | "all";

const ALERT_TYPES: readonly AlertTypeFilter[] = [
  "all",
  "low_balance",
  "daily_cost",
  "error_rate",
  "webhook_failure",
  "assistant",
  "incident",
  "notification",
];

function toneForSeverity(severity: AlertCenterItem["severity"]) {
  return severity === "critical" ? "danger" : severity === "warning" ? "warning" : "neutral";
}

function labelForType(type: AlertCenterItem["type"]) {
  return type.replace(/_/g, " ");
}

function toCsv(items: AlertCenterItem[]) {
  const header = ["createdAt", "severity", "type", "projectName", "title", "description"];
  const rows = items.map((item) =>
    [
      item.createdAt,
      item.severity,
      item.type,
      item.projectName ?? "",
      item.title,
      item.description.replace(/\n/g, " "),
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

function quickActions(item: AlertCenterItem) {
  const actions: Array<{ label: string; href: string }> = [];
  if (item.type === "low_balance") {
    actions.push({ label: "Fund now", href: "/funding" });
  }
  if (item.type === "error_rate") {
    actions.push({ label: "Open analytics", href: "/analytics" });
  }
  if (item.type === "webhook_failure" && item.projectId) {
    actions.push({ label: "Open webhook event log", href: `/settings?project=${item.projectId}` });
  }
  if (item.type === "incident" || item.type === "assistant") {
    actions.push({ label: "Open status page", href: "/status" });
  }
  return actions;
}

function stateTone(state: AlertCenterItem["state"]) {
  return state === "resolved" ? "success" : state === "acknowledged" ? "warning" : "neutral";
}

function normalizeAlertFilters(candidate: Record<string, unknown>): {
  type: AlertTypeFilter;
  project: string;
} {
  const type =
    typeof candidate.type === "string" && ALERT_TYPES.includes(candidate.type as AlertTypeFilter)
      ? (candidate.type as AlertTypeFilter)
      : "all";
  const project = typeof candidate.project === "string" ? candidate.project : "all";
  return { type, project };
}

export default function AlertsPage() {
  const portal = usePortal();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AlertCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const rawTypeFilter = searchParams.get("type");
  const typeFilter =
    rawTypeFilter && ALERT_TYPES.includes(rawTypeFilter as AlertTypeFilter)
      ? (rawTypeFilter as AlertTypeFilter)
      : "all";
  const projectFilter = searchParams.get("project") ?? "all";

  useEffect(() => {
    if (portal.walletPhase !== "authenticated" || !portal.token) {
      return;
    }
    let cancelled = false;
    getAlertCenter(portal.token)
      .then((nextItems) => {
        if (!cancelled) {
          setItems(nextItems);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [portal.token, portal.walletPhase]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (dismissedIds.includes(item.id)) return false;
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (projectFilter !== "all" && item.projectId !== projectFilter) return false;
      return true;
    });
  }, [dismissedIds, items, projectFilter, typeFilter]);

  async function mutateAlertState(item: AlertCenterItem, state: AlertCenterItem["state"]) {
    if (!portal.token) return;
    await updateAlertState({ alertKey: item.alertKey, state, projectId: item.projectId }, portal.token);
    setItems((current) => current.map((entry) => entry.alertKey === item.alertKey ? { ...entry, state } : entry));
  }

  function updateUrl(nextType: AlertTypeFilter, nextProject: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextType === "all") params.delete("type");
    else params.set("type", nextType);
    if (nextProject === "all") params.delete("project");
    else params.set("project", nextProject);
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }

  function exportCsv() {
    const blob = new Blob([toCsv(visibleItems)], { type: "text/csv" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "fyxvo-alerts.csv";
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function copyShareUrl() {
    await navigator.clipboard.writeText(window.location.href);
  }

  if (portal.walletPhase !== "authenticated") {
    return (
      <AuthGate
        title="You'll need to sign in first"
        body="Connect your wallet to see what's going on across your projects. Once you're in, this page pulls together balance warnings, webhook issues, error spikes, and anything else worth your attention."
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Alert center"
        description="Everything that needs your attention, all in one place. Balance warnings, error spikes, webhook failures, incidents, and other signals from your projects show up here so nothing slips through the cracks."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={copyShareUrl}>
              Copy filtered URL
            </Button>
            <Button variant="secondary" size="sm" onClick={exportCsv}>
              Export CSV
            </Button>
          </div>
        }
      />

      <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Use these to zero in on a specific alert type or project. Handy when you want to focus on one thing at a time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {portal.token ? (
            <SavedViewBar
              kind="alerts"
              token={portal.token}
              filters={{ type: typeFilter, project: projectFilter }}
              hasActiveQuery={typeFilter !== "all" || projectFilter !== "all"}
              onApply={(nextFilters) => {
                const normalized = normalizeAlertFilters(nextFilters);
                updateUrl(normalized.type, normalized.project);
              }}
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {ALERT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateUrl(type, projectFilter)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  typeFilter === type
                    ? "border-[var(--fyxvo-brand)]/40 bg-[var(--fyxvo-brand)]/10 text-[var(--fyxvo-text)]"
                    : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                }`}
              >
                {type === "all" ? "All alerts" : labelForType(type)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-[var(--fyxvo-text-muted)]" htmlFor="alerts-project-filter">
              Project
            </label>
            <select
              id="alerts-project-filter"
              value={projectFilter}
              onChange={(event) => updateUrl(typeFilter, event.target.value)}
              className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)]"
            >
              <option value="all">All projects</option>
              {portal.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]"
            />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <Notice tone="success" title="All clear">
          There is nothing matching these filters right now. That could mean everything is humming along nicely, or you might want to loosen the filters above to see more.
        </Notice>
      ) : (
        <section className="grid gap-4">
          {visibleItems.map((item) => (
            <Card key={item.id} className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={toneForSeverity(item.severity)}>{item.severity}</Badge>
                      <Badge tone="neutral">{labelForType(item.type)}</Badge>
                      <Badge tone={stateTone(item.state)}>{item.state}</Badge>
                      {item.projectName ? <Badge tone="brand">{item.projectName}</Badge> : null}
                      {item.groupCount && item.groupCount > 1 ? <Badge tone="neutral">{item.groupCount} grouped</Badge> : null}
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-[var(--fyxvo-text)]">{item.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.description}</p>
                      {item.relatedIncident ? (
                        <p className="mt-2 text-xs text-[var(--fyxvo-text-muted)]">
                          This could be related to the ongoing {item.relatedIncident.serviceName} incident.
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--fyxvo-text-muted)]">{formatRelativeDate(item.createdAt)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {quickActions(item).map((action) => (
                    <Button key={action.label} asChild size="sm" variant="secondary">
                      <Link href={action.href}>{action.label}</Link>
                    </Button>
                  ))}
                  {item.relatedIncident ? (
                    <Button asChild size="sm" variant="secondary">
                      <Link href="/status">Related incident</Link>
                    </Button>
                  ) : null}
                  {item.state !== "acknowledged" ? (
                    <Button size="sm" variant="ghost" onClick={() => void mutateAlertState(item, "acknowledged")}>
                      Acknowledge
                    </Button>
                  ) : null}
                  {item.state !== "resolved" ? (
                    <Button size="sm" variant="ghost" onClick={() => void mutateAlertState(item, "resolved")}>
                      Resolve
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDismissedIds((current) => [...current, item.id])}
                  >
                    Dismiss local view
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
