import { Card, CardContent, CardDescription, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";
import { InterestCaptureForm } from "../../components/interest-capture-form";
import { TrackedLinkButton } from "../../components/tracked-link-button";
import { getStatusSnapshot } from "../../lib/server-status";
import { formatInteger } from "../../lib/format";
import { webEnv } from "../../lib/env";

function lamportsToSol(lamports: number) {
  return (lamports / 1_000_000_000).toFixed(6);
}

export default async function PricingPage() {
  const status = await getStatusSnapshot();
  const pricing = status.gatewayStatus.pricing;
  const standardPrice = pricing?.standard ?? 0;
  const priorityPrice = pricing?.priority ?? 0;
  const writeMultiplier = pricing?.writeMultiplier ?? 1;

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        eyebrow="Pricing"
        title="Devnet launch pricing for early teams running real Solana traffic."
        description="This pricing page is for serious early teams that want to understand what is live today, how SOL-funded usage works, and when it is worth talking directly with Fyxvo about rollout or priority-path needs."
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

      <Notice tone="neutral" title="Launch pricing, not a fake enterprise sheet">
        Fyxvo is live on Solana devnet. These prices are for the current private alpha and are meant
        to help early teams understand the standard path, the priority path, and how SOL funding
        maps to request capacity.
      </Notice>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Standard RPC</CardTitle>
            <CardDescription>
              For normal JSON-RPC traffic where funded availability, upstream fallback, and clear
              operational posture matter more than shaving every last millisecond.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Base price
              </div>
              <div className="mt-2 text-3xl font-semibold text-[var(--fyxvo-text)]">
                {formatInteger(standardPrice)} lamports
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                About {lamportsToSol(standardPrice)} SOL per request before method-specific
                multipliers apply.
              </p>
            </div>
            <Notice tone="neutral" title="What this includes">
              API-key validation, funded balance enforcement, Redis-backed rate limiting, multi-node
              routing with fallback, request logging, and analytics rollups.
            </Notice>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Priority relay</CardTitle>
            <CardDescription>
              For latency-sensitive devnet traffic where teams want a separate routing mode,
              separate rate window, and distinct pricing from the standard path.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-5">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Base price
              </div>
              <div className="mt-2 text-3xl font-semibold text-[var(--fyxvo-text)]">
                {formatInteger(priorityPrice)} lamports
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                About {lamportsToSol(priorityPrice)} SOL per request before method-specific
                multipliers apply.
              </p>
            </div>
            <Notice tone="neutral" title="What changes">
              Priority mode keeps faster routing and separate rate behavior explicit. It is not a
              hidden feature of the standard path.
            </Notice>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>How funding works</CardTitle>
            <CardDescription>
              Fyxvo is funded on chain, not through an off-platform invoice abstraction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "1. Activate project",
                  body: "Create the project and confirm the activation transaction so the on-chain project account exists.",
                },
                {
                  title: "2. Fund with SOL",
                  body: "Prepare and sign a SOL funding transaction. The API verifies the signature and refreshes spendable balance.",
                },
                {
                  title: "3. Spend through the gateway",
                  body: "Requests are priced by routing mode and method profile, then deducted against the on-chain-backed project balance.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
                >
                  <div className="text-xs uppercase tracking-[0.16em] text-brand-300">
                    {item.title}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
            <Notice tone="success" title="SOL is the live funding path">
              SOL funding is live on devnet today.
            </Notice>
            <Notice tone="neutral" title="USDC stays gated">
              USDC remains configuration-gated until the deployment explicitly enables it. The
              pricing surface does not pretend otherwise.
            </Notice>
            <Notice tone="neutral" title="Write method multiplier">
              Methods that are treated as write-heavy are multiplied by {writeMultiplier}x relative
              to the base price so higher-cost routing stays visible.
            </Notice>
          </CardContent>
        </Card>

        <InterestCaptureForm
          source="pricing-page"
          title="Plan rollout, volume, or founder review"
          description="Use this form when the team wants higher-volume devnet planning, priority relay review, analytics visibility, or a managed rollout conversation."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Who this is for</CardTitle>
            <CardDescription>
              Early teams that want a real devnet relay path, not a mock dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            This is a good fit for teams validating wallet-authenticated project control, funded
            JSON-RPC, priority relay behavior, analytics visibility, and managed launch operations
            before broader rollout.
          </CardContent>
        </Card>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>What you can expect</CardTitle>
            <CardDescription>
              Clean project activation, SOL funding, API keys, relay access, and honest status
              surfaces.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            The product does not claim fake production adoption or a finished mainnet commercial
            model. It gives early users a credible devnet path and enough visibility to evaluate
            fit.
          </CardContent>
        </Card>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Useful next links</CardTitle>
            <CardDescription>
              Pick the path that matches how far you want to go today.
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
