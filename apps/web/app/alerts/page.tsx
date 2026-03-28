"use client";

import { useEffect, useState, useCallback } from "react";
import { usePortal } from "../../components/portal-provider";
import { WalletConnectButton } from "../../components/wallet-connect-button";

const API = "https://api.fyxvo.com";

type AlertSeverity = "critical" | "warning" | "info" | string;
type AlertStatus = "active" | "acknowledged" | "resolved" | string;

interface Alert {
  readonly alertKey: string;
  readonly message: string;
  readonly severity: AlertSeverity;
  readonly status: AlertStatus;
  readonly createdAt: string;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function severityBadge(severity: AlertSeverity) {
  switch (severity) {
    case "critical":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    case "warning":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "info":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default:
      return "bg-white/[0.05] text-[#64748b] border-white/[0.08]";
  }
}

function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
}: {
  readonly alert: Alert;
  readonly onAcknowledge: (key: string) => void;
  readonly onResolve: (key: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-transform hover:-translate-y-1">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-semibold border ${severityBadge(alert.severity)}`}
            >
              {alert.severity}
            </span>
            <span className="text-xs text-[#64748b]">{relativeTime(alert.createdAt)}</span>
          </div>
          <p className="text-sm text-[#f1f5f9] leading-relaxed mb-2">{alert.message}</p>
          <code className="text-xs text-[#64748b] font-mono">{alert.alertKey}</code>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {alert.status !== "acknowledged" && alert.status !== "resolved" && (
            <button
              onClick={() => onAcknowledge(alert.alertKey)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-[#64748b] hover:text-[#f1f5f9] hover:border-white/[0.15] transition-colors"
            >
              Acknowledge
            </button>
          )}
          {alert.status !== "resolved" && (
            <button
              onClick={() => onResolve(alert.alertKey)}
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              Resolve
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-3">
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded bg-white/[0.06]" />
        <div className="h-5 w-12 rounded bg-white/[0.04]" />
      </div>
      <div className="h-4 w-full rounded bg-white/[0.06]" />
      <div className="h-3 w-32 rounded bg-white/[0.04]" />
    </div>
  );
}

export default function AlertsPage() {
  const portal = usePortal();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);

  const fetchAlerts = useCallback(async () => {
    if (!portal.token) return;
    try {
      const res = await fetch(`${API}/v1/alerts`, {
        headers: { Authorization: `Bearer ${portal.token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as Alert[] | { alerts?: Alert[] };
      if (Array.isArray(data)) {
        setAlerts(data);
      } else if (data && typeof data === "object" && "alerts" in data && Array.isArray(data.alerts)) {
        setAlerts(data.alerts);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [portal.token]);

  // Initial load
  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchAlerts();
      setCountdown(30);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Countdown ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  async function handleAcknowledge(alertKey: string) {
    if (!portal.token) return;
    try {
      await fetch(`${API}/v1/alerts/${alertKey}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${portal.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "acknowledged" }),
      });
      setAlerts((prev) =>
        prev.map((a) => (a.alertKey === alertKey ? { ...a, status: "acknowledged" } : a))
      );
    } catch {
      // silent
    }
  }

  async function handleResolve(alertKey: string) {
    if (!portal.token) return;
    try {
      await fetch(`${API}/v1/alerts/${alertKey}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${portal.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "resolved" }),
      });
      setAlerts((prev) =>
        prev.map((a) => (a.alertKey === alertKey ? { ...a, status: "resolved" } : a))
      );
    } catch {
      // silent
    }
  }

  if (portal.walletPhase !== "authenticated") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col items-center gap-6 pt-20 text-center">
            <p className="text-[#64748b]">Connect your wallet to view alerts.</p>
            <WalletConnectButton />
          </div>
        </div>
      </div>
    );
  }

  const active = alerts.filter((a) => a.status !== "resolved");
  const resolved = alerts.filter((a) => a.status === "resolved");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#f1f5f9]">Alerts</h1>
            <p className="text-[#64748b] mt-1">Active project alerts and notifications.</p>
          </div>
          <div className="text-xs text-[#64748b] text-right shrink-0">
            <p>Auto-refresh</p>
            <p className="font-mono text-[#f97316]">{countdown}s</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Active alerts */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#64748b] mb-4">
            Active ({active.length})
          </h2>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : active.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-10 text-center">
              <p className="text-[#64748b] text-sm">No active alerts. All systems nominal.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {active.map((alert) => (
                <AlertCard
                  key={alert.alertKey}
                  alert={alert}
                  onAcknowledge={(key) => void handleAcknowledge(key)}
                  onResolve={(key) => void handleResolve(key)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Resolved alerts */}
        {resolved.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-wider text-[#64748b] hover:text-[#f1f5f9] transition-colors select-none">
              <span>Resolved ({resolved.length})</span>
            </summary>
            <div className="mt-4 space-y-4 opacity-60">
              {resolved.map((alert) => (
                <AlertCard
                  key={alert.alertKey}
                  alert={alert}
                  onAcknowledge={(key) => void handleAcknowledge(key)}
                  onResolve={(key) => void handleResolve(key)}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
