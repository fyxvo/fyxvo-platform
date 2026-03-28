import Link from "next/link";
import { Button } from "@fyxvo/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <p className="text-6xl font-bold text-[var(--fyxvo-brand)]">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--fyxvo-text)]">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <Button asChild variant="primary">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
