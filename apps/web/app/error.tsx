"use client";

import { useId } from "react";
import Link from "next/link";
import { Button } from "@fyxvo/ui";
import { webEnv } from "../lib/env";

function getSafeMessage(error: Error & { digest?: string }) {
  if (process.env.NODE_ENV !== "production" && error.message) {
    return error.message;
  }
  return "Something prevented this page from loading. You can try refreshing, and if it keeps happening, the status page will show whether there is a wider issue.";
}

export default function Error({
  error,
  reset
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  const fallbackId = useId().replace(/:/g, "").toUpperCase().slice(0, 8);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--fyxvo-danger)]/20 bg-[var(--fyxvo-danger-bg)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--fyxvo-danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
          <path d="M12 4l9 16H3z" />
          <path d="M12 10v4" />
          <path d="M12 18h.01" />
        </svg>
      </div>
      <h1 className="mt-4 text-xl font-semibold text-[var(--fyxvo-text)]">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-[var(--fyxvo-text-soft)]">
        {getSafeMessage(error)}
      </p>
      <p className="mt-2 font-mono text-xs text-[var(--fyxvo-text-muted)]">
        Reference: {error.digest ?? fallbackId}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <Link href={webEnv.statusPageUrl} target="_blank" rel="noopener noreferrer">
            Check status
          </Link>
        </Button>
      </div>
      <p className="mt-6 text-xs text-[var(--fyxvo-text-muted)]">
        Still seeing this?{" "}
        <Link href="/contact" className="underline hover:text-[var(--fyxvo-text)]">
          Get in touch
        </Link>
      </p>
    </div>
  );
}
