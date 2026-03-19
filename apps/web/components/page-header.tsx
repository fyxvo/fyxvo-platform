import type { ReactNode } from "react";
import { Badge } from "@fyxvo/ui";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 max-w-3xl">
        <Badge tone="brand" className="mb-4 w-fit">
          {eyebrow}
        </Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-[2.75rem] md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:max-w-xl lg:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
