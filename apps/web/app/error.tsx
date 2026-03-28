"use client";

import { Button } from "@fyxvo/ui";
import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--fyxvo-text)]">Something went wrong</h1>
        <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-[var(--fyxvo-text-disabled)]">
            {error.digest}
          </p>
        ) : null}
      </div>
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
