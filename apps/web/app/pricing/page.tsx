"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge, Button, Notice } from "@fyxvo/ui";

const TIERS = [
  {
    name: "Standard RPC",
    tag: "standard",
    lamports: 1000,
    description:
      "Covers the everyday JSON-RPC reads your application relies on, including getBalance, getAccountInfo, getBlock, and getTransaction. Requests go through full key validation, balance checks, rate limiting, and automatic multi-node failover.",
  },
  {
    name: "Compute-heavy",
    tag: "compute-heavy",
    lamports: 3000,
    description:
      "Handles the heavier Solana methods that demand more upstream compute, such as getProgramAccounts, getTokenAccountsByOwner, and getSignaturesForAddress. Priced to reflect the real cost these queries place on the node pool.",
  },
  {
    name: "Priority relay",
    tag: "priority",
    lamports: 5000,
    description:
      "A dedicated routing endpoint with its own rate window and separate pricing tier. Built specifically for latency-sensitive operations like DeFi transactions where every millisecond matters and contention with standard traffic is unacceptable.",
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "How does the funding model work?",
    a: "You create a project and activate it with an on-chain Solana transaction. Once active, you fund the project by signing a SOL transfer on devnet. Your spendable balance updates immediately after the signature is verified. Every request deducts from that on-chain-backed balance at the published per-request lamport rate for the tier used.",
  },
  {
    q: "What happens when my balance runs low?",
    a: "The dashboard shows a low-balance warning when your project balance approaches the threshold you configure. Requests continue being processed until the balance is fully depleted. Once empty, requests are rejected with a 402 response until you top up. Your API key stays valid the entire time and resumes immediately after funding.",
  },
  {
    q: "Is there a free tier?",
    a: "There is no free tier in the current deployment. Getting started requires a small SOL deposit on devnet, which is inexpensive given devnet SOL can be obtained from public faucets. This design keeps the funding model honest: every request is backed by a real on-chain balance, not a simulated credit.",
  },
  {
    q: "What counts as a compute-heavy request?",
    a: "The compute-heavy tier applies to Solana methods that generate significantly more upstream load on the node pool. This includes getProgramAccounts, getTokenAccountsByOwner, getTokenAccountsByDelegate, and getSignaturesForAddress. The full list is documented in the quickstart and will be updated as the method taxonomy evolves.",
  },
  {
    q: "Can I use USDC to fund my project?",
    a: "USDC funding is implemented in the protocol but is currently disabled behind a configuration flag. The SOL path is fully operational. USDC will be enabled in a future deployment once the additional custody and verification logic has been thoroughly validated on devnet.",
  },
  {
    q: "How are volume discounts applied?",
    a: "Volume discounts are applied automatically based on your project's request count within the current calendar month. At one million requests the per-request cost drops by 20 percent. At ten million requests it drops by 40 percent. There is nothing to negotiate or opt into. The discount applies to all requests above the threshold as they happen.",
  },
];

export default function PricingPage() {
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [volume, setVolume] = useState(100000);
  const [standardPct, setStandardPct] = useState(70);
  const [computePct, setComputePct] = useState(20);
  const [priorityPct, setPriorityPct] = useState(10);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    )
      .then((r) => r.json())
      .then((data: { solana?: { usd?: number } }) =>
        setSolPrice(data?.solana?.usd ?? null)
      )
      .catch(() => null);
  }, []);

  // Estimator calculations
  const standardLamports = volume * (standardPct / 100) * 1000;
  const computeLamports = volume * (computePct / 100) * 3000;
  const priorityLamports = volume * (priorityPct / 100) * 5000;
  const totalLamports = standardLamports + computeLamports + priorityLamports;
  const discount =
    volume >= 10_000_000 ? 0.4 : volume >= 1_000_000 ? 0.2 : 0;
  const finalLamports = Math.round(totalLamports * (1 - discount));
  const finalSol = finalLamports / 1e9;
  const finalUsd = solPrice != null ? finalSol * solPrice : null;

  function adjustPct(
    field: "standard" | "compute" | "priority",
    value: number
  ) {
    const clamped = Math.max(0, Math.min(100, value));
    if (field === "standard") {
      const rem = 100 - clamped;
      const ratio = computePct + priorityPct > 0 ? computePct / (computePct + priorityPct) : 0.5;
      setStandardPct(clamped);
      setComputePct(Math.round(rem * ratio));
      setPriorityPct(rem - Math.round(rem * ratio));
    } else if (field === "compute") {
      const rem = 100 - clamped;
      const ratio = standardPct + priorityPct > 0 ? standardPct / (standardPct + priorityPct) : 0.5;
      setComputePct(clamped);
      setStandardPct(Math.round(rem * ratio));
      setPriorityPct(rem - Math.round(rem * ratio));
    } else {
      const rem = 100 - clamped;
      const ratio = standardPct + computePct > 0 ? standardPct / (standardPct + computePct) : 0.5;
      setPriorityPct(clamped);
      setStandardPct(Math.round(rem * ratio));
      setComputePct(rem - Math.round(rem * ratio));
    }
  }

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-[var(--fyxvo-border)] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            Pricing
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.06] tracking-tight text-[var(--fyxvo-text)] sm:text-6xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
            Fyxvo charges per request in lamports with no subscriptions, no platform fees, and no billing cycles. Fund your project on chain with SOL and your balance decrements as you use it. Volume discounts apply automatically at one million and ten million requests per month.
          </p>
          {solPrice != null ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-[var(--fyxvo-text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--fyxvo-success)]" />
              Live SOL price:{" "}
              <span className="font-medium text-[var(--fyxvo-text)]">
                ${solPrice.toFixed(2)}
              </span>
              <span className="text-xs opacity-60">via CoinGecko</span>
            </div>
          ) : null}
        </div>
      </section>

      {/* Tier cards */}
      <section className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            Request tiers
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
            Three tiers, one price per request
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
            Each request is classified at the gateway and billed at the rate for that tier. There is no ambiguity about which tier a method falls into.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {TIERS.map((tier) => {
              const solPerReq = tier.lamports / 1e9;
              const usdPerReq = solPrice != null ? solPerReq * solPrice : null;
              return (
                <div
                  key={tier.tag}
                  className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6"
                >
                  <h3 className="font-display text-xl font-semibold text-[var(--fyxvo-text)]">
                    {tier.name}
                  </h3>
                  <div className="mt-4 space-y-1">
                    <p className="font-display text-3xl font-semibold text-[var(--fyxvo-text)]">
                      {tier.lamports.toLocaleString()}{" "}
                      <span className="text-base font-normal text-[var(--fyxvo-text-muted)]">
                        lamports
                      </span>
                    </p>
                    <p className="text-sm text-[var(--fyxvo-text-muted)]">
                      &asymp; {solPerReq.toFixed(7)} SOL per request
                    </p>
                    {usdPerReq != null ? (
                      <p className="text-xs text-[var(--fyxvo-text-muted)]">
                        &asymp; ${usdPerReq.toFixed(6)} USD per request
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-5 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                    {tier.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Getting started */}
      <section className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-8">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              Getting started
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
              On-chain funding, no subscriptions
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
              There is no free tier. Getting started requires creating a project, activating it on chain, and depositing a small amount of devnet SOL. Devnet SOL is available from public faucets and costs nothing to obtain. This keeps every request backed by a verifiable on-chain balance rather than a simulated credit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/docs">Read the quickstart</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Volume discounts */}
      <section className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            Volume discounts
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
            Automatic discounts at scale
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
            Volume discounts apply automatically when your project crosses a monthly threshold. You do not need to sign up for a different plan or negotiate a contract.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
              <p className="font-display text-xl font-semibold text-[var(--fyxvo-text)]">
                1M+ requests per month
              </p>
              <p className="mt-2 font-display text-3xl font-semibold text-[var(--fyxvo-success)]">
                20% off
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                Once your project crosses one million requests in a calendar month, all subsequent requests in that month are charged at 80 percent of the standard per-tier rate.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
              <p className="font-display text-xl font-semibold text-[var(--fyxvo-text)]">
                10M+ requests per month
              </p>
              <p className="mt-2 font-display text-3xl font-semibold text-[var(--fyxvo-success)]">
                40% off
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                Projects exceeding ten million monthly requests receive a 40 percent reduction across all tiers for the remainder of that month. The higher discount fully supersedes the 20 percent tier.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Revenue split */}
      <section className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            Revenue split
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
            Where the fees go
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
            Every request fee is divided on chain according to fixed protocol-level ratios. There is no off-platform fee or hidden margin.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                label: "Node operators",
                pct: 80,
                color: "bg-[var(--fyxvo-brand)]",
                description:
                  "The majority of each fee goes directly to the nodes routing traffic. This aligns operator incentives with network quality.",
              },
              {
                label: "Protocol treasury",
                pct: 10,
                color: "bg-emerald-500",
                description:
                  "A small share accrues to the protocol treasury to fund ongoing development, audits, and governance over time.",
              },
              {
                label: "Infrastructure fund",
                pct: 10,
                color: "bg-sky-500",
                description:
                  "The remaining share goes to a dedicated infrastructure fund that covers gateway hosting, monitoring, and operational costs.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6"
              >
                <div className="mb-4 h-1.5 w-full rounded-full bg-[var(--fyxvo-border)]">
                  <div
                    className={`h-1.5 rounded-full ${item.color}`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
                <p className="font-display text-3xl font-semibold text-[var(--fyxvo-text)]">
                  {item.pct}%
                </p>
                <p className="mt-1 font-display text-base font-semibold text-[var(--fyxvo-text)]">
                  {item.label}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive cost estimator */}
      <section className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            Cost estimator
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
            Estimate your monthly cost
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
            Adjust the sliders to match your expected traffic mix. Costs update in real time. Volume discounts are factored in automatically.
          </p>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--fyxvo-text)]">
                    Monthly request volume
                  </label>
                  <span className="font-mono text-sm text-[var(--fyxvo-text-muted)]">
                    {volume.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10_000_000}
                  step={10000}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-[var(--fyxvo-brand)]"
                />
                <div className="mt-1 flex justify-between text-xs text-[var(--fyxvo-text-muted)]">
                  <span>0</span>
                  <span>1M</span>
                  <span>10M</span>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--fyxvo-text)]">
                    Standard RPC
                  </label>
                  <span className="font-mono text-sm text-[var(--fyxvo-text-muted)]">
                    {standardPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={standardPct}
                  onChange={(e) => adjustPct("standard", Number(e.target.value))}
                  className="w-full accent-[var(--fyxvo-brand)]"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--fyxvo-text)]">
                    Compute-heavy
                  </label>
                  <span className="font-mono text-sm text-[var(--fyxvo-text-muted)]">
                    {computePct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={computePct}
                  onChange={(e) => adjustPct("compute", Number(e.target.value))}
                  className="w-full accent-[var(--fyxvo-brand)]"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--fyxvo-text)]">
                    Priority relay
                  </label>
                  <span className="font-mono text-sm text-[var(--fyxvo-text-muted)]">
                    {priorityPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={priorityPct}
                  onChange={(e) => adjustPct("priority", Number(e.target.value))}
                  className="w-full accent-[var(--fyxvo-brand)]"
                />
              </div>

              <div className="flex gap-2 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2.5">
                <span className="text-sm text-[var(--fyxvo-text-muted)]">
                  Mix total:
                </span>
                <span
                  className={`text-sm font-medium ${standardPct + computePct + priorityPct === 100 ? "text-[var(--fyxvo-success)]" : "text-[var(--fyxvo-warning)]"}`}
                >
                  {standardPct + computePct + priorityPct}%
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Monthly estimate
                </p>
                {discount > 0 ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[var(--fyxvo-success)]/30 bg-[var(--fyxvo-success)]/10 px-2.5 py-1 text-xs font-medium text-[var(--fyxvo-success)]">
                    {discount * 100}% volume discount applied
                  </div>
                ) : null}
                <div className="mt-4 space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-sm text-[var(--fyxvo-text-muted)]">
                      Lamports
                    </span>
                    <span className="font-mono text-lg font-semibold text-[var(--fyxvo-text)]">
                      {finalLamports.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-sm text-[var(--fyxvo-text-muted)]">
                      SOL
                    </span>
                    <span className="font-mono text-lg font-semibold text-[var(--fyxvo-text)]">
                      {finalSol.toFixed(6)}
                    </span>
                  </div>
                  {finalUsd != null ? (
                    <div className="flex items-end justify-between">
                      <span className="text-sm text-[var(--fyxvo-text-muted)]">
                        USD (est.)
                      </span>
                      <span className="font-mono text-lg font-semibold text-[var(--fyxvo-text)]">
                        ${finalUsd.toFixed(4)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                  Mix breakdown
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--fyxvo-text-muted)]">
                      Standard ({standardPct}%)
                    </span>
                    <span className="font-mono text-[var(--fyxvo-text-soft)]">
                      {Math.round(standardLamports).toLocaleString()} lam
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--fyxvo-text-muted)]">
                      Compute-heavy ({computePct}%)
                    </span>
                    <span className="font-mono text-[var(--fyxvo-text-soft)]">
                      {Math.round(computeLamports).toLocaleString()} lam
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--fyxvo-text-muted)]">
                      Priority ({priorityPct}%)
                    </span>
                    <span className="font-mono text-[var(--fyxvo-text-soft)]">
                      {Math.round(priorityLamports).toLocaleString()} lam
                    </span>
                  </div>
                </div>
              </div>
              {solPrice == null ? (
                <p className="text-xs text-[var(--fyxvo-text-muted)]">
                  USD estimate unavailable. SOL price could not be fetched from CoinGecko.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            Comparison
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
            How Fyxvo compares
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
            A straightforward comparison based on publicly available information. This is context for decision-making, not marketing copy.
          </p>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--fyxvo-border)]">
                  <th className="py-3 pr-6 text-left font-medium text-[var(--fyxvo-text-muted)] w-56">
                    Feature
                  </th>
                  <th className="py-3 px-4 text-center font-semibold text-[var(--fyxvo-text)] bg-[var(--fyxvo-brand-subtle)] rounded-t-xl">
                    Fyxvo
                  </th>
                  <th className="py-3 px-4 text-center font-medium text-[var(--fyxvo-text-muted)]">
                    Public RPC
                  </th>
                  <th className="py-3 px-4 text-center font-medium text-[var(--fyxvo-text-muted)]">
                    Generic RPC
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: "Per-request pricing",
                    fyxvo: "Lamports, published",
                    pub: "Free, throttled",
                    generic: "Opaque tiers",
                  },
                  {
                    feature: "Rate limits",
                    fyxvo: "Per-key and per-project",
                    pub: "Hard shared caps",
                    generic: "Plan-based",
                  },
                  {
                    feature: "Request logging",
                    fyxvo: "Live, per-request",
                    pub: "None",
                    generic: "Paid tier only",
                  },
                  {
                    feature: "Analytics",
                    fyxvo: "Built-in, real-time",
                    pub: "None",
                    generic: "Paid add-on",
                  },
                  {
                    feature: "Priority routing",
                    fyxvo: "Dedicated endpoint",
                    pub: "Not offered",
                    generic: "Not offered",
                  },
                  {
                    feature: "On-chain funding",
                    fyxvo: "SOL-native, verifiable",
                    pub: "No",
                    generic: "Credit card only",
                  },
                  {
                    feature: "Project management",
                    fyxvo: "On-chain projects, RBAC",
                    pub: "No",
                    generic: "Varies",
                  },
                ].map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-[var(--fyxvo-border)]"
                  >
                    <td className="py-3 pr-6 text-[var(--fyxvo-text-muted)]">
                      {row.feature}
                    </td>
                    <td className="py-3 px-4 text-center bg-[var(--fyxvo-brand-subtle)] font-medium text-[var(--fyxvo-text)]">
                      {row.fyxvo}
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--fyxvo-text-muted)]">
                      {row.pub}
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--fyxvo-text-muted)]">
                      {row.generic}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Enterprise contact */}
      <section className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-8 sm:p-12">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              Enterprise
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
              Need volume pricing?
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
              Teams with high-volume requirements, custom rate limit needs, or dedicated infrastructure requests should reach out directly. Enterprise plans include priority SLA, dedicated node allocation, custom analytics retention, and a direct support channel.
            </p>
            <div className="mt-8">
              <Button asChild>
                <Link href="/enterprise">Talk to us about enterprise</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-10 space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={item.q}
                className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] overflow-hidden"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-display text-base font-semibold text-[var(--fyxvo-text)]">
                    {item.q}
                  </span>
                  <svg
                    className={`h-4 w-4 shrink-0 text-[var(--fyxvo-text-muted)] transition-transform duration-150 ${openFaq === i ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {openFaq === i ? (
                  <div className="border-t border-[var(--fyxvo-border)] px-5 pb-5 pt-4">
                    <p className="text-base leading-7 text-[var(--fyxvo-text-muted)]">
                      {item.a}
                    </p>
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
