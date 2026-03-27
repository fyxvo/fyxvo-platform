"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";
import { webEnv } from "../../lib/env";
import type { ExploreProjectEntry } from "../../lib/types";

function formatRequests(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5 space-y-4">
      <div className="space-y-2">
        <div className="h-5 w-2/3 rounded bg-[var(--fyxvo-border)]" />
        <div className="h-3 w-1/3 rounded bg-[var(--fyxvo-border)]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 rounded-xl bg-[var(--fyxvo-border)]" />
        <div className="h-14 rounded-xl bg-[var(--fyxvo-border)]" />
        <div className="h-14 rounded-xl bg-[var(--fyxvo-border)]" />
        <div className="h-14 rounded-xl bg-[var(--fyxvo-border)]" />
      </div>
    </div>
  );
}

function ProjectCard({ project }: { readonly project: ExploreProjectEntry }) {
  const successPct = (project.successRate7d * 100).toFixed(1);
  const latency =
    project.averageLatencyMs7d > 0
      ? `${Math.round(project.averageLatencyMs7d)} ms`
      : "No data";

  return (
    <article className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[var(--fyxvo-text)] truncate">
            {project.projectName}
          </h3>
          {project.publicSlug ? (
            <p className="mt-0.5 text-xs text-[var(--fyxvo-text-muted)]">
              @{project.publicSlug}
            </p>
          ) : null}
        </div>
        {project.reputationBadge ? (
          <Badge tone="brand">{project.reputationBadge}</Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            Requests (7d)
          </div>
          <div className="mt-1 text-base font-semibold text-[var(--fyxvo-text)]">
            {formatRequests(project.requestVolume7d)}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            Avg latency
          </div>
          <div className="mt-1 text-base font-semibold text-[var(--fyxvo-text)]">{latency}</div>
        </div>
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            Success rate
          </div>
          <div className="mt-1 text-base font-semibold text-[var(--fyxvo-text)]">
            {successPct}%
          </div>
        </div>
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            Health
          </div>
          <div className="mt-1 text-sm font-medium text-[var(--fyxvo-text)] capitalize truncate">
            {project.healthSummary || "Unknown"}
          </div>
        </div>
      </div>

      {project.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--fyxvo-border)] px-2 py-0.5 text-[11px] text-[var(--fyxvo-text-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto pt-1">
        {project.publicSlug ? (
          <Link
            href={`/p/${project.publicSlug}`}
            className="text-sm font-medium text-[var(--fyxvo-brand)] hover:underline"
          >
            View project
          </Link>
        ) : (
          <span className="text-sm text-[var(--fyxvo-text-muted)]">No public page yet</span>
        )}
      </div>
    </article>
  );
}

export default function ExplorePage() {
  const [projects, setProjects] = useState<ExploreProjectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");

  function triggerLoad() {
    setLoading(true);
    setError(false);
    fetch(new URL("/v1/public/projects", webEnv.apiBaseUrl).toString())
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => setProjects(Array.isArray(data) ? (data as ExploreProjectEntry[]) : []))
      .catch(() => {
        setProjects([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const r = await fetch(new URL("/v1/public/projects", webEnv.apiBaseUrl).toString());
        const data: unknown = r.ok ? await r.json() : [];
        if (!cancelled) setProjects(Array.isArray(data) ? (data as ExploreProjectEntry[]) : []);
      } catch {
        if (!cancelled) { setProjects([]); setError(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => { cancelled = true; };
  }, []);

  const filtered = projects.filter((p) =>
    search.trim() === "" ||
    p.projectName.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        eyebrow="Explore"
        title="Public projects on Fyxvo devnet"
        description="Every project shown here was made public by its creator. Browse to see what teams are building on the Fyxvo relay network, filter by name, and follow any project that catches your eye."
      />

      {/* Search */}
      <div className="max-w-sm">
        <label htmlFor="explore-search" className="sr-only">
          Search projects
        </label>
        <input
          id="explore-search"
          type="search"
          placeholder="Search by project name..."
          className="w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2.5 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] outline-none focus:border-[var(--fyxvo-brand)] transition"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        /* Error state */
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-8 text-center space-y-4">
          <p className="text-sm font-medium text-[var(--fyxvo-text)]">
            Could not load projects
          </p>
          <p className="text-sm text-[var(--fyxvo-text-muted)]">
            There was a problem fetching public projects from the Fyxvo API. This is usually
            temporary. Give it a moment and try again.
          </p>
          <button
            type="button"
            onClick={triggerLoad}
            className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2 text-sm font-medium text-[var(--fyxvo-text)] transition hover:border-[var(--fyxvo-brand)]"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-8 text-center space-y-3">
          <p className="text-sm font-medium text-[var(--fyxvo-text)]">
            No public projects available yet
          </p>
          <p className="text-sm text-[var(--fyxvo-text-muted)]">
            {search.trim()
              ? "No projects matched that search. Try a different name or clear the search field to see all projects."
              : "Teams on the Fyxvo devnet alpha have not yet made their projects public. Check back as the platform grows."}
          </p>
          {search.trim() ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2 text-sm font-medium text-[var(--fyxvo-text)] transition hover:border-[var(--fyxvo-brand)]"
            >
              Clear search
            </button>
          ) : null}
        </div>
      ) : (
        /* Project grid */
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
