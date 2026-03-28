"use client";

import { use } from "react";
import { AuthGate } from "../../../components/state-panels";
import { usePortal } from "../../../lib/portal-context";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = use(params);
  const { projects } = usePortal();
  const project = projects.find((p) => p.slug === slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <AuthGate>
        {project ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold text-[var(--fyxvo-text)]">{project.name}</h1>
            <p className="text-sm text-[var(--fyxvo-text-muted)]">{project.description}</p>
          </div>
        ) : (
          <p className="text-sm text-[var(--fyxvo-text-muted)]">Project &quot;{slug}&quot; not found.</p>
        )}
      </AuthGate>
    </div>
  );
}
