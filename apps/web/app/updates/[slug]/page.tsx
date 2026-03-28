import { use } from "react";
import Link from "next/link";

interface UpdatePageProps {
  params: Promise<{ slug: string }>;
}

export default function UpdatePage({ params }: UpdatePageProps) {
  const { slug } = use(params);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Link
        href="/updates"
        className="text-sm text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
      >
        ← Back to updates
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">
        Update: {slug}
      </h1>
      <p className="mt-4 text-[var(--fyxvo-text-muted)]">
        Content coming soon.
      </p>
    </div>
  );
}
