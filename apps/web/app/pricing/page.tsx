"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const TIERS = [
  {
    name: "Standard RPC",
    tag: "standard",
    lamports: 1000,
    description:
      "Covers everyday JSON-RPC reads: getBalance, getAccountInfo, getBlock, getTransaction. Full key validation, funding checks, rate controls, and upstream failover.",
    style: "outlined" as const,
  },
  {
    name: "Compute-heavy",
    tag: "compute-heavy",
    lamports: 3000,
    description:
      "For methods that place more load on upstream nodes: getProgramAccounts, getTokenAccountsByOwner, getSignaturesForAddress. Higher rate reflects the heavier upstream work.",
    style: "featured" as const,
  },
  {
    name: "Priority relay",
    tag: "priority",
    lamports: 5000,
    description:
      "Dedicated priority relay path with its own rate controls and pricing. Designed for traffic needing tighter latency budgets or a separate request lane.",
    style: "heavy" as const,
  },
] as const;

const REVENUE_SPLITS = [
  { label: "Node operators", pct: 80, color: "#f97316" },
  { label: "Protocol treasury", pct: 10, color: "#10b981" },
  { label: "Infrastructure", pct: 10, color: "#38bdf8" },
] as const;

export default function PricingPage() {
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [requestVolume, setRequestVolume] = useState(100_000);
  const [enterpriseForm, setEnterpriseForm] = useState({
    name: "",
    email: "",
    companyName: "",
    estimatedMonthlyRequests: "",
    useCase: "",
  });
  const [formState, setFormState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd")
      .then((r) => r.json())
      .then((data: { solana?: { usd?: number } }) => {
        setSolPrice(data?.solana?.usd ?? null);
      })
      .catch(() => null);
  }, []);

  function calcCost(lamports: number, reqs: number, discount: number): { sol: number; usd: number | null } {
    const totalLamports = lamports * reqs * (1 - discount);
    const sol = totalLamports / 1_000_000_000;
    return { sol, usd: solPrice !== null ? sol * solPrice : null };
  }

  const discount =
    requestVolume >= 10_000_000 ? 0.4 : requestVolume >= 1_000_000 ? 0.2 : 0;

  async function handleEnterpriseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState("loading");
    setFormError("");
    try {
      const res = await fetch("https://api.fyxvo.com/v1/enterprise/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...enterpriseForm,
          estimatedMonthlyRequests: Number(enterpriseForm.estimatedMonthlyRequests),
        }),
      });
      if (!res.ok) throw new Error("Submission failed. Please try again.");
      setFormState("success");
    } catch (err) {
      setFormState("error");
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]/40";

  return (
    <div style={{ backgroundColor: "#0a0a0f" }} className="min-h-screen">

      {/* Hero */}
      <section className="py-24 lg:py-32 border-b border-white/[0.08]">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#f97316] mb-3">
            Pricing
          </p>
          <h1 className="font-display text-5xl sm:text-6xl font-semibold tracking-tight text-[#f1f5f9] max-w-3xl leading-[1.04]">
            Per-request pricing tied to real usage
          </h1>
          <p className="mt-6 text-lg leading-8 text-[#64748b] max-w-2xl font-sans">
            Fund a project with devnet SOL, relay requests through the managed gateway, and pay
            published lamport rates per request. Volume discounts apply automatically.
          </p>
          {solPrice !== null ? (
            <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live SOL price: <strong>${solPrice.toFixed(2)}</strong>
              <span className="text-emerald-400/60 text-xs">via CoinGecko</span>
            </div>
          ) : null}
        </div>
      </section>

      {/* Tier cards */}
      <section className="py-20 border-b border-white/[0.08]">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#f97316] mb-3">
            Request tiers
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#f1f5f9] tracking-tight mb-10">
            Published rates for every request class
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TIERS.map((tier) => {
              const solPerReq = tier.lamports / 1_000_000_000;
              const usdPerReq = solPrice !== null ? solPerReq * solPrice : null;
              const isFeatured = tier.style === "featured";
              const isHeavy = tier.style === "heavy";

              return (
                <div
                  key={tier.tag}
                  className={`rounded-2xl p-6 transition-transform hover:-translate-y-1 ${
                    isFeatured
                      ? "border-2 border-[#f97316]/60 bg-[#f97316]/8 shadow-xl shadow-[#f97316]/10"
                      : isHeavy
                        ? "border-2 border-white/[0.14] bg-white/[0.04]"
                        : "border border-white/[0.08] bg-white/[0.03]"
                  }`}
                >
                  {isFeatured ? (
                    <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#f97316]/30 bg-[#f97316]/15 px-3 py-1 text-xs font-medium text-[#f97316]">
                      Most common
                    </div>
                  ) : null}
                  <h3 className="font-display text-xl font-semibold text-[#f1f5f9] mb-4">
                    {tier.name}
                  </h3>
                  <div className="space-y-1 mb-5">
                    <p className="font-display text-4xl font-semibold text-[#f1f5f9]">
                      {tier.lamports.toLocaleString()}
                      <span className="text-base font-normal text-[#64748b] ml-2">lam</span>
                    </p>
                    <p className="text-sm text-[#64748b]">
                      ≈ {solPerReq.toFixed(7)} SOL / req
                    </p>
                    {usdPerReq !== null ? (
                      <p className="text-xs text-[#64748b]">≈ ${usdPerReq.toFixed(6)} USD / req</p>
                    ) : null}
                  </div>
                  <p className="text-sm leading-6 text-[#64748b] font-sans">{tier.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cost estimator */}
      <section className="py-20 border-b border-white/[0.08]">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#f97316] mb-3">
            Cost estimator
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#f1f5f9] tracking-tight mb-10">
            See your estimated monthly cost
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
              <label className="block mb-3">
                <span className="text-sm font-medium text-[#f1f5f9]">
                  Monthly requests:{" "}
                  <span className="text-[#f97316]">{requestVolume.toLocaleString()}</span>
                </span>
              </label>
              <input
                type="range"
                min={1000}
                max={10_000_000}
                step={1000}
                value={requestVolume}
                onChange={(e) => setRequestVolume(Number(e.target.value))}
                className="w-full accent-[#f97316] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-[#64748b] mt-1.5">
                <span>1K</span>
                <span>1M</span>
                <span>10M</span>
              </div>
              {discount > 0 ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                  {discount * 100}% volume discount applied automatically
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              {TIERS.map((tier) => {
                const { sol, usd } = calcCost(tier.lamports, requestVolume, discount);
                return (
                  <div
                    key={tier.tag}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-[#f1f5f9]">{tier.name}</p>
                        <p className="text-xs text-[#64748b] mt-0.5">
                          {tier.lamports.toLocaleString()} lam/req
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-base font-semibold text-[#f1f5f9]">
                          {sol.toFixed(5)} SOL
                        </p>
                        {usd !== null ? (
                          <p className="font-mono text-xs text-[#64748b]">${usd.toFixed(4)} USD</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Volume discounts */}
      <section className="py-20 border-b border-white/[0.08]">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#f97316] mb-3">
            Volume discounts
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#f1f5f9] tracking-tight mb-10">
            Automatic discounts as traffic grows
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8">
              <p className="font-display text-lg font-semibold text-[#f1f5f9] mb-2">
                1M+ requests / month
              </p>
              <p className="font-display text-5xl font-semibold text-emerald-400 mb-4">20% off</p>
              <p className="text-sm leading-6 text-[#64748b]">
                Once your project crosses one million requests in a calendar month, all subsequent
                requests in that month are charged at 80% of the published tier rate.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8">
              <p className="font-display text-lg font-semibold text-[#f1f5f9] mb-2">
                10M+ requests / month
              </p>
              <p className="font-display text-5xl font-semibold text-emerald-400 mb-4">40% off</p>
              <p className="text-sm leading-6 text-[#64748b]">
                Projects exceeding ten million monthly requests receive a 40% reduction across all
                tiers for the remainder of that month. Fully supersedes the 20% tier.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Revenue split */}
      <section className="py-20 border-b border-white/[0.08]">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#f97316] mb-3">
            Revenue split
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#f1f5f9] tracking-tight mb-10">
            How request fees are distributed
          </h2>

          {/* Bar chart */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 mb-8">
            <div className="flex h-8 rounded-xl overflow-hidden mb-5">
              {REVENUE_SPLITS.map((item) => (
                <div
                  key={item.label}
                  style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                  className="transition-all"
                  title={`${item.label}: ${item.pct}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-5">
              {REVENUE_SPLITS.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-[#64748b]">
                    {item.label}{" "}
                    <span className="font-semibold text-[#f1f5f9]">{item.pct}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="font-display text-3xl font-semibold mb-1" style={{ color: "#f97316" }}>
                80%
              </p>
              <p className="font-semibold text-[#f1f5f9] mb-2">Node operators</p>
              <p className="text-sm leading-6 text-[#64748b]">
                The majority of each fee goes directly to the nodes routing traffic, aligning
                operator incentives with network quality.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="font-display text-3xl font-semibold mb-1" style={{ color: "#10b981" }}>
                10%
              </p>
              <p className="font-semibold text-[#f1f5f9] mb-2">Protocol treasury</p>
              <p className="text-sm leading-6 text-[#64748b]">
                A small share accrues to the protocol treasury for ongoing development, audits, and
                governance.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="font-display text-3xl font-semibold mb-1" style={{ color: "#38bdf8" }}>
                10%
              </p>
              <p className="font-semibold text-[#f1f5f9] mb-2">Infrastructure</p>
              <p className="text-sm leading-6 text-[#64748b]">
                The remaining share funds gateway hosting, monitoring, and operational costs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise contact form */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 sm:p-12">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#f97316] mb-3">
              Enterprise
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#f1f5f9] tracking-tight mb-4">
              Need a higher-throughput rollout path?
            </h2>
            <p className="text-base leading-7 text-[#64748b] max-w-xl mb-10">
              Teams that need sustained high volume, isolated routing, or closer operational support
              can submit interest here and we&apos;ll follow up directly.
            </p>

            {formState === "success" ? (
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-6">
                <p className="font-semibold text-emerald-400 mb-1">Request received</p>
                <p className="text-sm text-emerald-400/80">
                  We&apos;ll be in touch shortly to discuss your requirements.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => void handleEnterpriseSubmit(e)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-5"
              >
                <div>
                  <label className="block mb-2 text-sm font-medium text-[#f1f5f9]">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Alex Chen"
                    value={enterpriseForm.name}
                    onChange={(e) => setEnterpriseForm((f) => ({ ...f, name: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-[#f1f5f9]">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={enterpriseForm.email}
                    onChange={(e) => setEnterpriseForm((f) => ({ ...f, email: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-[#f1f5f9]">
                    Company name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Acme Labs"
                    value={enterpriseForm.companyName}
                    onChange={(e) =>
                      setEnterpriseForm((f) => ({ ...f, companyName: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-[#f1f5f9]">
                    Estimated monthly requests
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="5000000"
                    value={enterpriseForm.estimatedMonthlyRequests}
                    onChange={(e) =>
                      setEnterpriseForm((f) => ({
                        ...f,
                        estimatedMonthlyRequests: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block mb-2 text-sm font-medium text-[#f1f5f9]">Use case</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your use case and infrastructure requirements."
                    value={enterpriseForm.useCase}
                    onChange={(e) =>
                      setEnterpriseForm((f) => ({ ...f, useCase: e.target.value }))
                    }
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {formState === "error" ? (
                  <div className="sm:col-span-2 text-sm text-red-400">{formError}</div>
                ) : null}

                <div className="sm:col-span-2 flex flex-wrap gap-4 items-center">
                  <button
                    type="submit"
                    disabled={formState === "loading"}
                    className="rounded-xl bg-[#f97316] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#f97316]/90 disabled:opacity-60"
                  >
                    {formState === "loading" ? "Submitting…" : "Submit interest"}
                  </button>
                  <Link href="/contact" className="text-sm text-[#64748b] hover:text-[#f1f5f9] transition-colors">
                    Or contact us directly
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
