import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 pb-6 border-b border-[var(--fyxvo-border)]">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}
