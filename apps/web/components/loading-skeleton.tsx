"use client";

import { cn } from "@fyxvo/ui";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "default" | "text" | "card" | "avatar" | "button";
}

export function LoadingSkeleton({ className, variant = "default" }: LoadingSkeletonProps) {
  const baseStyles = "animate-pulse rounded-xl bg-[var(--fyxvo-panel-soft)]";
  
  const variantStyles = {
    default: "h-4 w-full",
    text: "h-3 w-3/4",
    card: "h-32 w-full",
    avatar: "h-10 w-10 rounded-full",
    button: "h-10 w-24",
  };

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      aria-hidden="true"
    >
      <div className="h-full w-full bg-gradient-to-r from-transparent via-[var(--fyxvo-border)]/30 to-transparent animate-shimmer" />
    </div>
  );
}

export function LoadingCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 space-y-4", className)}>
      <div className="flex items-center gap-3">
        <LoadingSkeleton variant="avatar" />
        <div className="space-y-2 flex-1">
          <LoadingSkeleton className="h-4 w-1/3" />
          <LoadingSkeleton variant="text" />
        </div>
      </div>
      <LoadingSkeleton className="h-20 w-full" />
      <div className="flex gap-2">
        <LoadingSkeleton variant="button" />
        <LoadingSkeleton variant="button" className="w-20" />
      </div>
    </div>
  );
}

export function LoadingStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4 space-y-3">
          <LoadingSkeleton className="h-3 w-1/2" />
          <LoadingSkeleton className="h-8 w-3/4" />
          <LoadingSkeleton variant="text" />
        </div>
      ))}
    </div>
  );
}
