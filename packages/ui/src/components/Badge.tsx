import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

type BadgeTone = "brand" | "success" | "warning" | "danger" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  brand: "bg-brand-500/12 text-brand-500 ring-brand-500/20 dark:bg-brand-500/15 dark:text-brand-300",
  success: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-rose-500/12 text-rose-700 ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300",
  neutral: "bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] ring-[var(--fyxvo-border)]",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5",
        "text-[11px] font-semibold uppercase tracking-[0.12em]",
        "ring-1 ring-inset",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
