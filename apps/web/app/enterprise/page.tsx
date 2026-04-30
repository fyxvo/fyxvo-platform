"use client";

import Link from "next/link";
import { Button } from "@fyxvo/ui";
import { mainnetPricingTiers } from "../../lib/public-data";

const FAQ_ITEMS = [
  {
    question: "How does billing work?",
    answer:
      "Each enterprise tier activates automatically when the project treasury receives the matching monthly USDC funding amount. The control plane can track that funding on chain and move the workspace into the matching plan without a manual approval step.",
  },
  {
    question: "What happens if I exceed my request limit?",
    answer:
      "Included traffic covers the monthly subscription allocation. Overage traffic continues automatically at the published per-request rate, so requests do not stop when usage moves past the included threshold.",
  },
  {
    question: "Can I upgrade or downgrade?",
    answer:
      "Yes. The active plan follows the confirmed funding amount. A team can move up to a larger plan at the next billing cycle or drop to a smaller one by funding the new amount for the next month.",
  },
  {
    question: "Is there a contract?",
    answer:
      "No manual contract is required to activate the published enterprise tiers. Custom terms are only relevant if a team needs a bespoke commercial agreement outside the listed Growth, Business, and Network plans.",
  },
  {
    question: "What is the SLA backed by?",
    answer:
      "The SLA reflects the infrastructure allocation associated with each tier, including dedicated support, dedicated relay capacity where applicable, and the operator and treasury economics that fund the network.",
  },
] as const;

export default function EnterprisePage() {
  const enterprisePlans = mainnetPricingTiers.filter((plan) => plan.segment === "enterprise");

  return (
    <div>
      <section className="border-b border-[var(--fyxvo-border)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
            Enterprise
          </p>
          <h1 className="mt-5 max-w-5xl text-5xl font-bold tracking-tight text-[var(--fyxvo-text)] sm:text-6xl lg:text-7xl text-balance">
            Self-serve enterprise plans with automatic activation
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-[var(--fyxvo-text-soft)]">
            Growth, Business, and Network are published tiers with no contact form, no approval
            gate, and no hidden quote. Fund your project treasury and the plan activates automatically.
          </p>
          
          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-[var(--fyxvo-text-muted)]">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>99.9% SLA</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>24/7 Priority Support</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <span>Instant Activation</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          {enterprisePlans.map((plan, index) => (
            <div
              key={plan.slug}
              className={`group rounded-[2rem] border bg-[var(--fyxvo-panel)] p-6 sm:p-8 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 ${
                index === 1 
                  ? "border-amber-500/40 ring-1 ring-amber-500/20 relative" 
                  : "border-[var(--fyxvo-border)] hover:border-amber-500/20"
              }`}
            >
              {index === 1 && (
                <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-semibold uppercase tracking-wider text-white">
                  Most Popular
                </div>
              )}
              <p className="text-xs uppercase tracking-[0.16em] font-semibold text-amber-400">
                {plan.name}
              </p>
              <p className="mt-5 text-4xl font-bold text-[var(--fyxvo-text)]">
                {plan.monthlyPrice}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-[var(--fyxvo-text-soft)]">
                {plan.summary}
              </p>
              <div className="mt-8 space-y-3">
                {plan.details.map((detail) => (
                  <div
                    key={detail}
                    className="flex items-start gap-3 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 text-sm leading-relaxed text-[var(--fyxvo-text-soft)] transition-all duration-200 hover:border-amber-500/20"
                  >
                    <svg className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {detail}
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Button asChild className="w-full">
                  <Link href="/dashboard">Activate {plan.name}</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Automatic activation on confirmed funding
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-soft)]">
            Enterprise activation is a product flow, not a manual sales workflow. The control
            plane watches the project treasury, confirms the monthly USDC funding transaction on
            chain, and turns on the matching enterprise tier automatically. That keeps billing,
            plan selection, and traffic activation in the same path the rest of the platform
            already uses for funded access.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/pricing">Compare all plans</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] px-3 py-1.5 rounded-full border border-[var(--fyxvo-brand)]/20 bg-[var(--fyxvo-brand)]/5 text-[var(--fyxvo-brand)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            Frequently Asked Questions
          </p>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">
            Common questions about enterprise plans
          </h2>
          <div className="mt-10 space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <div
                key={item.question}
                className="group rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 transition-all duration-300 hover:border-[var(--fyxvo-brand)]/20 hover:shadow-lg hover:shadow-[var(--fyxvo-brand)]/5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--fyxvo-brand)]/10 text-[var(--fyxvo-brand)] text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--fyxvo-text)] group-hover:text-[var(--fyxvo-brand)] transition-colors">
                      {item.question}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--fyxvo-text-soft)]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
