import type { Metadata } from "next";

const API = "https://api.fyxvo.com";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API}/v1/updates/${slug}`);
    if (!res.ok) return { title: "Update" };
    const data = await res.json();
    return { title: (data as { title?: string }).title ?? "Update", description: (data as { excerpt?: string }).excerpt ?? "" };
  } catch {
    return { title: "Update" };
  }
}

export default async function UpdateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let post: Record<string, unknown> | null = null;
  try {
    const res = await fetch(`${API}/v1/updates/${slug}`, { cache: "no-store" });
    if (res.ok) post = await res.json();
  } catch {
    // post remains null
  }

  if (!post) {
    return (
      <div className="py-20 text-center text-[#64748b]">
        <p>Update not found.</p>
        <a href="/updates" className="mt-4 inline-block text-[#f97316]">← Back to updates</a>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <a href="/updates" className="text-sm text-[#f97316] hover:underline">← All updates</a>
      <h1 className="mt-6 font-display text-4xl font-bold text-[#f1f5f9] tracking-tight">{String(post.title ?? "")}</h1>
      <p className="mt-2 text-sm text-[#64748b]">{post.publishedAt ? new Date(String(post.publishedAt)).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : ""}</p>
      <div className="mt-8 prose prose-invert max-w-none text-[#94a3b8]" dangerouslySetInnerHTML={{ __html: String(post.content ?? post.body ?? post.excerpt ?? "") }} />
    </article>
  );
}
