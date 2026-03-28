import { use } from "react";
import { previewProjects } from "../../../lib/sample-data";

interface PublicProjectPageProps {
  params: Promise<{ publicSlug: string }>;
}

export default function PublicProjectPage({ params }: PublicProjectPageProps) {
  const { publicSlug } = use(params);
  const project = previewProjects.find((p) => p.publicSlug === publicSlug);

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-[var(--fyxvo-text-muted)]">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">{project.name}</h1>
      <p className="mt-4 text-[var(--fyxvo-text-muted)]">{project.description}</p>
    </div>
  );
}
