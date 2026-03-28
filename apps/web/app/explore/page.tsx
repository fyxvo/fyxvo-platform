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
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Explore</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
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
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-[var(--fyxvo-text)]">{item.projectName}</h2>
                <span className="text-xs text-[var(--fyxvo-text-muted)]">
                  {item.templateType}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                {item.healthSummary}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--fyxvo-text-muted)]">
                <span>{item.requestVolume7d.toLocaleString()} req / 7d</span>
                <span>{item.averageLatencyMs7d}ms avg latency</span>
                <span>{Math.round(item.successRate7d * 100)}% success</span>
              </div>
              {item.publicSlug ? (
                <Link
                  href={`/p/${item.publicSlug}`}
                  className="mt-4 inline-flex text-sm font-medium text-[var(--fyxvo-brand)]"
                >
                  View public page
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
          <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">
            No public projects are listed yet
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            The explore surface is live. Projects appear here after the owner opens project
            settings, enables a public page, assigns a public slug, and turns on discoverability.
          </p>
        </div>
      )}
    </div>
  );
}
