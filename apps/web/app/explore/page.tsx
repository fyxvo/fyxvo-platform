"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = "https://api.fyxvo.com";

interface ExploreProject {
  readonly id: string;
  readonly displayName: string;
  readonly publicSlug: string;
  readonly totalRequests: number;
  readonly averageLatencyMs: number;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
      <div className="h-5 w-2/3 rounded-lg bg-white/[0.06]" />
      <div className="h-4 w-1/2 rounded-lg bg-white/[0.04]" />
      <div className="h-4 w-1/3 rounded-lg bg-white/[0.04]" />
      <div className="h-4 w-24 rounded-lg bg-white/[0.04]" />
    </div>
  );
}

function ProjectCard({ project }: { readonly project: ExploreProject }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-transform hover:-translate-y-1 flex flex-col gap-3">
      <div>
        <p className="font-bold text-[#f1f5f9] leading-snug">{project.displayName}</p>
      </div>
      <div className="flex flex-col gap-1.5 text-sm text-[#64748b]">
        <div className="flex items-center justify-between">
          <span>Total requests</span>
          <span className="font-mono text-[#f1f5f9]">{project.totalRequests.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Avg latency</span>
          <span className="font-mono text-[#f1f5f9]">{project.averageLatencyMs}ms</span>
        </div>
      </div>
      <div className="pt-1 border-t border-white/[0.06]">
        <Link
          href={`/p/${project.publicSlug}`}
          className="text-sm text-[#f97316] hover:text-[#ea6c0a] transition-colors font-medium"
        >
          View project →
        </Link>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [projects, setProjects] = useState<ExploreProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/v1/explore`);
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = await res.json() as { projects?: ExploreProject[] } | ExploreProject[];
        if (Array.isArray(data)) {
          setProjects(data);
        } else if (data && typeof data === "object" && "projects" in data && Array.isArray(data.projects)) {
          setProjects(data.projects);
        } else {
          setProjects([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = projects.filter((p) =>
    p.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#f1f5f9] mb-2">Explore projects</h1>
          <p className="text-[#64748b]">
            Browse public Fyxvo projects and their request activity on devnet.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name..."
            className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#f97316]/50 transition-colors"
          />
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 && !error ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-12 text-center">
            <p className="text-[#64748b]">
              {search ? "No projects match your search." : "No public projects yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
