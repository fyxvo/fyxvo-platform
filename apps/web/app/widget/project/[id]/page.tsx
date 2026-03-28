import { use } from "react";

interface WidgetPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectWidgetPage({ params }: WidgetPageProps) {
  const { id } = use(params);

  return (
    <div className="p-4">
      <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4">
        <p className="text-sm font-medium text-[var(--fyxvo-text)]">Project</p>
        <p className="mt-1 font-mono text-xs text-[var(--fyxvo-text-muted)]">{id}</p>
      </div>
    </div>
  );
}
