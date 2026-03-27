import Link from "next/link";
import { Button } from "@fyxvo/ui";
import { BrandLogo } from "../components/brand-logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-8">
        <BrandLogo />
      </div>
      <div className="mb-6 text-6xl font-bold tabular-nums text-[var(--fyxvo-text-muted)]">404</div>
      <h1 className="text-2xl font-semibold text-[var(--fyxvo-text)]">This page does not exist</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--fyxvo-text-soft)]">
        The URL you followed does not match anything in the Fyxvo workspace. It may have moved, or the
        link itself may be outdated.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Open dashboard</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/docs">Browse docs</Link>
        </Button>
      </div>
    </div>
  );
}
