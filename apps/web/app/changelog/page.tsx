const ENTRIES = [
  {
    date: "2026-03-28",
    version: "alpha-live",
    title: "Hosted devnet private alpha",
    description:
      "Web, API, gateway, worker, wallet auth, project activation, funding, analytics, alerts, and assistant surfaces are running together as one hosted product.",
  },
  {
    date: "2026-03-27",
    version: "pricing-published",
    title: "Lamport-based request pricing",
    description:
      "Pricing is now clearly framed around funded usage: 1,000 lamports for standard RPC, 3,000 for compute-heavy methods, and 5,000 for priority relay.",
  },
  {
    date: "2026-03-26",
    version: "trust-surfaces",
    title: "Public trust surfaces online",
    description:
      "Status, security, reliability, explore, leaderboard, and public project surfaces are now treated as first-class parts of the product contract.",
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Changelog</h1>
      <p className="mt-4 text-[var(--fyxvo-text-muted)]">
        Milestones for the live devnet rollout.
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
