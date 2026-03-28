import Link from "next/link";
import { Button } from "@fyxvo/ui";

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Support</h1>
      <p className="mt-4 text-[var(--fyxvo-text-muted)]">
        Need help? Reach out to us or check the documentation.
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild variant="primary">
          <Link href="/docs">Read docs</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/contact">Contact us</Link>
        </Button>
      </div>
    </div>
  );
}
