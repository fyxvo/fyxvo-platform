const ENTRIES = [
  {
    date: "2026-03-26",
    version: "v0.9.0",
    title: "Priority Relay GA",
    description: "Priority relay is now generally available for all projects.",
  },
  {
    date: "2026-02-15",
    version: "v0.8.0",
    title: "Fyxvo Assistant",
    description: "Introducing the AI assistant for onboarding, debugging, and project insights.",
  },
  {
    date: "2026-01-10",
    version: "v0.7.0",
    title: "On-chain Treasury",
    description: "Projects can now fund their treasury directly on-chain.",
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Changelog</h1>
      <p className="mt-4 text-[var(--fyxvo-text-muted)]">
        What&apos;s new in Fyxvo.
      </p>
      <div className="mt-10 space-y-8">
        {ENTRIES.map((entry) => (
          <div key={entry.version} className="relative pl-6 border-l border-[var(--fyxvo-border)]">
            <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-[var(--fyxvo-brand)]" />
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--fyxvo-text-muted)]">{entry.date}</span>
              <span className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-2 py-0.5 text-xs text-[var(--fyxvo-text-muted)]">
                {entry.version}
              </span>
            </div>
            <h2 className="mt-1 text-lg font-semibold text-[var(--fyxvo-text)]">{entry.title}</h2>
            <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">{entry.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
