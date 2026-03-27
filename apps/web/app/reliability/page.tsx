import type { Metadata } from "next";
import Link from "next/link";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: "Reliability — Fyxvo",
  description:
    "How Fyxvo approaches uptime, incident communication, and infrastructure reliability during the devnet private alpha.",
  alternates: {
    canonical: `${webEnv.siteUrl}/reliability`,
  },
  openGraph: {
    title: "Reliability — Fyxvo",
    description:
      "How Fyxvo approaches uptime, incident communication, and infrastructure reliability during the devnet private alpha.",
    url: `${webEnv.siteUrl}/reliability`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reliability — Fyxvo",
    description:
      "How Fyxvo approaches uptime, incident communication, and infrastructure reliability during the devnet private alpha.",
    images: [webEnv.socialImageUrl],
  },
};

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[var(--fyxvo-border)] pt-10">
      <h2 className="font-display text-xl font-semibold text-[var(--fyxvo-text)] sm:text-2xl">
        {title}
      </h2>
      <div className="mt-5 space-y-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
        {children}
      </div>
    </section>
  );
}

export default function ReliabilityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
          Reliability
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-5xl">
          How we approach reliability
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
          Fyxvo is a devnet private alpha with no formal service level agreement.
          This page explains what uptime commitment we make, how the
          infrastructure is structured, how we communicate when things go wrong,
          and what that means for your requests.
        </p>

        <div className="mt-6 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
          <p className="text-sm font-semibold text-[var(--fyxvo-text)]">
            Current platform status
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--fyxvo-text-muted)]">
            Live status information, active incidents, and service health history
            are available at the{" "}
            <Link
              href="/status"
              className="text-[var(--fyxvo-brand)] hover:underline"
            >
              status page
            </Link>
            . That page is updated in real time from the API and gateway health
            endpoints.
          </p>
        </div>
      </div>

      <div className="space-y-10">
        <PolicySection title="Uptime commitments">
          <p>
            There is no formal SLA for the devnet private alpha. What we offer
            instead is a good-faith commitment to maintain best-effort
            availability. The team monitors platform health continuously and
            works to resolve issues promptly. Our internal target is to maintain
            99% uptime across the relay gateway and control plane API on devnet,
            though this is an operational goal rather than a contractual
            guarantee.
          </p>
          <p>
            Fyxvo operates on Solana devnet, which is a public test environment
            maintained by the Solana Foundation. Devnet can experience periodic
            instability, node resets, or extended downtime for reasons that are
            entirely outside Fyxvo's control. When devnet itself is degraded,
            Fyxvo relay requests will be affected even if the Fyxvo platform is
            fully operational. The status page distinguishes between Fyxvo-side
            incidents and broader Solana devnet conditions where possible.
          </p>
        </PolicySection>

        <PolicySection title="Managed infrastructure approach">
          <p>
            During the private alpha, all relay traffic routes through
            Fyxvo-controlled nodes. This is a single managed operator topology,
            meaning the infrastructure is not yet decentralized and all routing
            decisions are made within the Fyxvo-operated gateway. This design
            gives us direct observability and control over reliability, at the
            cost of not yet operating with the redundancy or distribution that a
            mainnet marketplace would require.
          </p>
          <p>
            The single operator topology means there is no external node failover
            during this stage. If the managed gateway node is unavailable, relay
            requests will not route elsewhere. This is a known limitation of the
            alpha architecture. External node operator onboarding is on the
            roadmap for mainnet preparation, at which point routing will become
            more resilient by distributing across independent operators.
          </p>
        </PolicySection>

        <PolicySection title="Devnet alpha posture">
          <p>
            Devnet tokens have no monetary value. This means that while
            degradation in the relay affects your ability to run tests and
            integrations, it does not put real funds at risk. Request logs record
            failures alongside successes, so your analytics dashboard reflects
            actual outcomes including errors during outages. Failed requests do
            not consume balance from your project treasury.
          </p>
          <p>
            Occasional Solana devnet instability, such as increased finalization
            time, elevated RPC error rates, or temporary unavailability of
            devnet cluster nodes, is outside Fyxvo's control and scope. Platform
            issues originating within the Fyxvo gateway, API, or control plane
            are within scope and are treated as incidents. We make an effort to
            distinguish between the two in status updates.
          </p>
        </PolicySection>

        <PolicySection title="How the team communicates degradation and incidents">
          <p>
            When the platform is degraded or experiencing an incident, updates
            are posted to the{" "}
            <Link
              href="/status"
              className="text-[var(--fyxvo-brand)] hover:underline"
            >
              status page
            </Link>
            . Incidents are opened with a description and current state, and
            updates are added as the situation evolves. When an incident is
            resolved, a resolution note is posted with a summary of what
            happened. Status history is derived from real health snapshots, not
            manually curated summaries.
          </p>
          <p>
            There is no email alerting for general users during the private
            alpha. If you need to monitor platform health programmatically, the
            API exposes a health endpoint that returns per-dependency response
            times for the database, Redis, and Solana RPC. Polling that endpoint
            from your own monitoring tooling is a supported pattern. A formal
            notification system with email and webhook-based alerting is planned
            for a future release.
          </p>
        </PolicySection>

        <PolicySection title="What happens during an incident">
          <p>
            During a gateway incident, relay requests may fail with error
            responses rather than routing successfully. The request log records
            the failure, including the HTTP status code and latency, so your
            analytics reflect what actually happened. Balance is not deducted for
            requests that fail to route successfully. If you see elevated error
            rates in your project analytics that correspond to a platform
            incident, the status page should have context on why.
          </p>
          <p>
            During a control plane API incident, dashboard operations such as
            project management, API key creation, and analytics queries may be
            unavailable or degraded. Relay traffic through the gateway is served
            by a separate process and may remain functional even when the control
            plane is experiencing issues. The health endpoint differentiates
            between these two paths, so you can determine which surface is
            affected.
          </p>
        </PolicySection>
      </div>
    </div>
  );
}
