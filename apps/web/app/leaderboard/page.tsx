import Link from "next/link";
import { PageHeader } from "../../components/page-header";

interface LeaderboardEntry {
  rank: number;
  projectName: string;
  totalRequests: number;
  avgLatencyMs: number;
  hasPublicPage: boolean;
  publicSlug: string | null;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}

type PeriodKey = "7d" | "30d" | "all";

interface LeaderboardPageProps {
  searchParams: Promise<{ period?: string }>;
}

const PERIOD_OPTIONS: { key: PeriodKey; label: string; days: number | null }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "all", label: "All time", days: null },
];

async function fetchLeaderboard(days: number | null): Promise<LeaderboardResponse | null> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  try {
    const url = days != null
      ? `${apiBase}/v1/leaderboard?days=${days}`
      : `${apiBase}/v1/leaderboard`;
    const res = await fetch(url, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as LeaderboardResponse;
  } catch {
    return null;
  }
}

function rankBadgeClass(rank: number): string {
  if (rank === 1) return "text-[var(--fyxvo-rank-gold)] font-bold";
  if (rank === 2) return "text-[var(--fyxvo-rank-silver)] font-bold";
  if (rank === 3) return "text-[var(--fyxvo-rank-bronze)] font-bold";
  return "text-[var(--fyxvo-text-muted)]";
}

function periodLabel(key: PeriodKey): string {
  return PERIOD_OPTIONS.find((p) => p.key === key)?.label ?? "30 days";
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const resolvedParams = await searchParams;
  const rawPeriod = resolvedParams.period ?? "30d";
  const period: PeriodKey = (["7d", "30d", "all"] as PeriodKey[]).includes(rawPeriod as PeriodKey)
    ? (rawPeriod as PeriodKey)
    : "30d";
  const periodDays = PERIOD_OPTIONS.find((p) => p.key === period)?.days ?? 30;

  const data = await fetchLeaderboard(periodDays);

  // Compute stats from entries server-side
  const stats = data && data.entries.length > 0
    ? {
        totalRequests: data.entries.reduce((sum, e) => sum + e.totalRequests, 0),
        highestSingle: Math.max(...data.entries.map((e) => e.totalRequests)),
        fastestAvgLatency: Math.min(...data.entries.map((e) => e.avgLatencyMs)),
      }
    : null;

  return (
    <div className="space-y-10 lg:space-y-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          eyebrow="Community"
          title="Developer Leaderboard"
          description={`These are the most active projects over the last ${periodLabel(period).toLowerCase()}, ranked by how many requests they have handled. If you want your project on here, just flip the switch in your project settings.`}
        />
        {/* Period selector */}
        <div className="flex shrink-0 gap-1 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-1 self-start">
          {PERIOD_OPTIONS.map((opt) => (
            <Link
              key={opt.key}
              href={`?period=${opt.key}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                period === opt.key
                  ? "bg-[var(--fyxvo-brand)] text-white"
                  : "text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {data === null ? (
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-6 py-8 text-center">
          <p className="text-sm text-[var(--fyxvo-text-muted)]">
            We are having trouble loading the leaderboard right now. Give it a minute and try again.
          </p>
        </div>
      ) : data.entries.length === 0 ? (
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-6 py-10 text-center">
          <p className="text-sm text-[var(--fyxvo-text-muted)]">
            No one has joined the leaderboard yet, so you have a chance to be first. Head to your{" "}
            <Link href="/settings" className="text-[var(--fyxvo-brand)] underline">
              project settings
            </Link>{" "}
            and turn it on.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--fyxvo-border)]">
                <th className="py-3 pr-4 text-left font-medium text-[var(--fyxvo-text-muted)] w-12">
                  Rank
                </th>
                <th className="py-3 px-4 text-left font-medium text-[var(--fyxvo-text-muted)]">
                  Project
                </th>
                <th className="py-3 px-4 text-right font-medium text-[var(--fyxvo-text-muted)]">
                  Requests ({periodLabel(period)})
                </th>
                <th className="py-3 px-4 text-right font-medium text-[var(--fyxvo-text-muted)]">
                  Avg Latency
                </th>
                <th className="py-3 pl-4 text-right font-medium text-[var(--fyxvo-text-muted)] w-16">
                  Profile
                </th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr
                  key={entry.rank}
                  className="border-b border-[var(--fyxvo-border)] transition-colors hover:bg-[var(--fyxvo-panel-soft)]"
                >
                  <td className="py-4 pr-4">
                    <span
                      className={`font-mono text-base ${rankBadgeClass(entry.rank)}`}
                    >
                      #{entry.rank}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-medium text-[var(--fyxvo-text)]">
                      {entry.projectName}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-[var(--fyxvo-text)]">
                    {entry.totalRequests.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right text-[var(--fyxvo-text-muted)]">
                    {entry.avgLatencyMs.toFixed(1)} ms
                  </td>
                  <td className="py-4 pl-4 text-right">
                    {entry.hasPublicPage && entry.publicSlug ? (
                      <Link
                        href={`/p/${entry.publicSlug}`}
                        className="text-xs font-medium text-[var(--fyxvo-brand)] hover:underline"
                      >
                        View
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--fyxvo-text-muted)]">n/a</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Statistics section */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)] mb-2">
              Total requests combined
            </div>
            <div className="text-xl font-semibold text-[var(--fyxvo-text)]">
              {stats.totalRequests.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--fyxvo-text-muted)] mt-1">from every project on the board</div>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)] mb-2">
              Busiest single project
            </div>
            <div className="text-xl font-semibold text-[var(--fyxvo-text)]">
              {stats.highestSingle.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--fyxvo-text-muted)] mt-1">requests handled by the top project</div>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)] mb-2">
              Fastest average latency
            </div>
            <div className="text-xl font-semibold text-[var(--fyxvo-text)]">
              {stats.fastestAvgLatency.toFixed(1)} ms
            </div>
            <div className="text-xs text-[var(--fyxvo-text-muted)] mt-1">the quickest response time on the board</div>
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--fyxvo-text-muted)]">
        These rankings update every 5 minutes or so.
        {period !== "30d" && (
          <span className="ml-1 opacity-70">
            The period selector is cosmetic for now and will work fully once the backend supports the <code className="font-mono">days</code> parameter.
          </span>
        )}
      </p>
    </div>
  );
}
