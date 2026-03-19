import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

type NoticeTone = "brand" | "success" | "warning" | "danger" | "neutral";

const noticeToneClasses: Record<NoticeTone, string> = {
  brand: "border-brand-500/25 bg-brand-500/10 text-brand-100",
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  danger: "border-rose-500/25 bg-rose-500/10 text-rose-100",
  neutral: "border-slate-800 bg-slate-950/80 text-slate-200",
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
        "rounded-3xl border p-4 shadow-[0_20px_50px_rgba(2,6,23,0.22)]",
        noticeToneClasses[tone],
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-black/20">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 break-words space-y-1">
          {title ? <p className="font-semibold text-white">{title}</p> : null}
          <div className="text-sm leading-6 text-current/90">{children}</div>
        </div>
      </div>
    </div>
  );
}
