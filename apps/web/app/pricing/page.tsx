import { Button } from "@fyxvo/ui";
import Link from "next/link";

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    description: "For developers getting started.",
    features: ["10k requests/day", "Standard RPC", "Community support"],
  },
  {
    name: "Growth",
    price: "$49/mo",
    description: "For teams scaling their Solana apps.",
    features: ["500k requests/day", "Priority Relay", "Email support", "Analytics"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For high-volume production applications.",
    features: ["Unlimited requests", "Dedicated nodes", "SLA", "24/7 support"],
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--fyxvo-text)]">Pricing</h1>
        <p className="mt-4 text-[var(--fyxvo-text-muted)]">
          Simple, transparent pricing for every stage.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6"
          >
            <h2 className="text-xl font-bold text-[var(--fyxvo-text)]">{plan.name}</h2>
            <p className="mt-2 text-3xl font-bold text-[var(--fyxvo-brand)]">{plan.price}</p>
            <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">{plan.description}</p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[var(--fyxvo-text)]">
                  <span className="text-[var(--fyxvo-brand)]">✓</span> {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Button asChild variant={plan.name === "Growth" ? "primary" : "secondary"} className="w-full">
                <Link href={plan.name === "Enterprise" ? "/contact" : "/dashboard"}>
                  {plan.name === "Enterprise" ? "Contact sales" : "Get started"}
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
