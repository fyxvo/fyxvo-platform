"use client";

import { Modal } from "@fyxvo/ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchWorkspace } from "../lib/api";
import { usePortal } from "../lib/portal-context";
import type { SearchResult } from "../lib/types";

const STATIC_OPTIONS: Array<{ label: string; description: string; path: string }> = [
  { label: "Home", description: "Product overview", path: "/" },
  { label: "Pricing", description: "Lamport pricing and funding model", path: "/pricing" },
  { label: "Documentation", description: "API and onboarding docs", path: "/docs" },
  { label: "Status", description: "Live platform health", path: "/status" },
  { label: "Enterprise", description: "Contact enterprise support", path: "/enterprise" },
];

export function CommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { token, walletPhase } = usePortal();
  const isAuthenticated = walletPhase === "authenticated" && !!token;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    projects: SearchResult[];
    apiKeys: SearchResult[];
    requests: SearchResult[];
  }>({
    projects: [],
    apiKeys: [],
    requests: [],
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open || !isAuthenticated || !token) return;
    if (!query.trim()) {
      setResults({ projects: [], apiKeys: [], requests: [] });
      setError(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const nextResults = await searchWorkspace({ token, q: query.trim() });
          setResults(nextResults);
        } catch (searchError) {
          setError(
            searchError instanceof Error ? searchError.message : "Unable to search the workspace."
          );
        } finally {
          setLoading(false);
        }
      })();
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [isAuthenticated, open, query, token]);

  const groupedResults = useMemo(
    () => [
      { label: "Projects", items: results.projects },
      { label: "API keys", items: results.apiKeys },
      { label: "Requests", items: results.requests },
    ].filter((group) => group.items.length > 0),
    [results]
  );

  const navigate = (path: string) => {
    setOpen(false);
    setQuery("");
    router.push(path);
  };

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Command palette"
      description="Search the workspace with Ctrl K or Cmd K."
      footer={null}
    >
      <div className="space-y-4">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            isAuthenticated
              ? "Search projects, API keys, or requests…"
              : "Browse public navigation"
          }
          className="h-12 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
        />

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        {!isAuthenticated ? (
          <div className="space-y-2">
            {STATIC_OPTIONS.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className="w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-left transition-colors hover:border-[var(--fyxvo-brand)]"
              >
                <p className="text-sm font-medium text-[var(--fyxvo-text)]">{item.label}</p>
                <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">{item.description}</p>
              </button>
            ))}
          </div>
        ) : loading ? (
          <p className="text-sm text-[var(--fyxvo-text-muted)]">Searching workspace…</p>
        ) : groupedResults.length > 0 ? (
          <div className="space-y-4">
            {groupedResults.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <button
                      key={`${item.type}:${item.path}:${item.displayName}`}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className="w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-left transition-colors hover:border-[var(--fyxvo-brand)]"
                    >
                      <p className="text-sm font-medium text-[var(--fyxvo-text)]">
                        {item.displayName}
                      </p>
                      {item.description ? (
                        <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
                          {item.description}
                        </p>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : query.trim() ? (
          <p className="text-sm text-[var(--fyxvo-text-muted)]">
            No matching workspace results were found.
          </p>
        ) : (
          <div className="space-y-2">
            {STATIC_OPTIONS.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className="w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-left transition-colors hover:border-[var(--fyxvo-brand)]"
              >
                <p className="text-sm font-medium text-[var(--fyxvo-text)]">{item.label}</p>
                <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">{item.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
