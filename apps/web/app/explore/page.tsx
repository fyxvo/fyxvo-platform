import { previewProjects } from "../../lib/sample-data";

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Explore</h1>
      <p className="mt-4 text-[var(--fyxvo-text-muted)]">
        Discover public projects building on Fyxvo.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {previewProjects
          .filter((p) => p.publicSlug)
          .map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4"
            >
              <h2 className="font-semibold text-[var(--fyxvo-text)]">{p.name}</h2>
              <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">{p.description}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
