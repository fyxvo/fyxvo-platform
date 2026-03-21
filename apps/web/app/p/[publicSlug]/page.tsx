import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { webEnv } from "../../../lib/env";
import { PublicProjectActions } from "./public-project-actions";

interface PublicProjectData {
  id: string;
  name: string;
  displayName: string | null;
  slug: string;
  publicSlug: string;
  totalRequests: number;
  avgLatencyMs: number;
  requestVolume7d: unknown[];
}

async function fetchPublicProject(publicSlug: string): Promise<PublicProjectData | null> {
  try {
    const res = await fetch(new URL(`/v1/public/projects/${publicSlug}`, webEnv.apiBaseUrl), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<PublicProjectData>;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}): Promise<Metadata> {
  const { publicSlug } = await params;
  const project = await fetchPublicProject(publicSlug).catch(() => null);
  const name = project?.name ?? "Fyxvo Project";
  const requests = project?.totalRequests ?? 0;
  return {
    title: `${name} — Fyxvo`,
    description: `${name} is live on Solana Devnet via Fyxvo RPC gateway. ${requests.toLocaleString()} requests served.`,
    openGraph: {
      title: `${name} — Fyxvo`,
      description: `${name} is routing Solana devnet traffic via Fyxvo. ${requests.toLocaleString()} requests served.`,
      url: `https://www.fyxvo.com/p/${publicSlug}`,
      siteName: "Fyxvo",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${name} — Fyxvo`,
      description: `${name} is routing Solana devnet traffic via Fyxvo. ${requests.toLocaleString()} requests served.`,
    },
  };
}

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}) {
  const { publicSlug } = await params;
  const project = await fetchPublicProject(publicSlug);

  if (!project) notFound();

  const displayName = project.displayName ?? project.name;

  return (
    <div className="min-h-screen bg-[var(--fyxvo-bg)]">
      {/* Header */}
      <header className="border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/95 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-lg font-bold text-[var(--fyxvo-text)]">
            Fyxvo
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-1.5 text-xs font-medium text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
          >
            Open dashboard
          </Link>
        </div>
      </header>

      {/* Project hero */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        {/* Live indicator */}
        <div className="mb-4 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="text-xs font-medium text-green-600 dark:text-green-400">
            Live on Solana Devnet
          </span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-medium text-[var(--fyxvo-brand)] mb-4">
              Public project
            </div>
            <h1 className="font-display text-3xl font-bold text-[var(--fyxvo-text)] sm:text-4xl">
              {displayName}
            </h1>
            <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)] font-mono">
              {project.slug}
            </p>
          </div>
          <PublicProjectActions publicSlug={publicSlug} />
        </div>

        {/* Stats */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
            <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Total requests</p>
            <p className="mt-2 font-display text-3xl font-bold text-[var(--fyxvo-text)]">
              {project.totalRequests.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
            <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Avg latency (7d)</p>
            <p className="mt-2 font-display text-3xl font-bold text-[var(--fyxvo-text)]">
              {project.avgLatencyMs}
              <span className="text-base font-normal text-[var(--fyxvo-text-muted)] ml-1">ms</span>
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
            <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Powered by</p>
            <p className="mt-2 font-display text-xl font-bold text-[var(--fyxvo-brand)]">Fyxvo</p>
            <p className="text-xs text-[var(--fyxvo-text-muted)]">Solana devnet RPC</p>
          </div>
        </div>

        {/* Copy RPC endpoint */}
        <div className="mt-4 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
          <p className="text-xs text-[var(--fyxvo-text-muted)] mb-2">RPC endpoint (API key required)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-sm text-[var(--fyxvo-text)]">
              https://rpc.fyxvo.com/rpc
            </code>
            <PublicProjectActions publicSlug={publicSlug} variant="copy-rpc" />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="mx-auto max-w-4xl px-6 py-12 border-t border-[var(--fyxvo-border)]">
        <div className="text-center">
          <p className="text-sm text-[var(--fyxvo-text-muted)] mb-4">
            Build your own Solana infrastructure on Fyxvo
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </section>
    </div>
  );
}
