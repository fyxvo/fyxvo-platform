import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";
import { InterestCaptureForm } from "../../components/interest-capture-form";
import { AdvancedPricingEstimator, PricingEstimator } from "../../components/pricing-estimator";
import { TrackedLinkButton } from "../../components/tracked-link-button";
import { PRICING_LAMPORTS, PRICING_USDC, VOLUME_DISCOUNT, FREE_TIER_REQUESTS, REVENUE_SPLIT_BPS } from "@fyxvo/config/pricing";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: {
    absolute: "Pricing — Fyxvo"
  },
  description: "Simple, transparent pricing for Solana devnet teams. Pay per request in SOL, get volume discounts automatically, and fund your project on chain.",
  alternates: {
    canonical: `${webEnv.siteUrl}/pricing`
  },
  openGraph: {
    title: "Pricing — Fyxvo",
    description: "Simple, transparent pricing for Solana devnet teams. Pay per request in SOL, get volume discounts automatically, and fund your project on chain.",
    url: `${webEnv.siteUrl}/pricing`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — Fyxvo",
    description: "Simple, transparent pricing for Solana devnet teams. Pay per request in SOL, get volume discounts automatically, and fund your project on chain.",
    images: [webEnv.socialImageUrl]
  }
};

function lamportsToSol(lamports: number) {
  return (lamports / 1_000_000_000).toFixed(6);
}

function usdcUnitsToDisplay(units: number) {
  return (units / 1_000_000).toFixed(4);
}

async function fetchSolPriceUsd(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json() as { solana?: { usd?: number } };
    return data.solana?.usd ?? null;
  } catch {
    return null;
  }
}

export default async function PricingPage() {
  const solPriceUsd = await fetchSolPriceUsd();

  const tiers = [
    {
      name: "Standard RPC",
      tag: "standard",
      lamports: PRICING_LAMPORTS.standard,
      usdc: PRICING_USDC.standard,
      description: "Covers all the everyday JSON-RPC reads you rely on, like getBalance, getAccountInfo, getBlock, and getTransaction.",
      what: "Each request goes through API-key validation, balance checks, Redis-backed rate limiting, multi-node routing with automatic fallback, full request logging, and rolled-up analytics."
    },
    {
      name: "Compute-heavy",
      tag: "compute-heavy",
      lamports: PRICING_LAMPORTS.computeHeavy,
      usdc: PRICING_USDC.computeHeavy,
      description: "For the heavier methods that need more upstream compute, such as getProgramAccounts, getTokenAccountsByOwner, and getSignaturesForAddress.",
      what: "Uses the same routing infrastructure as standard requests, but priced to reflect the higher compute cost these queries place on the node pool."
    },
    {
      name: "Priority relay",
      tag: "priority",
      lamports: PRICING_LAMPORTS.priority,
      usdc: PRICING_USDC.priority,
      description: "A dedicated endpoint with its own routing path, separate rate window, and distinct pricing. Built for when speed matters most.",
      what: "This is an entirely separate routing mode. Priority is always explicit and never a hidden fast lane layered on top of the standard path."
    }
  ] as const;

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        eyebrow="Pricing"
        title="Straightforward pricing for teams shipping real Solana traffic on devnet."
        description="Three tiers, each priced per request in lamports. Fund your project on chain and get automatic volume discounts at 1M and 10M requests per month."
        actions={
          <>
            <TrackedLinkButton
              href="/docs"
              eventName="landing_cta_clicked"
              eventSource="pricing-header-docs"
            >
              Open quickstart
            </TrackedLinkButton>
            <TrackedLinkButton
              href="/contact"
              eventName="landing_cta_clicked"
              eventSource="pricing-header-contact"
              variant="secondary"
            >
              Request founder follow-up
            </TrackedLinkButton>
          </>
        }
      />

      {solPriceUsd != null ? (
        <div className="flex items-center gap-2 text-sm text-[var(--fyxvo-text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          SOL price (live): <span className="font-medium text-[var(--fyxvo-text)]">${solPriceUsd.toFixed(2)}</span>
          <span className="text-xs opacity-60">via CoinGecko</span>
        </div>
      ) : null}

      {/* Three pricing tiers */}
      <section className="grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => {
          const solPerRequest = lamportsToSol(tier.lamports);
          const usdPerRequest = solPriceUsd != null
            ? `~$${((tier.lamports / 1_000_000_000) * solPriceUsd).toFixed(6)}`
            : null;

          return (
            <Card key={tier.tag} className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5 space-y-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">SOL</div>
                    <div className="mt-1 text-2xl font-semibold text-[var(--fyxvo-text)]">
                      {tier.lamports.toLocaleString()} lam
                    </div>
                    <div className="text-sm text-[var(--fyxvo-text-muted)]">{solPerRequest} SOL per request</div>
                    {usdPerRequest ? (
                      <div className="text-xs text-[var(--fyxvo-text-muted)]">{usdPerRequest} USD per request</div>
                    ) : null}
                  </div>
                  <div className="border-t border-[color:var(--fyxvo-border)] pt-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">USDC (gated)</div>
                    <div className="mt-1 text-sm text-[var(--fyxvo-text-soft)]">
                      {tier.usdc.toLocaleString()} units · {usdcUnitsToDisplay(tier.usdc)} USDC per request
                    </div>
                  </div>
                </div>
                <Notice tone="neutral" title="What this includes">
                  {tier.what}
                </Notice>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Free tier + volume discounts */}
      <section className="grid gap-6 md:grid-cols-2">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Free tier</CardTitle>
            <CardDescription>Every new project gets a batch of complimentary requests so you can try things out on devnet before funding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
              <div className="text-3xl font-semibold text-[var(--fyxvo-text)]">
                {FREE_TIER_REQUESTS.toLocaleString()}
              </div>
              <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">standard requests per new project, no funding required</p>
            </div>
            <p className="text-sm text-[var(--fyxvo-text-soft)] leading-6">
              Just activate your project, create an API key, and start routing up to {FREE_TIER_REQUESTS.toLocaleString()} standard devnet requests without putting any SOL down. Compute-heavy and priority requests are not part of the free tier.
            </p>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Volume discounts</CardTitle>
            <CardDescription>These kick in automatically when you cross the threshold. Nothing to negotiate or request.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                label: `${(VOLUME_DISCOUNT.tier1.monthlyRequests / 1_000_000).toFixed(0)}M+ requests per month`,
                discount: `${VOLUME_DISCOUNT.tier1.discountBps / 100}% off`,
                detail: "20% reduction across all tiers"
              },
              {
                label: `${(VOLUME_DISCOUNT.tier2.monthlyRequests / 1_000_000).toFixed(0)}M+ requests per month`,
                discount: `${VOLUME_DISCOUNT.tier2.discountBps / 100}% off`,
                detail: "40% reduction across all tiers"
              }
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-[1rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-[var(--fyxvo-text)]">{item.label}</div>
                  <div className="text-xs text-[var(--fyxvo-text-muted)]">{item.detail}</div>
                </div>
                <div className="text-sm font-semibold text-[var(--fyxvo-accent-success)]">{item.discount}</div>
              </div>
            ))}
            <p className="text-sm text-[var(--fyxvo-text-soft)] leading-6">
              Discounts are applied to the per-request lamport cost right when the request happens. There are no billing cycles or delayed adjustments.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Revenue split */}
      <section>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Revenue split</CardTitle>
            <CardDescription>Every request fee is divided on chain between the people running nodes, the protocol treasury, and infrastructure funding.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Node operators", bps: REVENUE_SPLIT_BPS.nodeOperators, color: "bg-[var(--fyxvo-brand)]" },
                { label: "Protocol treasury", bps: REVENUE_SPLIT_BPS.protocolTreasury, color: "bg-emerald-500" },
                { label: "Infrastructure fund", bps: REVENUE_SPLIT_BPS.infraFund, color: "bg-sky-500" }
              ].map((item) => (
                <div key={item.label} className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                  <div className={`h-2 w-8 rounded-full ${item.color} mb-3`} />
                  <div className="text-2xl font-semibold text-[var(--fyxvo-text)]">{item.bps / 100}%</div>
                  <div className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">{item.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Cost estimator + interest form */}
      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PricingEstimator solPriceUsd={solPriceUsd} />

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>How funding works</CardTitle>
            <CardDescription>
              Fyxvo is funded directly on chain. There is no off-platform invoice layer sitting in between.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "1. Activate project",
                  body: "Create your project and confirm the activation transaction. This sets up your on-chain project account.",
                },
                {
                  title: "2. Fund with SOL",
                  body: "Prepare and sign a SOL funding transaction. Once the signature is verified, your spendable balance updates immediately.",
                },
                {
                  title: "3. Start making requests",
                  body: "Each request is priced by its tier and method, then deducted from the on-chain-backed balance tied to your project.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
                >
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                    {item.title}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
            <Notice tone="success" title="SOL funding is live">
              You can fund your project with SOL on devnet right now.
            </Notice>
            <Notice tone="neutral" title="USDC is not yet available">
              USDC funding is gated behind a configuration flag and will remain disabled until an upcoming deployment turns it on.
            </Notice>
          </CardContent>
        </Card>
      </section>

      {/* Advanced cost estimator */}
      <section>
        <AdvancedPricingEstimator solPriceUsd={solPriceUsd} />
      </section>

      {/* Comparison table */}
      <section>
        <h2 className="font-display text-2xl font-semibold text-[var(--fyxvo-text)] mb-6">How Fyxvo compares</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--fyxvo-border)]">
                <th className="py-3 pr-6 text-left font-medium text-[var(--fyxvo-text-muted)] w-48">Feature</th>
                <th className="py-3 px-4 text-center font-semibold text-[var(--fyxvo-text)] bg-[var(--fyxvo-brand)]/5 rounded-t-xl">Fyxvo</th>
                <th className="py-3 px-4 text-center font-medium text-[var(--fyxvo-text-muted)]">Public RPC</th>
                <th className="py-3 px-4 text-center font-medium text-[var(--fyxvo-text-muted)]">Generic RPCs</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "On-chain funding", fyxvo: "Yes, SOL-native", pub: "No", generic: "Credit card" },
                { feature: "API key scoping", fyxvo: "Yes, revokable", pub: "No", generic: "Varies" },
                { feature: "Per-request analytics", fyxvo: "Yes, live logs", pub: "No", generic: "Paid tier only" },
                { feature: "Priority relay path", fyxvo: "Yes, separate endpoint", pub: "No", generic: "Not offered" },
                { feature: "Rate limiting", fyxvo: "Yes, per-key and project", pub: "Hard caps", generic: "Plan-based" },
                { feature: "Devnet focus", fyxvo: "Yes, purpose-built", pub: "Shared", generic: "Mainnet-first" },
                { feature: "Transparent pricing", fyxvo: "Yes, lamport-per-request", pub: "Free but throttled", generic: "Opaque tiers" },
              ].map((row) => (
                <tr key={row.feature} className="border-b border-[var(--fyxvo-border)]">
                  <td className="py-3 pr-6 text-[var(--fyxvo-text-muted)]">{row.feature}</td>
                  <td className="py-3 px-4 text-center bg-[var(--fyxvo-brand)]/5 text-[var(--fyxvo-text)] font-medium">{row.fyxvo}</td>
                  <td className="py-3 px-4 text-center text-[var(--fyxvo-text-muted)]">{row.pub}</td>
                  <td className="py-3 px-4 text-center text-[var(--fyxvo-text-muted)]">{row.generic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--fyxvo-text-muted)]">
          This is a devnet alpha comparison based on publicly available information. It is meant to give you context, not serve as a definitive benchmark.
        </p>
      </section>

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold text-[var(--fyxvo-text)]">Frequently asked questions</h2>
        {[
          {
            q: "Is this devnet only?",
            a: "For now, yes. Fyxvo runs entirely on Solana devnet during this private alpha phase. That means all your projects, API keys, and funded balances live on devnet. We will consider mainnet once the protocol has been thoroughly validated at scale."
          },
          {
            q: "What happens when my SOL balance runs out?",
            a: "Your requests will start getting rejected with a 402 status until you top up the project balance. The good news is that your API key stays valid the whole time, so as soon as you add more SOL, traffic starts flowing again. You will also see a low-balance warning on the dashboard before you actually hit zero."
          },
          {
            q: "Can I use one API key across multiple projects?",
            a: "That is not how it works. Each API key belongs to one project, and each project maintains its own funded balance and rate window. If you need keys for different services or environments, you can create multiple keys within the same project."
          },
          {
            q: "What is the difference between standard and priority relay?",
            a: "Standard relay handles your everyday JSON-RPC reads through the managed node pool. Priority relay is a completely separate endpoint with its own rate window, built specifically for DeFi transactions and anything where latency really matters. It costs more per request and is billed on its own."
          },
          {
            q: "Are there any hidden fees?",
            a: "None at all. Every request costs a known number of lamports, published in the config package, and charged at the moment the request goes through. Volume discounts apply automatically when you cross the thresholds. There are no platform fees, no subscriptions, and no surprise overage charges."
          },
          {
            q: "How do volume discounts work?",
            a: "They are fully automatic. Once your project crosses the 1M or 10M monthly request threshold, the discount kicks in for all requests above that line in the current billing window. You do not need to ask for it or sign up for a different plan."
          },
        ].map((item) => (
          <div key={item.q} className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <p className="font-medium text-[var(--fyxvo-text)]">{item.q}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">{item.a}</p>
          </div>
        ))}
      </section>

      <InterestCaptureForm
        source="pricing-page"
        title="Want to talk about volume, priority relay, or a managed rollout?"
        description="Use this form if you are planning higher-volume devnet usage, want to explore priority relay, need analytics visibility, or just want to talk through your rollout with the team."
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Who this is for</CardTitle>
            <CardDescription>
              Teams that want to test with a real devnet relay, not a placeholder dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            If you are validating wallet-authenticated project control, funded JSON-RPC,
            priority relay behavior, analytics, or managed launch operations before a wider
            rollout, this is built for you.
          </CardContent>
        </Card>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>What you can expect</CardTitle>
            <CardDescription>
              Honest tooling: project activation, SOL funding, API keys, relay access, and clear status surfaces.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            We are not going to pretend this is a finished mainnet product or claim adoption numbers
            that do not exist. What you get is a credible devnet path and enough visibility to
            decide whether Fyxvo is the right fit for your team.
          </CardContent>
        </Card>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Where to go next</CardTitle>
            <CardDescription>
              Pick whichever path matches where you are right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <TrackedLinkButton
              href="/docs"
              eventName="landing_cta_clicked"
              eventSource="pricing-links-docs"
              variant="secondary"
            >
              Open quickstart
            </TrackedLinkButton>
            <TrackedLinkButton
              href="/dashboard"
              eventName="landing_cta_clicked"
              eventSource="pricing-links-dashboard"
              variant="secondary"
            >
              Open dashboard
            </TrackedLinkButton>
            <TrackedLinkButton
              href={webEnv.statusPageUrl}
              eventName="landing_cta_clicked"
              eventSource="pricing-links-status"
              variant="secondary"
            >
              View status
            </TrackedLinkButton>
            <TrackedLinkButton
              href="/contact"
              eventName="landing_cta_clicked"
              eventSource="pricing-links-contact"
              variant="secondary"
            >
              Contact Fyxvo
            </TrackedLinkButton>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
