import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@fyxvo/ui";
import { BrandLogo } from "../../../components/brand-logo";
import { webEnv } from "../../../lib/env";

export const metadata: Metadata = {
  title: "Join Fyxvo — You've been invited",
  description: "You've been invited to Fyxvo — funded Solana RPC relay with priority access, real analytics, and on-chain billing.",
};

export default async function JoinPage({
  params,
}: {
  readonly params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  let codeValid = true;

  // Record the click server-side — best effort
  if (/^[a-z0-9]{8}$/.test(code)) {
    try {
      const res = await fetch(new URL(`/v1/referral/click/${code}`, webEnv.apiBaseUrl), {
        method: "POST",
        cache: "no-store",
      });
      if (res.status === 404) codeValid = false;
    } catch {
      // Non-fatal — let the page render regardless
    }
  } else {
    codeValid = false;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--fyxvo-bg)]">
      {/* Minimal header */}
      <header className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-6 py-4">
        <BrandLogo />
        <Link
          href="/dashboard"
          className="text-sm text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
        >
          Open dashboard →
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="mx-auto w-full max-w-lg space-y-8">
          {/* Referral banner */}
          <div className="rounded-2xl border border-[var(--fyxvo-brand)]/25 bg-[var(--fyxvo-brand-subtle)] px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--fyxvo-brand)]/15 text-xs">
                👋
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--fyxvo-text)]">
                  {codeValid ? "A Fyxvo developer referred you" : "You found Fyxvo"}
                </p>
                <p className="mt-0.5 text-xs text-[var(--fyxvo-text-muted)]">
                  {codeValid
                    ? "They build on Solana with Fyxvo and thought you might too. No obligation — just come and see."
                    : "We could not verify this referral code, but you're still welcome to get started."}
                </p>
              </div>
            </div>
          </div>

          {/* Headline */}
          <div>
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-[var(--fyxvo-text)]">
              Funded RPC access for{" "}
              <span className="fyxvo-text-gradient">Solana developers.</span>
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
              Activate a project on chain, fund it with SOL, issue an API key, and route real
              devnet traffic through a managed relay. One flow, real logs.
            </p>
          </div>

          {/* Feature list */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: "🔑",
                title: "API keys",
                body: "Scoped keys with revocation and rotation built in.",
              },
              {
                icon: "📊",
                title: "Analytics",
                body: "Per-project request logs, latency, and error breakdown.",
              },
              {
                icon: "⚡",
                title: "Priority relay",
                body: "Separate path for DeFi and time-critical transactions.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
              >
                <div className="mb-2 text-xl">{item.icon}</div>
                <p className="text-sm font-medium text-[var(--fyxvo-text)]">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--fyxvo-text-muted)]">{item.body}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href="/dashboard">Get started →</Link>
            </Button>
            <Button asChild variant="secondary" className="flex-1">
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-[var(--fyxvo-text-muted)]">
            Solana devnet · Private alpha · No credit card required
          </p>
        </div>
      </main>
    </div>
  );
}
