import { notFound } from "next/navigation";
import { getPublicProject } from "../../../lib/api";

interface PublicProjectPageProps {
  params: Promise<{ publicSlug: string }>;
}

export default async function PublicProjectPage({ params }: PublicProjectPageProps) {
  const { publicSlug } = await params;
  const project = await getPublicProject(publicSlug);

  if (!project) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">Public project</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--fyxvo-text)]">
        {project.displayName ?? project.name}
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        This public project page is generated from the live control plane. It shows the public
        slug, recent request activity, and the latency shape that the project has chosen to expose.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            Public slug
          </p>
          <p className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">{project.publicSlug}</p>
        </div>
        <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            Total requests
          </p>
          <p className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
            {project.totalRequests.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            Average latency
          </p>
          <p className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
            {project.avgLatencyMs}ms
          </p>
        </div>
      </div>

      <div className="mt-10 rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
        <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">Request volume</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
          The chart payload below is the direct seven-day response returned by the public stats
          endpoint. It is shown as raw structured data so the page stays accurate even when the
          project has only recently turned public visibility on.
        </p>
        <pre className="mt-6 overflow-x-auto rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 text-xs leading-6 text-[var(--fyxvo-text-soft)]">
          <code>{JSON.stringify(project.requestVolume7d, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}
