import Link from "next/link";
import { getPublicLeaderboard } from "../../lib/public-data";

export default async function LeaderboardPage() {
  const entries = await getPublicLeaderboard();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Leaderboard</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        Leaderboard visibility is opt-in. Public projects can appear here when they expose a public
        page and choose to show relative traffic.
      </p>
      {entries.length > 0 ? (
        <div className="mt-8 space-y-3">
          {entries.map((entry) => (
            <div
              key={`${entry.rank}-${entry.projectName}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4"
            >
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-[var(--fyxvo-brand)]">#{entry.rank}</span>
                <div>
                  <p className="font-semibold text-[var(--fyxvo-text)]">{entry.projectName}</p>
                  <p className="text-xs text-[var(--fyxvo-text-muted)]">
                    {entry.totalRequests.toLocaleString()} requests in the last 30 days
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--fyxvo-text)]">{entry.avgLatencyMs}ms avg</p>
                {entry.publicSlug ? (
                  <Link
                    href={`/p/${entry.publicSlug}`}
                    className="text-xs text-[var(--fyxvo-brand)]"
                  >
                    Public page
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
          <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">
            No leaderboard entries yet
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            The leaderboard route is live, but no project has opted into a public ranking yet.
          </p>
        </div>
      )}
    </div>
  );
}
