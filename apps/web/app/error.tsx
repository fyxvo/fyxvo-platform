"use client";

import Link from "next/link";
import { Button } from "@fyxvo/ui";
import { webEnv } from "../lib/env";

function getSafeMessage(error: Error & { digest?: string }) {
  if (process.env.NODE_ENV !== "production" && error.message) {
    return error.message;
  }
  return "The page could not finish loading. Refresh to try again. If this keeps happening, check the status page or reach out.";
}

export default function Error({
  error,
  reset
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 text-4xl font-bold text-rose-400">Error</div>
      <h1 className="text-xl font-semibold text-[var(--fyxvo-text)]">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-[var(--fyxvo-text-soft)]">
        {getSafeMessage(error)}
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-[var(--fyxvo-text-muted)]">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="secondary">
          <Link href={webEnv.statusPageUrl} target="_blank" rel="noopener noreferrer">
            Check status
          </Link>
        </Button>
      </div>
      <p className="mt-6 text-xs text-[var(--fyxvo-text-muted)]">
        Still seeing this?{" "}
        <Link href="/contact" className="underline hover:text-[var(--fyxvo-text)]">
          Contact support
        </Link>
      </p>
    </div>
  );
}
