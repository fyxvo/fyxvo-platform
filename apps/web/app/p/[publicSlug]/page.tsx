import type { Metadata } from "next";
import Link from "next/link";
import CopyButton from "./copy-button";

const API = "https://api.fyxvo.com";

interface PublicProject {
  name?: string;
  displayName?: string;
  totalRequests?: number;
  requestCount?: number;
  avgLatency?: number;
  latency?: number;
  weeklyVolume?: number[];
  requestsLast7Days?: number[];
}

export async function generateMetadata({ params }: { params: Promise<{ publicSlug: string }> }): Promise<Metadata> {
  const { publicSlug } = await params;
  try {
    const res = await fetch(`${API}/v1/public/projects/${publicSlug}`, { cache: "no-store" });
    if (!res.ok) return { title: "Project" };
    const data = await res.json() as PublicProject;
    return { title: data.displayName ?? data.name ?? "Project" };
  } catch {
    return { title: "Project" };
  }
}

export default async function PublicProjectPage({ params }: { params: Promise<{ publicSlug: string }> }) {
  const { publicSlug } = await params;

  let project: PublicProject | null = null;
  try {
    const res = await fetch(`${API}/v1/public/projects/${publicSlug}`, { cache: "no-store" });
    if (res.ok) project = await res.json() as PublicProject;
  } catch {
    // project remains null
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-[#64748b] text-sm mb-4">Project not found.</p>
          <Link href="/explore" className="text-sm text-[#f97316] hover:underline">
            ← Browse projects
          </Link>
        </div>
      </div>
    );
  }

  const name = project.displayName ?? project.name ?? publicSlug;
  const totalRequests = project.totalRequests ?? project.requestCount ?? 0;
  const avgLatency = project.avgLatency ?? project.latency;
  const weeklyData: number[] = project.weeklyVolume ?? project.requestsLast7Days ?? [0, 0, 0, 0, 0, 0, 0];
  const maxVal = Math.max(...weeklyData, 1);

  const badgeMarkdown = `![Fyxvo](${API}/badge/project/${publicSlug})`;

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link href="/explore" className="text-sm text-[#f97316] hover:underline mb-8 inline-block">
          ← Back to explore
        </Link>

        <h1 className="text-4xl font-bold text-[#f1f5f9] mb-10">{name}</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12 max-w-2xl">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <p className="text-xs text-[#64748b] uppercase tracking-wider mb-1">Total requests</p>
            <p className="text-3xl font-bold text-[#f1f5f9]">{totalRequests.toLocaleString()}</p>
          </div>
          {avgLatency !== undefined && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
              <p className="text-xs text-[#64748b] uppercase tracking-wider mb-1">Avg latency</p>
              <p className="text-3xl font-bold text-[#f1f5f9]">{avgLatency}ms</p>
            </div>
          )}
        </div>

        {/* 7-day bar chart */}
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-medium text-[#f1f5f9] mb-4">Requests — last 7 days</p>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <div className="flex items-end gap-2 h-24">
              {weeklyData.map((val, idx) => (
                <div
                  key={idx}
                  className="flex-1 rounded-sm bg-[#f97316]/70 hover:bg-[#f97316] transition-colors"
                  style={{ height: `${Math.max((val / maxVal) * 100, 2)}%` }}
                  title={`Day ${idx + 1}: ${val.toLocaleString()} requests`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {weeklyData.map((_, idx) => (
                <span key={idx} className="text-xs text-[#64748b] flex-1 text-center">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][idx] ?? `D${idx + 1}`}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Badge */}
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-[#f1f5f9] mb-4">Badge</p>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="flex items-start justify-between gap-4">
              <pre className="text-xs font-mono text-[#94a3b8] whitespace-pre-wrap break-all flex-1">
                {badgeMarkdown}
              </pre>
              <CopyButton text={badgeMarkdown} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
