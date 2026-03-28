"use client";

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/6 ${className ?? "h-4 w-full"}`}
      aria-hidden="true"
    />
  );
}
