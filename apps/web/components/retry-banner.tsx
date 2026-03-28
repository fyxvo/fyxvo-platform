"use client";

import { Button } from "@fyxvo/ui";

interface RetryBannerProps {
  message: string;
  onRetry: () => void | Promise<void>;
}

export function RetryBanner({ message, onRetry }: RetryBannerProps) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{message}</p>
        <Button type="button" size="sm" variant="secondary" onClick={() => void onRetry()}>
          Retry
        </Button>
      </div>
    </div>
  );
}
