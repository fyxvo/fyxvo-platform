"use client";

import { useEffect, useState } from "react";

const API = "https://api.fyxvo.com";

interface LeaderboardEntry {
  rank?: number;
  projectName?: string;
  name?: string;
  totalRequests?: number;
  requestCount?: number;
  avgLatency?: number;
  latency?: number;
}

function rowStyle(rank: number): string {
  if (rank === 1) return "bg-amber-500/10 border border-amber-500/30";
  if (rank === 2) return "bg-slate-400/10 border border-slate-400/30";
  if (rank === 3) return "bg-orange-600/10 border border-orange-600/30";
  return "border border-white/[0.04]";
}

function rankLabel(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04] animate-pulse">
      <td className="px-4 py-3"><div className="h-4 bg-white/[0.06] rounded w-8" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-white/[0.06] rounded w-32" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-white/[0.06] rounded w-20" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-white/[0.06] rounded w-16" /></td>
    </tr>
  );
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/v1/leaderboard`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        const arr = Array.isArray(d)
          ? d
          : (d as { leaderboard?: LeaderboardEntry[]; entries?: LeaderboardEntry[] }).leaderboard ??
            (d as { entries?: LeaderboardEntry[] }).entries ??
            [];
        setEntries(arr as LeaderboardEntry[]);
      })
      .catch(() => setError("Failed to load leaderboard."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-[#f1f5f9] mb-4">Leaderboard</h1>
        <p className="text-[#64748b] mb-12">Top projects by total request volume on Fyxvo.</p>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 max-w-md">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!error && (
          <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-xs text-[#64748b] font-medium w-16">#</th>
                  <th className="px-4 py-3 text-left text-xs text-[#64748b] font-medium">Project</th>
                  <th className="px-4 py-3 text-right text-xs text-[#64748b] font-medium">Total Requests</th>
                  <th className="px-4 py-3 text-right text-xs text-[#64748b] font-medium">Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  [1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}

                {!loading && entries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-[#64748b]">
                      No entries yet.
                    </td>
                  </tr>
                )}

                {!loading &&
                  entries.map((entry, idx) => {
                    const rank = entry.rank ?? idx + 1;
                    const name = entry.projectName ?? entry.name ?? "—";
                    const requests = entry.totalRequests ?? entry.requestCount ?? 0;
                    const latency = entry.avgLatency ?? entry.latency;
                    return (
                      <tr
                        key={idx}
                        className={`${rowStyle(rank)} ${rank <= 3 ? "rounded-lg" : "border-b border-white/[0.04]"}`}
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-[#f1f5f9]">
                          {rankLabel(rank)}
                        </td>
                        <td className="px-4 py-3 text-[#f1f5f9] font-medium">{name}</td>
                        <td className="px-4 py-3 text-right font-mono text-[#94a3b8]">
                          {requests.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[#94a3b8]">
                          {latency !== undefined ? `${latency}ms` : "—"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
