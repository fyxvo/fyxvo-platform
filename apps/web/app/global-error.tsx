"use client";

import Link from "next/link";
import { Button, Notice } from "@fyxvo/ui";
import { BrandLogo } from "../components/brand-logo";

function getSafeMessage(error: Error & { digest?: string }) {
  if (process.env.NODE_ENV !== "production" && error.message) {
    return error.message;
  }

  return "The application ran into a problem it could not recover from. Reloading usually resolves this. If it does not, check the status page to see whether services are experiencing an outage.";
}

export default function GlobalError({
  error,
  reset
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="fyxvo-theme text-[var(--fyxvo-text)]">
        <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
          <div className="w-full space-y-6">
            <BrandLogo />
            <Notice tone="danger" title="The application could not recover">
              {getSafeMessage(error)}
            </Notice>
            <Button onClick={() => reset()}>Reload application</Button>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="https://status.fyxvo.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--fyxvo-text-muted)] underline hover:text-[var(--fyxvo-text)]"
              >
                Check status
              </Link>
              <Link
                href="/contact"
                className="text-[var(--fyxvo-text-muted)] underline hover:text-[var(--fyxvo-text)]"
              >
                Contact support
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
