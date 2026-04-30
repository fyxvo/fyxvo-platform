"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../../components/loading-skeleton";
import { RetryBanner } from "../../components/retry-banner";
import { API_BASE } from "../../lib/env";
import type { PublicExploreProject } from "../../lib/public-data";

export default function ExplorePage() {
  const [items, setItems] = useState<PublicExploreProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadExplore() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/v1/explore`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as {
        items?: PublicExploreProject[];
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? payload.error ?? "Unable to load explore projects.");
      }

      setItems(payload.items ?? []);
    } catch (requestError) {
      setItems([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load explore projects."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadExplore();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-20">
      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] px-3 py-1.5 rounded-full border border-[var(--fyxvo-brand)]/20 bg-[var(--fyxvo-brand)]/5 text-[var(--fyxvo-brand)]">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        Explore Projects
      </p>
      <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-[var(--fyxvo-text)]">Discover public projects</h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        Explore lists real public Fyxvo projects. Teams appear here only after they enable a
        public slug and turn on discoverability from project settings.
      </p>

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4"
            >
              <LoadingSkeleton className="h-5 w-40" />
              <LoadingSkeleton className="mt-4 h-4 w-full" />
              <LoadingSkeleton className="mt-2 h-4 w-3/4" />
              <LoadingSkeleton className="mt-6 h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-8">
          <RetryBanner message={error} onRetry={loadExplore} />
        </div>
      ) : items.length > 0 ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5 transition-all duration-300 hover:border-[var(--fyxvo-brand)]/20 hover:shadow-lg hover:shadow-[var(--fyxvo-brand)]/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--fyxvo-text)] group-hover:text-[var(--fyxvo-brand)] transition-colors">{item.projectName}</h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                    {item.healthSummary}
                  </p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] border border-[var(--fyxvo-border)]">
                  {item.templateType}
                </span>
              </div>
              
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-[var(--fyxvo-panel-soft)] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Requests</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--fyxvo-text)]">{item.requestVolume7d.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-[var(--fyxvo-panel-soft)] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Latency</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--fyxvo-text)]">{item.averageLatencyMs7d}ms</p>
                </div>
                <div className="rounded-xl bg-[var(--fyxvo-panel-soft)] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Success</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-400">{Math.round(item.successRate7d * 100)}%</p>
                </div>
              </div>
              
              {item.publicSlug ? (
                <Link
                  href={`/p/${item.publicSlug}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--fyxvo-brand)] group-hover:gap-3 transition-all"
                >
                  View public page
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-3xl border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8 sm:p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--fyxvo-brand)]/10 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-[var(--fyxvo-brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">
            No public projects yet
          </h2>
          <p className="mt-4 max-w-md mx-auto text-sm leading-relaxed text-[var(--fyxvo-text-soft)]">
            No team has made a project public yet. Projects appear here after the owner enables
            a public page and turns on discoverability.
          </p>
          <Link
            href="/docs#public-project-pages"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--fyxvo-brand)] hover:gap-3 transition-all"
          >
            Learn how public pages work
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
