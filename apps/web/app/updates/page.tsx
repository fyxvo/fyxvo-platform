"use client";

import { useEffect, useState } from "react";

const API = "https://api.fyxvo.com";

interface UpdatePost {
  id: string;
  slug: string;
  title: string;
  publishedAt: string;
  excerpt?: string;
  summary?: string;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 animate-pulse">
      <div className="h-4 bg-white/[0.06] rounded w-1/3 mb-3" />
      <div className="h-6 bg-white/[0.06] rounded w-2/3 mb-4" />
      <div className="h-4 bg-white/[0.06] rounded w-full mb-2" />
      <div className="h-4 bg-white/[0.06] rounded w-5/6" />
    </div>
  );
}

export default function UpdatesPage() {
  const [posts, setPosts] = useState<UpdatePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/v1/updates`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        const arr = Array.isArray(d) ? d : (d as { updates?: UpdatePost[]; posts?: UpdatePost[] }).updates ?? (d as { posts?: UpdatePost[] }).posts ?? [];
        setPosts(arr as UpdatePost[]);
      })
      .catch(() => setError("Failed to load updates. Please try again later."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-[#f1f5f9] mb-4">Updates</h1>
        <p className="text-[#64748b] mb-12 max-w-xl">
          Product announcements, changelog entries, and notes from the team.
        </p>

        {loading && (
          <div className="space-y-4 max-w-3xl">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 max-w-md">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center max-w-md">
            <p className="text-[#64748b] text-sm">No updates yet. Check back soon.</p>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="space-y-4 max-w-3xl">
            {posts.map((post) => (
              <a
                key={post.id}
                href={`/updates/${post.slug}`}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-transform hover:-translate-y-1 block"
              >
                <p className="text-xs text-[#64748b] mb-2">
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">{post.title}</h2>
                {(post.excerpt ?? post.summary) && (
                  <p className="text-sm text-[#64748b] line-clamp-3">{post.excerpt ?? post.summary}</p>
                )}
                <span className="mt-3 inline-block text-xs text-[#f97316] hover:underline">
                  Read more →
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
