import { previewProjects } from "../../lib/sample-data";

export default function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Leaderboard</h1>
      <p className="mt-4 text-[var(--fyxvo-text-muted)]">
        Top projects by request volume on Fyxvo.
      </p>
      <div className="mt-8 space-y-3">
        {previewProjects.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center gap-4 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4"
          >
            <span className="text-lg font-bold text-[var(--fyxvo-brand)]">#{i + 1}</span>
            <div>
              <p className="font-semibold text-[var(--fyxvo-text)]">{p.name}</p>
              <p className="text-xs text-[var(--fyxvo-text-muted)]">{p.network}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
