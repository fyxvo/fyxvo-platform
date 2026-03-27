import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@fyxvo/ui";
import { CopyButton } from "../../../components/copy-button";
import { webEnv } from "../../../lib/env";

interface PublicProjectData {
  id: string;
  name: string;
  displayName: string | null;
  slug: string;
  publicSlug: string;
  totalRequests: number;
  avgLatencyMs: number;
  requestVolume7d: unknown[];
  ownerReputationLevel?: string;
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
    alternates: {
      canonical: `${webEnv.siteUrl}/p/${publicSlug}`,
    },
    openGraph: {
      title: `${name} — Fyxvo`,
      description: `${name} is routing Solana devnet traffic via Fyxvo. ${requests.toLocaleString()} requests served.`,
      url: `${webEnv.siteUrl}/p/${publicSlug}`,
      siteName: "Fyxvo",
      type: "website",
      images: [{ url: webEnv.socialImageUrl }],
    },
    twitter: {
      card: "summary",
      title: `${name} — Fyxvo`,
      description: `${name} is routing Solana devnet traffic via Fyxvo. ${requests.toLocaleString()} requests served.`,
      images: [webEnv.socialImageUrl],
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

  const badgeMarkdown = `[![Fyxvo](${webEnv.apiBaseUrl}/badge/project/${project.publicSlug})](${webEnv.siteUrl}/p/${project.publicSlug})`;

  return (
    <div className="min-h-screen bg-[var(--fyxvo-bg)]">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-display text-lg font-bold text-[var(--fyxvo-text)]"
          >
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

      <main className="mx-auto max-w-4xl px-6 py-12 space-y-10">
        {/* Project header */}
        <section>
          {/* Live indicator */}
          <div className="mb-4 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-xs font-medium text-[var(--fyxvo-success)]">
              Live on Solana Devnet
            </span>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
                {displayName}
              </h1>
              <p className="mt-1 font-mono text-xs text-[var(--fyxvo-text-soft)]">
                @{project.publicSlug}
              </p>
              <div className="mt-3">
                <Badge tone="success">Active</Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-semibold text-[var(--fyxvo-text)]">
                {project.totalRequests.toLocaleString()}
              </p>
              <p className="text-xs text-[var(--fyxvo-text-muted)]">total requests</p>
            </div>
          </div>
        </section>

        {/* Metric cards */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
              Total requests
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-[var(--fyxvo-text)]">
              {project.totalRequests.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
              Average latency
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-[var(--fyxvo-text)]">
              {project.avgLatencyMs}
              <span className="ml-1 text-base font-normal text-[var(--fyxvo-text-muted)]">ms</span>
            </p>
          </div>

          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
              Status
            </p>
            <div className="mt-2">
              <Badge tone="success">Active</Badge>
            </div>
            <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">Solana devnet RPC</p>
          </div>
        </section>

        {/* Badge section */}
        <section className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--fyxvo-text)]">
              Add a badge to your project
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
              Show your project&apos;s live request count and status with a badge. Paste the
              Markdown snippet into your README to display a real-time indicator.
            </p>
          </div>

          {/* Badge preview */}
          <div className="flex items-center gap-3">
            <img
              src={`${webEnv.apiBaseUrl}/badge/project/${project.publicSlug}`}
              alt="Fyxvo project badge"
              className="h-5"
            />
            <span className="text-xs text-[var(--fyxvo-text-muted)]">Live preview</span>
          </div>

          {/* Markdown snippet */}
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--fyxvo-text-muted)]">
              Markdown
            </p>
            <div className="flex items-start gap-2">
              <pre className="flex-1 overflow-x-auto rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4 font-mono text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                {badgeMarkdown}
              </pre>
              <CopyButton value={badgeMarkdown} label="Copy" />
            </div>
          </div>
        </section>

        {/* Footer links */}
        <section className="flex flex-wrap items-center gap-4 border-t border-[var(--fyxvo-border)] pt-8">
          <Link
            href="/explore"
            className="text-sm text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
          >
            Back to Explore
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-[var(--fyxvo-brand)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Build on Fyxvo
          </Link>
        </section>
      </main>
    </div>
  );
}
