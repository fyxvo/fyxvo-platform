"use client";

import { useEffect, useRef, useState } from "react";
import { getNotifications } from "../lib/api";
import { formatRelativeDate } from "../lib/format";
import type { Notification } from "../lib/types";

const READ_KEY = "fyxvo-read-notifications";

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    // ignore
  }
}

function typeIcon(type: Notification["type"]) {
  switch (type) {
    case "funding_confirmed":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 text-emerald-400" aria-hidden="true">
          <path d="M10 3v14M14 6.5c0-1.5-1.8-2.5-4-2.5S6 5 6 6.5 7.8 9.5 10 9.5s4 1 4 2.5S12.2 14 10 14s-4-1-4-2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "api_key_created":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 text-brand-400" aria-hidden="true">
          <circle cx="7" cy="13" r="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.5 11.5L18 3M16 3h2v2M14 5l2 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "api_key_revoked":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 text-rose-400" aria-hidden="true">
          <circle cx="7" cy="13" r="3" />
          <path d="M9.5 11.5L18 3" strokeLinecap="round" />
          <path d="M15 5l2 2M17 5l-2 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "error_spike":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 text-amber-400" aria-hidden="true">
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

export function NotificationBell({ token }: { readonly token: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadIds());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

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
          if (!cancelled) setNotifications(items);
        })
        .catch(() => undefined);
    }, 60_000);

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
    const newRead = new Set([...readIds, ...notifications.map((n) => n.id)]);
    setReadIds(newRead);
    saveReadIds(newRead);
  }

  function markRead(id: string) {
    const newRead = new Set([...readIds, id]);
    setReadIds(newRead);
    saveReadIds(newRead);
  }

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
                {notifications.map((n) => {
                  const isRead = readIds.has(n.id);
                  return (
                    <div
                      key={n.id}
                      className={`flex gap-3 px-4 py-3 transition ${isRead ? "opacity-60" : "bg-brand-500/5"}`}
                      onClick={() => markRead(n.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") markRead(n.id); }}
                    >
                      <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-[var(--fyxvo-text)]">{n.title}</p>
                          {!isRead && (
                            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--fyxvo-text-muted)] leading-5">{n.message}</p>
                        <p className="mt-1 text-[10px] text-[var(--fyxvo-text-muted)]">
                          {formatRelativeDate(n.createdAt)}
                          {n.projectName ? ` · ${n.projectName}` : ""}
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
