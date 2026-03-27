import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Explore Public Projects — Fyxvo",
  description:
    "Take a look at what other developers have built on Fyxvo. Filter by template, tags, traffic, and more to find projects that interest you.",
  alternates: { canonical: "https://www.fyxvo.com/explore" },
  openGraph: {
    title: "Explore Public Projects — Fyxvo",
    description: "Take a look at what other developers have built on Fyxvo.",
    url: "https://www.fyxvo.com/explore",
    siteName: "Fyxvo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Public Projects — Fyxvo",
    description: "Take a look at what other developers have built on Fyxvo.",
  },
};

interface ExploreProjectEntry {
  id: string;
  projectName: string;
  publicSlug: string | null;
  templateType: string;
  tags: string[];
  leaderboardVisible: boolean;
  requestVolume7d: number;
  averageLatencyMs7d: number;
  successRate7d: number;
  healthSummary: string;
  reputationBadge: string;
  createdAt: string;
}

interface ExplorePageProps {
  searchParams: Promise<{
    templateType?: string;
    tag?: string;
    leaderboardVisible?: string;
    recentTraffic?: string;
    recentlyCreated?: string;
  }>;
}

async function fetchExploreProjects(searchParams: URLSearchParams): Promise<ExploreProjectEntry[]> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  try {
    const url = new URL("/v1/explore", apiBase);
    for (const [key, value] of searchParams.entries()) {
      url.searchParams.set(key, value);
    }
    const response = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!response.ok) return [];
    const body = (await response.json()) as { items?: ExploreProjectEntry[] };
    return body.items ?? [];
  } catch {
    return [];
  }
}

function buildHref(current: URLSearchParams, updates: Record<string, string | null>): string {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/explore?${query}` : "/explore";
}

function toggleParam(current: URLSearchParams, key: string, value: string): string {
  return buildHref(current, { [key]: current.get(key) === value ? null : value });
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const resolvedParams = await searchParams;
  const filters = new URLSearchParams();
  if (resolvedParams.templateType) filters.set("templateType", resolvedParams.templateType);
  if (resolvedParams.tag) filters.set("tag", resolvedParams.tag);
  if (resolvedParams.leaderboardVisible === "true") filters.set("leaderboardVisible", "true");
  if (resolvedParams.recentTraffic === "true") filters.set("recentTraffic", "true");
  if (resolvedParams.recentlyCreated === "true") filters.set("recentlyCreated", "true");

  const items = await fetchExploreProjects(filters);
  const templateTypes = Array.from(new Set(items.map((item) => item.templateType).filter(Boolean))).sort();
  const tags = Array.from(new Set(items.flatMap((item) => item.tags))).sort();

  return (
    <div className="space-y-10 lg:space-y-12">
      <section className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">Explore</p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-5xl">
              What people are building right now
            </h1>
            <p className="max-w-3xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
              Every project you see here was made public by its creator. Have a look around, narrow things down by template or tag, or just browse to see what catches your eye.
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2 text-sm font-medium text-[var(--fyxvo-text)] transition hover:border-[var(--fyxvo-brand-border)] hover:text-[var(--fyxvo-brand)]"
          >
            Open leaderboard
          </Link>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Filters</div>
            <p className="mt-1 text-sm text-[var(--fyxvo-text-soft)]">
              All of these filters update the URL, so if you find a view you like, just copy the link and share it with your team.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/explore"
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${filters.toString() === "" ? "border-[var(--fyxvo-brand-border)] bg-[var(--fyxvo-brand-soft)] text-[var(--fyxvo-text)]" : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)]"}`}
              >
                All projects
              </Link>
              <Link
                href={toggleParam(filters, "leaderboardVisible", "true")}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${filters.get("leaderboardVisible") === "true" ? "border-[var(--fyxvo-brand-border)] bg-[var(--fyxvo-brand-soft)] text-[var(--fyxvo-text)]" : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)]"}`}
              >
                On the leaderboard
              </Link>
              <Link
                href={toggleParam(filters, "recentTraffic", "true")}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${filters.get("recentTraffic") === "true" ? "border-[var(--fyxvo-brand-border)] bg-[var(--fyxvo-brand-soft)] text-[var(--fyxvo-text)]" : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)]"}`}
              >
                Active recently
              </Link>
              <Link
                href={toggleParam(filters, "recentlyCreated", "true")}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${filters.get("recentlyCreated") === "true" ? "border-[var(--fyxvo-brand-border)] bg-[var(--fyxvo-brand-soft)] text-[var(--fyxvo-text)]" : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)]"}`}
              >
                New projects
              </Link>
            </div>

            {templateTypes.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Template type</div>
                <div className="flex flex-wrap gap-2">
                  {templateTypes.map((templateType) => (
                    <Link
                      key={templateType}
                      href={toggleParam(filters, "templateType", templateType)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${filters.get("templateType") === templateType ? "border-[var(--fyxvo-brand-border)] bg-[var(--fyxvo-brand-soft)] text-[var(--fyxvo-text)]" : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)]"}`}
                    >
                      {templateType}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {tags.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Link
                      key={tag}
                      href={toggleParam(filters, "tag", tag)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${filters.get("tag") === tag ? "border-[var(--fyxvo-brand-border)] bg-[var(--fyxvo-brand-soft)] text-[var(--fyxvo-text)]" : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)]"}`}
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-8 text-center text-sm text-[var(--fyxvo-text-muted)]">
          No projects matched those filters. Try loosening things up a bit, or check back later when more projects have been shared.
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {items.map((project) => (
            <article key={project.id} className="rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--fyxvo-text)]">{project.projectName}</h2>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    {project.templateType} · {project.reputationBadge}
                  </p>
                </div>
                {project.leaderboardVisible ? (
                  <span className="rounded-full border border-[var(--fyxvo-brand-border)] bg-[var(--fyxvo-brand-soft)] px-2 py-1 text-[11px] font-medium text-[var(--fyxvo-brand)]">
                    leaderboard
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Requests (7 days)</div>
                  <div className="mt-1 text-base font-semibold text-[var(--fyxvo-text)]">{project.requestVolume7d.toLocaleString()}</div>
                </div>
                <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Avg latency</div>
                  <div className="mt-1 text-base font-semibold text-[var(--fyxvo-text)]">{project.averageLatencyMs7d.toFixed(0)} ms</div>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-[var(--fyxvo-text-soft)]">
                <div>Health: {project.healthSummary}</div>
                <div>Success rate: {(project.successRate7d * 100).toFixed(1)}%</div>
                <div>Created on {new Date(project.createdAt).toLocaleDateString()}</div>
              </div>
              {project.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={toggleParam(filters, "tag", tag)}
                      className="rounded-full border border-[var(--fyxvo-border)] px-2 py-1 text-[11px] text-[var(--fyxvo-text-muted)]"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap items-center gap-3">
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
          ))}
        </section>
      )}
    </div>
  );
}
