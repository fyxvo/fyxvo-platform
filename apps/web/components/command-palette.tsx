"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePortal } from "./portal-provider";
import { webEnv } from "../lib/env";

interface BackendSearchResult {
  type: "project" | "api_key" | "request";
  displayName: string;
  description?: string;
  path: string;
}

interface BackendSearchResults {
  projects: BackendSearchResult[];
  apiKeys: BackendSearchResult[];
  requests: BackendSearchResult[];
}

interface NavEntry {
  label: string;
  href: string;
  description?: string;
  group?: string;
  category?: "nav" | "data";
}

function buildNavEntries(selectedProjectSlug?: string | null): NavEntry[] {
  const entries: NavEntry[] = [
    { label: "Dashboard", href: "/dashboard", description: "Overview, projects, and operational timelines" },
    { label: "Projects", href: "/projects", description: "Manage and create projects" },
    { label: "API Keys", href: "/api-keys", description: "Issue and revoke scoped credentials" },
    { label: "Funding", href: "/funding", description: "Fund project treasury with SOL" },
    { label: "Analytics", href: "/analytics", description: "Request volume, latency, and error rates" },
    { label: "Operators", href: "/operators", description: "Node operator details and infrastructure" },
    { label: "Settings", href: "/settings", description: "Wallet, appearance, and security settings" },
    { label: "Docs", href: "/docs", description: "Quickstart, API reference, and integration guides" },
    { label: "Status", href: "/status", description: "Live service health and protocol readiness" },
    { label: "Pricing", href: "/pricing", description: "Request pricing and SOL funding mechanics" },
    { label: "Enterprise", href: "/enterprise", description: "Dedicated capacity, custom SLAs, and team features" },
    { label: "Contact", href: "/contact", description: "Talk to the founder or submit feedback" },
  ];

  if (selectedProjectSlug) {
    entries.splice(2, 0, {
      label: `Project: ${selectedProjectSlug}`,
      href: `/projects/${selectedProjectSlug}`,
      group: "project",
    });
  }

  return entries;
}

export function CommandPalette() {
  const portal = usePortal();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [recentPages, setRecentPages] = useState<{ label: string; href: string }[]>([]);
  const [backendResults, setBackendResults] = useState<BackendSearchResults | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Debounced backend search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3 || !portal.token) {
      setTimeout(() => setBackendResults(null), 0);
      return;
    }
    const tok = portal.token;
    const q = query.trim();
    debounceRef.current = setTimeout(() => {
      fetch(`${webEnv.apiBaseUrl}/v1/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.json() as BackendSearchResults;
          setBackendResults(data);
        })
        .catch(() => undefined);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, portal.token]);

  const filtered = useMemo<NavEntry[]>(() => {
    const entries = buildNavEntries(portal.selectedProject?.slug);
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    const navFiltered = entries.filter((e) => e.label.toLowerCase().includes(q));
    const dataResults: NavEntry[] = [
      ...portal.projects
        .filter((p) => p.name.toLowerCase().includes(q))
        .map((p) => ({
          label: `Project: ${p.name}`,
          href: `/projects/${p.slug}`,
          description: p.archivedAt ? "Archived" : "Active",
          group: "data",
          category: "data" as const,
        })),
      ...portal.apiKeys
        .filter(
          (k) =>
            k.label.toLowerCase().includes(q) ||
            k.prefix.toLowerCase().includes(q),
        )
        .map((k) => ({
          label: `Key: ${k.label}`,
          href: "/api-keys",
          description: k.prefix,
          group: "data",
          category: "data" as const,
        })),
      ...(backendResults
        ? [
            ...backendResults.projects.map((r) => ({
              label: `Project: ${r.displayName}`,
              href: r.path,
              ...(r.description ? { description: r.description } : {}),
              group: "data",
              category: "data" as const,
            })),
            ...backendResults.apiKeys.map((r) => ({
              label: `Key: ${r.displayName}`,
              href: r.path,
              ...(r.description ? { description: r.description } : {}),
              group: "data",
              category: "data" as const,
            })),
          ]
        : []),
    ].filter(
      (entry, idx, arr) => arr.findIndex((e) => e.href === entry.href && e.label === entry.label) === idx,
    );
    return [...navFiltered, ...dataResults];
  }, [query, portal.selectedProject?.slug, portal.projects, portal.apiKeys, backendResults]);

  const navFiltered = filtered.filter((e) => e.category !== "data");
  const dataResults = filtered.filter((e) => e.category === "data");

  // Reset highlight when filter changes
  useEffect(() => {
    startTransition(() => setHighlighted(0));
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const timeout = window.setTimeout(() => inputRef.current?.focus(), 10);
      return () => window.clearTimeout(timeout);
    } else {
      startTransition(() => {
        setQuery("");
        setHighlighted(0);
      });
      previousFocusRef.current?.focus();
    }
  }, [open]);

  // Global keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((element) => !element.hasAttribute("disabled"));

        if (focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (first && last) {
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((v) => (v + 1) % Math.max(filtered.length, 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((v) => (v - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[highlighted];
        if (item) {
          setRecentPages((prev) => {
            const next = [{ label: item.label, href: item.href }, ...prev.filter((p) => p.href !== item.href)].slice(0, 3);
            return next;
          });
          router.push(item.href);
          setOpen(false);
        }
        return;
      }
    }

    function onOpenRequest() {
      setOpen(true);
    }

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("fyxvo:open-command-palette", onOpenRequest);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("fyxvo:open-command-palette", onOpenRequest);
    };
  }, [open, filtered, highlighted, router]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onMouseDown={(e) => {
        // Close when clicking the backdrop (not the dialog)
        if (e.target === overlayRef.current) {
          setOpen(false);
        }
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] shadow-[0_24px_64px_rgba(0,0,0,0.32)] backdrop-blur-xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[var(--fyxvo-border)] px-4 py-3">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-4 w-4 shrink-0 text-[var(--fyxvo-text-muted)]"
            aria-hidden="true"
          >
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M13 13l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages…"
            className="flex-1 bg-transparent text-sm text-[var(--fyxvo-text)] outline-none placeholder:text-[var(--fyxvo-text-muted)]"
            aria-label="Command palette search"
          />
          <kbd className="hidden shrink-0 rounded border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--fyxvo-text-muted)] sm:block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-6 w-6 text-[var(--fyxvo-text-muted)]"
                aria-hidden="true"
              >
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="M13 13l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm text-[var(--fyxvo-text-muted)]">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <>
              {!query.trim() && recentPages.length > 0 && (
                <div>
                  <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                    Recent
                  </p>
                  <ul role="listbox" aria-label="Recent pages">
                    {recentPages.map((item) => (
                      <li key={`recent-${item.href}`} role="option" aria-selected={false}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors text-[var(--fyxvo-text-soft)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
                          onClick={() => {
                            setRecentPages((prev) => [{ label: item.label, href: item.href }, ...prev.filter((p) => p.href !== item.href)].slice(0, 3));
                            router.push(item.href);
                            setOpen(false);
                          }}
                        >
                          <span className="flex-1">
                            <span className="block font-medium">{item.label}</span>
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-[var(--fyxvo-text-muted)]">
                            {item.href}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mx-4 my-1 border-t border-[var(--fyxvo-border)]" />
                </div>
              )}
              <ul role="listbox" aria-label="Navigation results">
                {navFiltered.map((item, idx) => {
                  const isHighlighted = idx === highlighted;
                  return (
                    <li key={`nav-${item.href}`} role="option" aria-selected={isHighlighted}>
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                          isHighlighted
                            ? "bg-[var(--fyxvo-brand,#7c3aed)]/10 text-[var(--fyxvo-text)]"
                            : "text-[var(--fyxvo-text-soft)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
                        }`}
                        onMouseEnter={() => setHighlighted(idx)}
                        onClick={() => {
                          setRecentPages((prev) => [{ label: item.label, href: item.href }, ...prev.filter((p) => p.href !== item.href)].slice(0, 3));
                          router.push(item.href);
                          setOpen(false);
                        }}
                      >
                        <span className="flex-1">
                          <span className="block font-medium">{item.label}</span>
                          {item.description && <span className="block text-[11px] text-[var(--fyxvo-text-muted)]">{item.description}</span>}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-[var(--fyxvo-text-muted)]">
                          {item.href}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {dataResults.length > 0 && (
                <>
                  <div className="mx-4 my-1 border-t border-[var(--fyxvo-border)]" />
                  <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                    Data
                  </p>
                  <ul role="listbox" aria-label="Data results">
                    {dataResults.map((item, idx) => {
                      const globalIdx = navFiltered.length + idx;
                      const isHighlighted = globalIdx === highlighted;
                      return (
                        <li key={`data-${item.label}-${item.href}`} role="option" aria-selected={isHighlighted}>
                          <button
                            type="button"
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                              isHighlighted
                                ? "bg-[var(--fyxvo-brand,#7c3aed)]/10 text-[var(--fyxvo-text)]"
                                : "text-[var(--fyxvo-text-soft)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
                            }`}
                            onMouseEnter={() => setHighlighted(globalIdx)}
                            onClick={() => {
                              setRecentPages((prev) => [{ label: item.label, href: item.href }, ...prev.filter((p) => p.href !== item.href)].slice(0, 3));
                              router.push(item.href);
                              setOpen(false);
                            }}
                          >
                            <span className="flex-1">
                              <span className="block font-medium">{item.label}</span>
                              {item.description && (
                                <span className="block text-[11px] text-[var(--fyxvo-text-muted)]">
                                  {item.description}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 font-mono text-[11px] text-[var(--fyxvo-text-muted)]">
                              {item.href}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--fyxvo-border)] px-4 py-2">
          <div className="flex items-center gap-3 text-[10px] text-[var(--fyxvo-text-muted)]">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono">↑</kbd>
              <kbd className="rounded border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono">↵</kbd>
              go
            </span>
          </div>
          <span className="text-[10px] font-medium text-[var(--fyxvo-text-muted)]">⌘K</span>
        </div>
      </div>
    </div>
  );
}
