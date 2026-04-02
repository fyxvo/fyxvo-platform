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
      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            Enterprise
          </p>
          <h1 className="mt-3 max-w-5xl text-5xl font-bold tracking-tight text-[var(--fyxvo-text)] sm:text-6xl">
            Self-serve enterprise plans that activate automatically from on-chain USDC funding
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-[var(--fyxvo-text-soft)]">
            Growth, Business, and Network are published tiers with no contact form, no approval
            gate, and no hidden quote. Choose the tier that matches the traffic profile you need,
            fund the project treasury with the monthly USDC amount, and the plan activates
            automatically when the funding is confirmed on chain.
          </p>
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          {enterprisePlans.map((plan) => (
            <div
              key={plan.slug}
              className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                {plan.name}
              </p>
              <p className="mt-4 text-3xl font-semibold text-[var(--fyxvo-text)]">
                {plan.monthlyPrice}
              </p>
              <p className="mt-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                {plan.summary}
              </p>
              <div className="mt-6 space-y-3">
                {plan.details.map((detail) => (
                  <div
                    key={detail}
                    className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]"
                  >
                    {detail}
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Button asChild>
                  <Link href="/dashboard">Activate plan</Link>
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

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">FAQ</p>
          <div className="mt-6 space-y-4">
            {FAQ_ITEMS.map((item) => (
              <div
                key={item.question}
                className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6"
              >
                <h2 className="text-lg font-semibold text-[var(--fyxvo-text)]">
                  {item.question}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
