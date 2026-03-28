import Link from "next/link";
import { getPublicUpdates, marketingMilestones } from "../../lib/public-data";

export default async function UpdatesPage() {
  const livePosts = await getPublicUpdates();
  const updates = livePosts.length > 0 ? livePosts : marketingMilestones;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Updates</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        Product and rollout notes for the live devnet deployment. When admin-authored update posts
        exist, they appear here automatically.
      </p>
      <div className="mt-8 space-y-6">
        {updates.map((u) => (
          <Link
            key={u.slug}
            href={`/updates/${u.slug}`}
            className="block rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5 transition-colors hover:border-[var(--fyxvo-brand)]"
          >
            <p className="text-xs text-[var(--fyxvo-text-muted)]">
              {(u.publishedAt ?? "").slice(0, 10) || "Unscheduled"}
            </p>
            <h2 className="mt-1 font-semibold text-[var(--fyxvo-text)]">{u.title}</h2>
            <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">{u.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
