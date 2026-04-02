"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@fyxvo/ui";
import { LoadingSkeleton } from "../../components/loading-skeleton";
import { RetryBanner } from "../../components/retry-banner";
import {
  mainnetPayAsYouGo,
  mainnetPricingTiers,
  mainnetRevenueSplit,
} from "../../lib/public-data";

const comparisonRows = [
  { label: "Monthly price", key: "monthlyPrice" },
  { label: "Standard requests included", key: "standardRequests" },
  { label: "Priority requests included", key: "priorityRequests" },
  { label: "Projects", key: "projects" },
  { label: "API keys", key: "apiKeys" },
  { label: "Analytics retention", key: "analyticsRetention" },
  { label: "Webhooks", key: "webhooks" },
  { label: "Team members", key: "teamMembers" },
  { label: "SLA", key: "sla" },
  { label: "Support response time", key: "supportResponse" },
] as const;

function PlanCard({
  name,
  price,
  summary,
  details,
  accent = "var(--fyxvo-brand)",
}: {
  name: string;
  price: string;
  summary: string;
  details: readonly string[];
  accent?: string;
}) {
  return (
    <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
      <p className="text-xs uppercase tracking-[0.16em]" style={{ color: accent }}>
        {name}
      </p>
      <p className="mt-4 text-3xl font-semibold text-[var(--fyxvo-text)]">{price}</p>
      <p className="mt-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{summary}</p>
      <div className="mt-6 space-y-3">
        {details.map((detail) => (
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
          <Link href="/dashboard">Open dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [solPriceLoading, setSolPriceLoading] = useState(true);
  const [solPriceError, setSolPriceError] = useState<string | null>(null);
  const [monthlyRequests, setMonthlyRequests] = useState(10_000_000);
  const [priorityPct, setPriorityPct] = useState(20);

  const individualPlans = mainnetPricingTiers.filter((plan) => plan.segment === "individual");
  const teamPlans = mainnetPricingTiers.filter((plan) => plan.segment === "team");
  const enterprisePlans = mainnetPricingTiers.filter((plan) => plan.segment === "enterprise");
  const paygPlan = mainnetPricingTiers.find((plan) => plan.segment === "payg");

  async function loadSolPrice() {
    setSolPriceLoading(true);
    setSolPriceError(null);

    try {
      const response = await fetch("/api/sol-price", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as { usd?: number; error?: string };
      if (!response.ok || typeof payload.usd !== "number") {
        throw new Error(payload.error ?? "Unable to load the live SOL price.");
      }
      setSolPrice(payload.usd);
    } catch (error) {
      setSolPrice(null);
      setSolPriceError(
        error instanceof Error ? error.message : "Unable to load the live SOL price."
      );
    } finally {
      setSolPriceLoading(false);
    }
  }

  useEffect(() => {
    void loadSolPrice();
  }, []);

  const estimator = useMemo(() => {
    const priorityRequests = Math.round(monthlyRequests * (priorityPct / 100));
    const standardRequests = monthlyRequests - priorityRequests;
    const rawLamports =
      standardRequests * mainnetPayAsYouGo.standardLamports +
      priorityRequests * mainnetPayAsYouGo.priorityLamports;
    const rawUsdc =
      standardRequests * mainnetPayAsYouGo.standardUsdc +
      priorityRequests * mainnetPayAsYouGo.priorityUsdc;
    const discount =
      monthlyRequests >= 100_000_000 ? 0.2 : monthlyRequests >= 10_000_000 ? 0.1 : 0;
    const discountedLamports = Math.round(rawLamports * (1 - discount));
    const discountedUsdc = rawUsdc * (1 - discount);

    return {
      standardRequests,
      priorityRequests,
      discount,
      rawLamports,
      rawUsdc,
      discountedLamports,
      discountedUsdc,
      totalSol: discountedLamports / 1_000_000_000,
    };
  }, [monthlyRequests, priorityPct]);

  const totalUsd = solPrice != null ? estimator.totalSol * solPrice : null;

  return (
    <div>
      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            Pricing
          </p>
          <h1 className="mt-3 max-w-5xl text-5xl font-bold tracking-tight text-[var(--fyxvo-text)] sm:text-6xl">
            Self-serve plans for mainnet launch, plus treasury-funded pay per request
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-[var(--fyxvo-text-soft)]">
            Mainnet billing is fully automatic. Developers can choose a monthly subscription, move
            up to a larger team or enterprise plan, or stay on a treasury-funded pay-per-request
            model without waiting on approvals or contacting sales. Stripe checkout is not wired
            into this deployment yet, so the launch path activates billing through confirmed USDC
            funding on chain first and can add card checkout later without changing the plan
            structure.
          </p>
          {solPriceLoading ? (
            <div className="mt-4 max-w-[16rem]">
              <LoadingSkeleton className="h-4 w-full" />
            </div>
          ) : solPrice != null ? (
            <p className="mt-4 text-sm text-[var(--fyxvo-text-muted)]">
              Live reference price: 1 SOL ≈ ${solPrice.toFixed(2)} USD
            </p>
          ) : null}
          {solPriceError ? (
            <div className="mt-6 max-w-2xl">
              <RetryBanner message={solPriceError} onRetry={loadSolPrice} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              Individual plans
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              One plan for a single developer who wants fast activation and predictable spend
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-soft)]">
              The Starter subscription is the simplest way to move from wallet connection to live
              relay traffic on mainnet without manually topping up every workload.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-1">
            {individualPlans.map((plan) => (
              <PlanCard
                key={plan.slug}
                name={plan.name}
                price={plan.monthlyPrice}
                summary={plan.summary}
                details={plan.details}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              Team plans
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Builder and Scale keep larger workspaces on a predictable monthly contract
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-soft)]">
              These plans add more included traffic, better analytics retention, collaboration,
              webhooks, and faster support while still activating automatically through treasury
              funding.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {teamPlans.map((plan) => (
              <PlanCard
                key={plan.slug}
                name={plan.name}
                price={plan.monthlyPrice}
                summary={plan.summary}
                details={plan.details}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              Enterprise plans
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Growth, Business, and Network activate automatically with no approval gate
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-soft)]">
              Enterprise no longer depends on a contact form. A project treasury funded with the
              matching monthly USDC amount can move into the corresponding enterprise tier
              immediately, with overages continuing to bill automatically.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {enterprisePlans.map((plan) => (
              <PlanCard
                key={plan.slug}
                name={plan.name}
                price={plan.monthlyPrice}
                summary={plan.summary}
                details={plan.details}
                accent="#f3c96a"
              />
            ))}
          </div>
        </div>
      </section>

      {paygPlan ? (
        <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                Pay per request
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
                Keep billing on chain if you prefer treasury-funded metering instead of subscriptions
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-soft)]">
                The pay-per-request path keeps the same funded treasury model the product already
                uses today, but with the published mainnet rates and automatic volume discounts
                instead of a free-tier or a hidden custom quote.
              </p>
              <div className="mt-8 space-y-4">
                {paygPlan.details.map((detail) => (
                  <div
                    key={detail}
                    className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5 text-sm leading-6 text-[var(--fyxvo-text-soft)]"
                  >
                    {detail}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                Published rates
              </p>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                  <p className="text-sm font-medium text-[var(--fyxvo-text)]">Standard RPC</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                    {mainnetPayAsYouGo.standardLamports.toLocaleString()} lamports
                  </p>
                  <p className="mt-1 text-sm text-[var(--fyxvo-text-soft)]">
                    {mainnetPayAsYouGo.standardUsdc} USDC per request
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                  <p className="text-sm font-medium text-[var(--fyxvo-text)]">Priority relay</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                    {mainnetPayAsYouGo.priorityLamports.toLocaleString()} lamports
                  </p>
                  <p className="mt-1 text-sm text-[var(--fyxvo-text-soft)]">
                    {mainnetPayAsYouGo.priorityUsdc} USDC per request
                  </p>
                </div>
                {mainnetPayAsYouGo.volumeDiscounts.map((discount) => (
                  <div
                    key={discount.threshold}
                    className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5"
                  >
                    <p className="text-sm font-medium text-[var(--fyxvo-text)]">
                      {discount.threshold}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-emerald-400">
                      {discount.discount}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                      {discount.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            Comparison
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Every launch tier in one table
          </h2>
          <div className="mt-8 overflow-x-auto">
            <table className="min-w-[1100px] w-full border-separate border-spacing-0 overflow-hidden rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]">
              <thead>
                <tr>
                  <th className="border-b border-[var(--fyxvo-border)] px-4 py-4 text-left text-sm font-medium text-[var(--fyxvo-text)]">
                    Tier
                  </th>
                  {mainnetPricingTiers.map((plan) => (
                    <th
                      key={plan.slug}
                      className="border-b border-[var(--fyxvo-border)] px-4 py-4 text-left text-sm font-medium text-[var(--fyxvo-text)]"
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.key}>
                    <td className="border-b border-[var(--fyxvo-border)] px-4 py-4 text-sm font-medium text-[var(--fyxvo-text)]">
                      {row.label}
                    </td>
                    {mainnetPricingTiers.map((plan) => (
                      <td
                        key={`${plan.slug}-${row.key}`}
                        className="border-b border-[var(--fyxvo-border)] px-4 py-4 text-sm text-[var(--fyxvo-text-soft)]"
                      >
                        {plan[row.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            How fees are distributed
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-soft)]">
            The network economics send {mainnetRevenueSplit.operators} of every per-request fee to
            node operators, {mainnetRevenueSplit.treasury} to the protocol treasury for governance,
            and {mainnetRevenueSplit.infrastructureFund} to the infrastructure fund that supports
            operations and continued development. Subscription plan fees flow through the protocol
            treasury and are distributed on the same schedule, so the network accounting model
            stays aligned whether usage is metered request by request or prepaid through a monthly
            plan.
          </p>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              Cost estimator
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Estimate pay-per-request spend at the published mainnet rates
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-soft)]">
              The estimator defaults to the treasury-funded billing model and applies the automatic
              10 percent and 20 percent volume discounts at the same request thresholds shown
              above.
            </p>
          </div>

          <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 sm:p-8">
            <div className="space-y-6">
              <label className="block">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">
                  Monthly requests
                </span>
                <input
                  type="range"
                  min={100_000}
                  max={250_000_000}
                  step={100_000}
                  value={monthlyRequests}
                  onChange={(event) => setMonthlyRequests(Number(event.target.value))}
                  className="mt-3 w-full"
                />
                <div className="mt-2 text-sm text-[var(--fyxvo-text-soft)]">
                  {monthlyRequests.toLocaleString()} total requests
                </div>
              </label>

              <label className="block">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">
                    Priority relay share
                  </span>
                  <span className="text-sm text-[var(--fyxvo-text-muted)]">{priorityPct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={priorityPct}
                  onChange={(event) => setPriorityPct(Number(event.target.value))}
                  className="mt-3 w-full"
                />
                <div className="mt-2 text-sm text-[var(--fyxvo-text-soft)]">
                  {estimator.standardRequests.toLocaleString()} standard requests and{" "}
                  {estimator.priorityRequests.toLocaleString()} priority requests
                </div>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    Estimated SOL spend
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                    {estimator.discountedLamports.toLocaleString()} lamports
                  </p>
                  <p className="mt-1 text-sm text-[var(--fyxvo-text-soft)]">
                    {estimator.totalSol.toFixed(6)} SOL
                  </p>
                  {solPriceLoading ? (
                    <div className="mt-2">
                      <LoadingSkeleton className="h-4 w-24" />
                    </div>
                  ) : totalUsd != null ? (
                    <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
                      ≈ ${totalUsd.toFixed(2)} USD
                    </p>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    Estimated USDC spend
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                    {estimator.discountedUsdc.toFixed(2)} USDC
                  </p>
                  <p className="mt-1 text-sm text-[var(--fyxvo-text-soft)]">
                    Raw spend: {estimator.rawUsdc.toFixed(2)} USDC before discounts
                  </p>
                  <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
                    Discount applied: {(estimator.discount * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
