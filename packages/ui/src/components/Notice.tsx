import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

type NoticeTone = "brand" | "success" | "warning" | "danger" | "neutral";

const noticeToneClasses: Record<NoticeTone, string> = {
  brand: "border-brand-500/20 bg-brand-500/8 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200",
  success: "border-emerald-500/20 bg-emerald-500/8 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-100",
  warning: "border-amber-500/20 bg-amber-500/8 text-amber-800 dark:bg-amber-500/10 dark:text-amber-100",
  danger: "border-rose-500/20 bg-rose-500/8 text-rose-800 dark:bg-rose-500/10 dark:text-rose-100",
  neutral:
    "border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-soft)]",
};

const noticeTitleClasses: Record<NoticeTone, string> = {
  brand: "text-brand-800 dark:text-brand-100",
  success: "text-emerald-900 dark:text-emerald-50",
  warning: "text-amber-900 dark:text-amber-50",
  danger: "text-rose-900 dark:text-rose-50",
  neutral: "text-[var(--fyxvo-text)]",
};

export interface NoticeProps extends HTMLAttributes<HTMLDivElement> {
  readonly title?: string;
  readonly tone?: NoticeTone;
  readonly icon?: ReactNode;
}

export function Notice({
  title,
  tone = "neutral",
  icon,
  className,
  children,
  ...props
}: NoticeProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
        noticeToneClasses[tone],
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/10">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 break-words space-y-1">
          {title ? (
            <p className={cn("text-sm font-semibold", noticeTitleClasses[tone])}>{title}</p>
          ) : null}
          <div className="text-sm leading-6 text-current">{children}</div>
        </div>
      </div>
    </div>
  );
}
