"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@fyxvo/ui";
import { requestPricingTiers } from "../../lib/public-data";

const FAQ_ITEMS = [
  {
    q: "Is there a free tier?",
    a: "No. The live devnet deployment does not use a free-tier subscription model. Projects are activated on chain, funded with devnet SOL, and charged published lamport rates as requests pass through the relay.",
  },
  {
    q: "How do discounts work?",
    a: "Discounts apply automatically by monthly request volume. At one million requests the project gets 20 percent off, and at ten million requests it gets 40 percent off for the rest of that month.",
  },
  {
    q: "What is compute-heavy traffic?",
    a: "It covers heavier Solana methods such as getProgramAccounts and similar wide scans that put more pressure on upstream nodes than everyday reads.",
  },
  {
    q: "Can projects fund with USDC?",
    a: "USDC support exists in the protocol shape but it is still gated off in the live deployment. SOL funding is the active path today.",
  },
] as const;

export default function PricingPage() {
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [volume, setVolume] = useState(100_000);
  const [standardPct, setStandardPct] = useState(70);
  const [computePct, setComputePct] = useState(20);
  const [priorityPct, setPriorityPct] = useState(10);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    void fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    )
      .then((response) => response.json())
      .then((data: { solana?: { usd?: number } }) => setSolPrice(data.solana?.usd ?? null))
      .catch(() => setSolPrice(null));
  }, []);

  const standardLamports = volume * (standardPct / 100) * 1000;
  const computeLamports = volume * (computePct / 100) * 3000;
  const priorityLamports = volume * (priorityPct / 100) * 5000;
  const rawLamports = standardLamports + computeLamports + priorityLamports;
  const discount = volume >= 10_000_000 ? 0.4 : volume >= 1_000_000 ? 0.2 : 0;
  const discountedLamports = Math.round(rawLamports * (1 - discount));
  const totalSol = discountedLamports / 1_000_000_000;
  const totalUsd = solPrice != null ? totalSol * solPrice : null;

  function rebalance(
    field: "standard" | "compute" | "priority",
    value: number
  ) {
    const clamped = Math.max(0, Math.min(100, value));

    if (field === "standard") {
      const remaining = 100 - clamped;
      const ratio = computePct + priorityPct > 0 ? computePct / (computePct + priorityPct) : 0.5;
      setStandardPct(clamped);
      setComputePct(Math.round(remaining * ratio));
      setPriorityPct(remaining - Math.round(remaining * ratio));
      return;
    }

    if (field === "compute") {
      const remaining = 100 - clamped;
      const ratio = standardPct + priorityPct > 0 ? standardPct / (standardPct + priorityPct) : 0.5;
      setComputePct(clamped);
      setStandardPct(Math.round(remaining * ratio));
      setPriorityPct(remaining - Math.round(remaining * ratio));
      return;
    }

    const remaining = 100 - clamped;
    const ratio = standardPct + computePct > 0 ? standardPct / (standardPct + computePct) : 0.5;
    setPriorityPct(clamped);
    setStandardPct(Math.round(remaining * ratio));
    setComputePct(remaining - Math.round(remaining * ratio));
  }

  return (
    <div>
      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            Pricing
          </p>
          <h1 className="mt-3 max-w-4xl text-5xl font-bold tracking-tight text-[var(--fyxvo-text)] sm:text-6xl">
            Request pricing tied to funded usage, not generic SaaS plans
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--fyxvo-text-soft)]">
            Fyxvo charges per request in lamports. You activate a project, fund it with devnet
            SOL, and the relay debits published rates as traffic moves through the standard or
            priority lanes.
          </p>
          {solPrice != null ? (
            <p className="mt-4 text-sm text-[var(--fyxvo-text-muted)]">
              Live reference price: 1 SOL ≈ ${solPrice.toFixed(2)} USD
            </p>
          ) : null}
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-3">
            {requestPricingTiers.map((tier) => {
              const solPerRequest = tier.lamports / 1_000_000_000;
              const usdPerRequest = solPrice != null ? solPerRequest * solPrice : null;
              return (
                <div
                  key={tier.name}
                  className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6"
                >
                  <p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-brand)]">
                    {tier.name}
                  </p>
                  <p className="mt-5 text-3xl font-semibold text-[var(--fyxvo-text)]">
                    {tier.lamports.toLocaleString()}
                    <span className="ml-2 text-base font-normal text-[var(--fyxvo-text-muted)]">
                      lamports
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-[var(--fyxvo-text-soft)]">
                    {solPerRequest.toFixed(6)} SOL per request
                  </p>
                  {usdPerRequest != null ? (
                    <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
                      About ${usdPerRequest.toFixed(6)} USD per request at current SOL pricing
                    </p>
                  ) : null}
                  <p className="mt-5 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    {tier.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              Discounts
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Automatic reductions at scale
            </h2>
            <div className="mt-8 space-y-4">
              <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                <p className="text-3xl font-semibold text-[var(--fyxvo-text)]">1M+</p>
                <p className="mt-2 text-sm font-medium text-emerald-400">20% off</p>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  Once a project crosses one million monthly requests, pricing automatically drops
                  to 80 percent of the published lamport rate.
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                <p className="text-3xl font-semibold text-[var(--fyxvo-text)]">10M+</p>
                <p className="mt-2 text-sm font-medium text-emerald-400">40% off</p>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  At ten million monthly requests, the project receives a 40 percent reduction for
                  the rest of that calendar month.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              Cost estimator
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Estimate monthly relay spend
            </h2>
            <div className="mt-8 space-y-6">
              <label className="block">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">
                  Monthly requests
                </span>
                <input
                  type="range"
                  min={10_000}
                  max={12_000_000}
                  step={10_000}
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  className="mt-3 w-full"
                />
                <div className="mt-2 text-sm text-[var(--fyxvo-text-soft)]">
                  {volume.toLocaleString()} requests
                </div>
              </label>

              {[
                { label: "Standard RPC", value: standardPct, key: "standard" as const },
                { label: "Compute-heavy", value: computePct, key: "compute" as const },
                { label: "Priority relay", value: priorityPct, key: "priority" as const },
              ].map((row) => (
                <label key={row.key} className="block">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-[var(--fyxvo-text)]">{row.label}</span>
                    <span className="text-sm text-[var(--fyxvo-text-muted)]">{row.value}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={row.value}
                    onChange={(event) => rebalance(row.key, Number(event.target.value))}
                    className="mt-3 w-full"
                  />
                </label>
              ))}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    Estimated cost
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                    {discountedLamports.toLocaleString()} lamports
                  </p>
                  <p className="mt-1 text-sm text-[var(--fyxvo-text-soft)]">
                    {totalSol.toFixed(6)} SOL
                  </p>
                  {totalUsd != null ? (
                    <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
                      ≈ ${totalUsd.toFixed(2)} USD
                    </p>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    Applied discount
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                    {(discount * 100).toFixed(0)}%
                  </p>
                  <p className="mt-1 text-sm text-[var(--fyxvo-text-soft)]">
                    Raw spend: {Math.round(rawLamports).toLocaleString()} lamports
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            Funding model
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Start with a funded project, not a subscription checkout
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
            The live path is straightforward: create a project, sign the activation transaction,
            fund the treasury with devnet SOL, issue an API key, and start routing traffic. When
            the funded balance is empty, requests stop until the project is topped up again.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard">Open workspace</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/docs">Read the flow</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">FAQ</p>
          <div className="mt-6 space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <div
                key={item.q}
                className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-base font-medium text-[var(--fyxvo-text)]">{item.q}</span>
                  <span className="text-xl text-[var(--fyxvo-brand)]">
                    {openFaq === index ? "−" : "+"}
                  </span>
                </button>
                {openFaq === index ? (
                  <div className="border-t border-[var(--fyxvo-border)] px-6 py-5 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    {item.a}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
