import type { Metadata } from "next";
import Link from "next/link";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: {
    absolute: "Updates — Fyxvo"
  },
  description: "Latest Fyxvo platform updates, release notes, and announcements.",
  alternates: {
    canonical: `${webEnv.siteUrl}/updates`
  },
  openGraph: {
    title: "Updates — Fyxvo",
    description: "Latest Fyxvo platform updates, release notes, and announcements.",
    url: `${webEnv.siteUrl}/updates`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Updates — Fyxvo",
    description: "Latest Fyxvo platform updates, release notes, and announcements.",
    images: [webEnv.socialImageUrl]
  }
};

interface UpdatePost {
  readonly id: string;
  readonly title: string;
  readonly publishedAt: string;
  readonly summary: string;
  readonly content: string;
}

async function fetchUpdates(): Promise<UpdatePost[]> {
  try {
    const response = await fetch(new URL("/v1/updates", webEnv.apiBaseUrl).toString(), {
      cache: "no-store",
    });
    if (!response.ok) return [];
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "posts" in body &&
      Array.isArray((body as Record<string, unknown>).posts)
    ) {
      return (body as { posts: UpdatePost[] }).posts;
    }
    return [];
  } catch {
    return [];
  }
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function readingTimeMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function deriveTags(post: UpdatePost): string[] {
  const source = `${post.title} ${post.summary} ${post.content}`.toLowerCase();
  const tags = [];
  if (source.includes("assistant")) tags.push("assistant");
  if (source.includes("webhook")) tags.push("webhooks");
  if (source.includes("gateway")) tags.push("gateway");
  if (source.includes("analytics")) tags.push("analytics");
  if (source.includes("status")) tags.push("status");
  if (tags.length === 0) tags.push("product");
  return tags.slice(0, 3);
}

export default async function UpdatesPage() {
  const posts = [...(await fetchUpdates())].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-16 sm:px-6 lg:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
          Updates
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
          What&apos;s new
        </h1>
        <p className="mt-3 text-base text-[var(--fyxvo-text-muted)]">
          Product updates, protocol changes, and announcements from the Fyxvo team.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-6 py-8 text-center">
          <p className="text-sm text-[var(--fyxvo-text-muted)]">
            No updates yet. Follow us on X or Discord for announcements.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="https://x.com/fyxvo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--fyxvo-text)] transition hover:border-brand-400"
            >
              Follow on X
            </Link>
            <Link
              href="https://discord.gg/Uggu236Jgj"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--fyxvo-text)] transition hover:border-brand-400"
            >
              Join Discord
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {posts.map((post, index) => (
              <article
                key={post.id}
                className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6"
              >
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--fyxvo-text-muted)]">
                  <time dateTime={post.publishedAt} className="font-semibold uppercase tracking-[0.14em]">
                    {formatDate(post.publishedAt)}
                  </time>
                  <span>{readingTimeMinutes(post.content)} min read</span>
                  <div className="flex flex-wrap gap-2">
                    {deriveTags(post).map((tag) => (
                      <span key={tag} className="rounded-full border border-[var(--fyxvo-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <h2 className="mt-2 font-display text-xl font-semibold text-[var(--fyxvo-text)]">
                  {post.title}
                </h2>
                {post.summary ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    {post.summary}
                  </p>
                ) : null}
                {post.content ? (
                  <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--fyxvo-text-muted)]">
                    {post.content
                      .split(/\n{2,}/)
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((paragraph) => (
                        <p key={paragraph.slice(0, 20)}>{paragraph}</p>
                      ))}
                  </div>
                ) : null}
                {posts.length > 1 ? (
                  <div className="mt-5 flex items-center justify-between border-t border-[var(--fyxvo-border)] pt-4 text-sm">
                    <span className="text-[var(--fyxvo-text-muted)]">
                      {posts[index + 1] ? `Previous: ${posts[index + 1]!.title}` : "Newest post"}
                    </span>
                    <span className="text-[var(--fyxvo-text-muted)]">
                      {posts[index - 1] ? `Next: ${posts[index - 1]!.title}` : "Oldest post"}
                    </span>
                  </div>
                ) : null}
              </article>
            ))}
        </div>
      )}

      <div className="border-t border-[var(--fyxvo-border)] pt-8">
        <p className="text-sm text-[var(--fyxvo-text-muted)]">
          Stay in the loop:{" "}
          <Link
            href="https://x.com/fyxvo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--fyxvo-brand)] underline hover:no-underline"
          >
            @fyxvo on X
          </Link>
          {" · "}
          <Link
            href="https://discord.gg/Uggu236Jgj"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--fyxvo-brand)] underline hover:no-underline"
          >
            Discord
          </Link>
        </p>
      </div>
    </div>
  );
}
