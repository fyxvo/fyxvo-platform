import { cn } from "../lib/cn";

export function ProgressBar({
  value,
  label,
  className
}: {
  readonly value: number;
  readonly label?: string;
  readonly className?: string;
}) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
          {label}
        </div>
      ) : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--fyxvo-panel-soft)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500 transition-[width] duration-300"
          style={{ width: `${normalized}%` }}
          role="progressbar"
          aria-valuenow={normalized}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
