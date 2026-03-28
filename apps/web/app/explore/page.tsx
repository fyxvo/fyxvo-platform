import Link from "next/link";
import { getPublicExploreProjects } from "../../lib/public-data";

export default async function ExplorePage() {
  const items = await getPublicExploreProjects();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Explore</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        Public projects can opt into explore listings when they expose a public slug and choose to
        show health and traffic summaries.
      </p>

      {items.length > 0 ? (
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
              <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">{item.healthSummary}</p>
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
            The explore surface is wired and ready. It starts populating when projects enable public
            pages and opt into discoverability.
          </p>
        </div>
      )}
    </div>
  );
}
