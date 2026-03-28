import Link from "next/link";
import { Button } from "@fyxvo/ui";

export default function EnterprisePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-[var(--fyxvo-text)]">
        Fyxvo for Enterprise
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-[var(--fyxvo-text-muted)]">
        Dedicated infrastructure, custom SLAs, and white-glove onboarding for high-volume Solana
        applications.
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild size="lg">
          <Link href="/contact">Talk to sales</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/pricing">View pricing</Link>
        </Button>
      </div>
    </div>
  );
}
