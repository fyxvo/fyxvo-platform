import Link from "next/link";

const UPDATES = [
  {
    slug: "priority-relay-ga",
    title: "Priority Relay is Generally Available",
    date: "2026-03-26",
    excerpt: "Our priority relay service is now GA for all projects.",
  },
  {
    slug: "fyxvo-assistant",
    title: "Introducing Fyxvo Assistant",
    date: "2026-02-15",
    excerpt: "An AI-powered assistant built into your dashboard.",
  },
];

export default function UpdatesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Updates</h1>
      <div className="mt-8 space-y-6">
        {UPDATES.map((u) => (
          <Link
            key={u.slug}
            href={`/updates/${u.slug}`}
            className="block rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5 transition-colors hover:border-[var(--fyxvo-brand)]"
          >
            <p className="text-xs text-[var(--fyxvo-text-muted)]">{u.date}</p>
            <h2 className="mt-1 font-semibold text-[var(--fyxvo-text)]">{u.title}</h2>
            <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">{u.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
