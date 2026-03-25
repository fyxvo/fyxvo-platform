"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../lib/api";
import { formatRelativeDate } from "../lib/format";
import type { Notification } from "../lib/types";

function typeIcon(type: Notification["type"]) {
  switch (type) {
    case "funding_confirmed":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true">
          <path d="M10 3v14M14 6.5c0-1.5-1.8-2.5-4-2.5S6 5 6 6.5 7.8 9.5 10 9.5s4 1 4 2.5S12.2 14 10 14s-4-1-4-2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "api_key_created":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 text-[var(--fyxvo-brand)] dark:text-brand-400" aria-hidden="true">
          <circle cx="7" cy="13" r="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.5 11.5L18 3M16 3h2v2M14 5l2 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "api_key_revoked":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 text-rose-700 dark:text-rose-400" aria-hidden="true">
          <circle cx="7" cy="13" r="3" />
          <path d="M9.5 11.5L18 3" strokeLinecap="round" />
          <path d="M15 5l2 2M17 5l-2 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "error_spike":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden="true">
          <path d="M10 4l8 13H2z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 9v3M10 14.5h.01" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 text-[var(--fyxvo-text-muted)]" aria-hidden="true">
          <path d="M10 2a6 6 0 016 6c0 3.5 1.5 5 1.5 6H2.5c0-1 1.5-2.5 1.5-6a6 6 0 016-6z" />
          <path d="M8 16a2 2 0 004 0" strokeLinecap="round" />
        </svg>
      );
  }
}

function getNotificationHref(n: Notification): string | null {
  const meta = n.metadata as Record<string, string> | null | undefined;
  switch (n.type) {
    case "project_activated":
      return meta?.projectSlug
        ? `/projects/${meta.projectSlug}`
        : n.projectId
          ? `/projects/${n.projectId}`
          : "/projects";
    case "api_key_created":
    case "api_key_revoked":
    case "api_key_rotated":
      return "/api-keys";
    case "low_balance":
    case "balance_low":
      return "/funding";
    case "funding_confirmed":
      return "/transactions";
    case "rate_limit_warning":
      return "/analytics";
    default:
      return null;
  }
}

type GroupedNotification = {
  id: string;
  grouped: true;
  count: number;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  href: string | null;
};

type DisplayItem = Notification | GroupedNotification;

function isGrouped(item: DisplayItem): item is GroupedNotification {
  return "grouped" in item && item.grouped === true;
}

function typeDescription(type: string): string {
  switch (type) {
    case "api_key_created": return "API key created";
    case "api_key_revoked": return "API key revoked";
    case "api_key_rotated": return "API key rotated";
    case "project_activated": return "project activated";
    case "low_balance": return "low balance";
    case "balance_low": return "balance low";
    case "funding_confirmed": return "funding confirmed";
    case "rate_limit_warning": return "rate limit warning";
    default: return type.replace(/_/g, " ");
  }
}

function groupNotifications(notifications: Notification[]): DisplayItem[] {
  if (notifications.length === 0) return [];

  // Count occurrences of each type
  const typeCounts = new Map<string, number>();
  for (const n of notifications) {
    typeCounts.set(n.type, (typeCounts.get(n.type) ?? 0) + 1);
  }

  const result: DisplayItem[] = [];
  let i = 0;

  while (i < notifications.length) {
    const n = notifications[i]!;
    const count = typeCounts.get(n.type) ?? 0;

    if (count >= 3) {
      // Collect all consecutive same-type notifications
      const group: Notification[] = [];
      const startIdx = i;
      while (i < notifications.length && notifications[i]!.type === n.type) {
        group.push(notifications[i]!);
        i++;
      }

      // Only group if we collected 3+ consecutive
      if (group.length >= 3) {
        const desc = typeDescription(n.type);
        const representative = group[0]!;
        const grouped: GroupedNotification = {
          id: `group-${n.type}-${startIdx}`,
          grouped: true,
          count: group.length,
          type: n.type,
          title: `${group.length} ${desc} events`,
          message: `${group.length} notifications of the same type`,
          createdAt: representative.createdAt,
          href: getNotificationHref(representative),
        };
        result.push(grouped);
      } else {
        // Not enough consecutive — push individually
        for (const item of group) {
          result.push(item);
        }
      }
    } else {
      result.push(n);
      i++;
    }
  }

  return result;
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch { /* ignore */ }
}

function mergeNotifications(current: Notification[], incoming: Notification[]): Notification[] {
  if (current.length === 0) return incoming;
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    const existing = byId.get(item.id);
    byId.set(item.id, existing ? { ...item, read: existing.read || item.read } : item);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function NotificationBell({ token }: { readonly token: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef<number>(0);
  const openRef = useRef(false);
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Play sound when unread count increases
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      if (typeof window !== "undefined" && localStorage.getItem("fyxvo_notification_sound") === "1") {
        playNotificationSound();
      }
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    getNotifications(token)
      .then((items) => {
        if (!cancelled) setNotifications(items);
      })
      .catch(() => {
        // Silently fail - notifications are non-critical
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const interval = setInterval(() => {
      getNotifications(token)
        .then((items) => {
          if (!cancelled) {
            setNotifications((current) => (openRef.current ? mergeNotifications(current, items) : items));
          }
        })
        .catch(() => undefined);
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [open]);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    void markAllNotificationsRead(token).catch(() => undefined);
  }

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    void markNotificationRead(id, token).catch(() => undefined);
  }

  function handleItemClick(item: DisplayItem) {
    if (!isGrouped(item)) {
      markRead(item.id);
    }
    const href = isGrouped(item) ? item.href : getNotificationHref(item);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  }

  function handleItemKeyDown(e: React.KeyboardEvent, item: DisplayItem) {
    if (e.key === "Enter") {
      handleItemClick(item);
    }
  }

  const displayItems = groupNotifications(notifications);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] transition hover:bg-[var(--fyxvo-panel)] hover:text-[var(--fyxvo-text)]"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
          <path d="M10 2a6 6 0 016 6c0 3.5 1.5 5 1.5 6H2.5c0-1 1.5-2.5 1.5-6a6 6 0 016-6z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 16a2 2 0 004 0" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] shadow-[0_16px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--fyxvo-text)]">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="space-y-1 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 rounded-xl p-3">
                    <div className="mt-0.5 h-4 w-4 animate-pulse rounded-full bg-[var(--fyxvo-panel-soft)]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 animate-pulse rounded bg-[var(--fyxvo-panel-soft)]" />
                      <div className="h-2.5 w-full animate-pulse rounded bg-[var(--fyxvo-panel-soft)]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-10">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-[var(--fyxvo-text-muted)]">
                  <path d="M10 2a6 6 0 016 6c0 3.5 1.5 5 1.5 6H2.5c0-1 1.5-2.5 1.5-6a6 6 0 016-6z" strokeLinecap="round" />
                  <path d="M8 16a2 2 0 004 0" strokeLinecap="round" />
                </svg>
                <p className="text-sm text-[var(--fyxvo-text-muted)]">No notifications yet</p>
                <p className="text-xs text-[var(--fyxvo-text-muted)]">
                  You&apos;ll see funding, API key, and project events here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--fyxvo-border)]">
                {displayItems.map((item) => {
                  if (isGrouped(item)) {
                    return (
                      <div
                        key={item.id}
                        className="flex gap-3 px-4 py-3 transition cursor-pointer hover:bg-[var(--fyxvo-panel-soft)]"
                        onClick={() => handleItemClick(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => handleItemKeyDown(e, item)}
                      >
                        <div className="mt-0.5 shrink-0">{typeIcon(item.type)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-[var(--fyxvo-text)]">{item.title}</p>
                          </div>
                          <p className="mt-0.5 text-xs text-[var(--fyxvo-text-muted)] leading-5">{item.message}</p>
                          <p className="mt-1 text-[10px] text-[var(--fyxvo-text-muted)]">
                            {formatRelativeDate(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const isRead = item.read;
                  return (
                    <div
                      key={item.id}
                      className={`flex gap-3 px-4 py-3 transition cursor-pointer ${isRead ? "opacity-60" : "bg-brand-500/5"} hover:bg-[var(--fyxvo-panel-soft)]`}
                      onClick={() => handleItemClick(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => handleItemKeyDown(e, item)}
                    >
                      <div className="mt-0.5 shrink-0">{typeIcon(item.type)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-[var(--fyxvo-text)]">{item.title}</p>
                          {!isRead && (
                            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--fyxvo-text-muted)] leading-5">{item.message}</p>
                        <p className="mt-1 text-[10px] text-[var(--fyxvo-text-muted)]">
                          {formatRelativeDate(item.createdAt)}
                          {item.projectName ? ` · ${item.projectName}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
