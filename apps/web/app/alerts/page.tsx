"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Notice,
} from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";
import { AuthGate } from "../../components/state-panels";
import { usePortal } from "../../components/portal-provider";
import { getAlertCenter, updateAlertState } from "../../lib/api";
import { formatRelativeDate } from "../../lib/format";
import type { AlertCenterItem } from "../../lib/types";

function severityTone(severity: AlertCenterItem["severity"]) {
  if (severity === "critical") return "danger" as const;
  if (severity === "warning") return "warning" as const;
  return "neutral" as const;
}

function typeLabelForType(type: AlertCenterItem["type"]) {
  return type.replace(/_/g, " ");
}

function AlertCard({
  item,
  showActions,
  onAcknowledge,
  onResolve,
  acknowledging,
  resolving,
}: {
  readonly item: AlertCenterItem;
  readonly showActions: boolean;
  readonly onAcknowledge?: (item: AlertCenterItem) => Promise<void>;
  readonly onResolve?: (item: AlertCenterItem) => Promise<void>;
  readonly acknowledging: boolean;
  readonly resolving: boolean;
}) {
  return (
    <Card className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={severityTone(item.severity)}>{item.severity}</Badge>
              <Badge tone="neutral">{typeLabelForType(item.type)}</Badge>
              {item.state === "resolved" ? (
                <Badge tone="success">Resolved</Badge>
              ) : item.state === "acknowledged" ? (
                <Badge tone="warning">Acknowledged</Badge>
              ) : (
                <Badge tone="neutral">New</Badge>
              )}
              {item.projectName ? (
                <Badge tone="brand">{item.projectName}</Badge>
              ) : null}
              {item.groupCount && item.groupCount > 1 ? (
                <Badge tone="neutral">{item.groupCount} grouped</Badge>
              ) : null}
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--fyxvo-text)]">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                {item.description}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-xs text-[var(--fyxvo-text-muted)]">
            {formatRelativeDate(item.createdAt)}
          </div>
        </div>

        {showActions ? (
          <div className="flex flex-wrap items-center gap-2">
            {item.state !== "acknowledged" && onAcknowledge ? (
              <Button
                size="sm"
                variant="secondary"
                loading={acknowledging}
                disabled={acknowledging || resolving}
                onClick={() => void onAcknowledge(item)}
              >
                Acknowledge
              </Button>
            ) : null}
            {item.state !== "resolved" && onResolve ? (
              <Button
                size="sm"
                variant="ghost"
                loading={resolving}
                disabled={acknowledging || resolving}
                onClick={() => void onResolve(item)}
              >
                Resolve
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AlertsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]"
        />
      ))}
    </div>
  );
}

export default function AlertsPage() {
  const portal = usePortal();
  const [alerts, setAlerts] = useState<AlertCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    if (!portal.token) return;
    let cancelled = false;
    setLoading(true);
    getAlertCenter(portal.token)
      .then((data) => {
        if (!cancelled) {
          setAlerts(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) setAlerts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [portal.token]);

  async function handleAcknowledge(item: AlertCenterItem) {
    if (!portal.token) return;
    setAcknowledging(item.id);
    try {
      await updateAlertState({ alertKey: item.alertKey, state: "acknowledged", projectId: item.projectId }, portal.token);
      setAlerts((current) =>
        current.map((a) => (a.alertKey === item.alertKey ? { ...a, state: "acknowledged" } : a))
      );
    } finally {
      setAcknowledging(null);
    }
  }

  async function handleResolve(item: AlertCenterItem) {
    if (!portal.token) return;
    setResolving(item.id);
    try {
      await updateAlertState({ alertKey: item.alertKey, state: "resolved", projectId: item.projectId }, portal.token);
      setAlerts((current) =>
        current.map((a) => (a.alertKey === item.alertKey ? { ...a, state: "resolved" } : a))
      );
    } finally {
      setResolving(null);
    }
  }

  if (portal.walletPhase !== "authenticated") {
    return (
      <AuthGate
        title="Connect your wallet to view alerts"
        body="Authenticate with your Solana wallet to see active balance warnings, error rate spikes, webhook failures, and incident notifications across your projects."
      />
    );
  }

  const activeAlerts = alerts.filter((a) => a.state !== "resolved");
  const resolvedAlerts = alerts.filter((a) => a.state === "resolved");

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Operations"
        title="Alerts"
        description="Active alerts and incident notifications for your projects."
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-[var(--fyxvo-text)]">
            Active alerts
          </h2>
          {!loading && activeAlerts.length > 0 ? (
            <Badge tone="warning">{activeAlerts.length} active</Badge>
          ) : null}
        </div>

        {loading ? (
          <AlertsSkeleton />
        ) : activeAlerts.length === 0 ? (
          <Notice tone="success" title="No active alerts">
            There are no outstanding alerts for your projects right now. Balance warnings, error
            rate spikes, webhook failures, and incident notifications will appear here as they come
            in.
          </Notice>
        ) : (
          <div className="space-y-4">
            {activeAlerts.map((item) => (
              <AlertCard
                key={item.id}
                item={item}
                showActions
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                acknowledging={acknowledging === item.id}
                resolving={resolving === item.id}
              />
            ))}
          </div>
        )}
      </section>

      {!loading && resolvedAlerts.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-[var(--fyxvo-text)]">
              Resolved alerts
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResolved((v) => !v)}
            >
              {showResolved ? "Hide resolved" : `Show ${resolvedAlerts.length} resolved`}
            </Button>
          </div>

          {showResolved ? (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                These alerts have been marked as resolved. They are retained for audit and
                reference purposes.
              </p>
              {resolvedAlerts.map((item) => (
                <AlertCard
                  key={item.id}
                  item={item}
                  showActions={false}
                  acknowledging={false}
                  resolving={false}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {!loading && alerts.length === 0 ? (
        <Notice tone="neutral" title="No alerts found">
          Your account has no recorded alerts yet. Once your projects start receiving traffic,
          balance thresholds, error rate monitors, and webhook health checks will generate alerts
          here automatically.
        </Notice>
      ) : null}
    </div>
  );
}
