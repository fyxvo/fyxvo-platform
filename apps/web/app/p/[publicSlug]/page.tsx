import { notFound } from "next/navigation";
import { getProjectWidget, getPublicProject } from "../../../lib/api";
import { SITE_URL } from "../../../lib/env";

interface PublicProjectPageProps {
  params: Promise<{ publicSlug: string }>;
}

export default async function PublicProjectPage({ params }: PublicProjectPageProps) {
  const { publicSlug } = await params;
  const project = await getPublicProject(publicSlug);

  if (!project) {
    notFound();
  }

  const widget = await getProjectWidget(project.id);
  const badgeMarkdown = `[![Fyxvo status](${SITE_URL}/badge/project/${project.publicSlug})](${SITE_URL}/p/${project.publicSlug})`;
  const iframeCode = `<iframe src="${SITE_URL}/widget/project/${project.id}?theme=dark" title="${project.displayName ?? project.name} Fyxvo widget" width="360" height="320" style="border:0;" loading="lazy"></iframe>`;
  const maxVolume = Math.max(
    ...project.requestVolume7d.map((entry) =>
      typeof (entry as { count?: number }).count === "number"
        ? (entry as { count: number }).count
        : 0
    ),
    1
  );

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
          The seven-day volume feed below is returned by the live public project endpoint and is
          the same shape used by the embeddable widget.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-7">
          {project.requestVolume7d.map((point, index) => {
            const safePoint = point as { date?: string; count?: number };
            const count = typeof safePoint.count === "number" ? safePoint.count : 0;
            const height = Math.max(12, Math.round((count / maxVolume) * 100));

            return (
              <div
                key={`${safePoint.date ?? "day"}-${index}`}
                className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
              >
                <div className="flex h-24 items-end rounded-2xl bg-[var(--fyxvo-bg)] p-2">
                  <div
                    className="w-full rounded-full bg-[var(--fyxvo-brand)]"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  {safePoint.date ? safePoint.date.slice(5) : `Day ${index + 1}`}
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--fyxvo-text)]">
                  {count.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">README badge</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            Use the public badge in a README, docs page, or status note to link directly back to
            this live project profile.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 text-xs leading-6 text-[var(--fyxvo-text-soft)]">
            <code>{badgeMarkdown}</code>
          </pre>
        </div>

        <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">Embed widget</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            Drop this iframe into a README page, docs site, or dashboard. The widget supports
            `theme=dark|light` and `transparent=true` for brand-matched surfaces.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 text-xs leading-6 text-[var(--fyxvo-text-soft)]">
            <code>{iframeCode}</code>
          </pre>
          {widget ? (
            <p className="mt-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              Current widget payload: {widget.requestsToday.toLocaleString()} requests today,{" "}
              {widget.avgLatencyMs}ms average latency, and {widget.requestVolume7d.length} seven-day
              data points.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
