import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicUpdate, marketingMilestones } from "../../../lib/public-data";

interface UpdatePageProps {
  params: Promise<{ slug: string }>;
}

export default async function UpdatePage({ params }: UpdatePageProps) {
  const { slug } = await params;
  const livePost = await getPublicUpdate(slug);
  const fallback = marketingMilestones.find((item) => item.slug === slug) ?? null;
  const post = livePost ?? fallback;

  if (!post) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Link
        href="/updates"
        className="text-sm text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
      >
        ← Back to updates
      </Link>
      <p className="mt-6 text-xs text-[var(--fyxvo-text-muted)]">
        {(post.publishedAt ?? "").slice(0, 10) || "Unscheduled"}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">
        {post.title}
      </h1>
      <p className="mt-4 text-lg leading-8 text-[var(--fyxvo-text-soft)]">{post.summary}</p>
      <div className="mt-8 space-y-5 text-base leading-8 text-[var(--fyxvo-text-soft)]">
        {post.content.split(/\n\n+/).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
