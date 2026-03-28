import Link from "next/link";
import { Button } from "@fyxvo/ui";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-24">
      <div className="text-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-4 py-1.5 text-sm text-[var(--fyxvo-text-muted)]">
          Now in open beta
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-[var(--fyxvo-text)] sm:text-6xl">
          Solana RPC &amp; Priority Relay{" "}
          <span className="text-[var(--fyxvo-brand)]">for builders</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--fyxvo-text-muted)]">
          Fyxvo delivers low-latency RPC infrastructure and priority relay so your Solana
          transactions land on-chain, every time.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/dashboard">Get started</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/docs">Read the docs</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
