import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reliability — Fyxvo",
  description:
    "Fyxvo's reliability posture during the devnet alpha: uptime framing, infrastructure, monitoring, and known limitations.",
};

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="border-t border-white/[0.08] pt-10">
      <h2 className="text-xl font-semibold text-[#f1f5f9] sm:text-2xl">{title}</h2>
      <div className="mt-5 space-y-4 text-base leading-7 text-[#64748b]">{children}</div>
    </section>
  );
}

export default function ReliabilityPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#0a0a0f" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl py-20">
          {/* Hero */}
          <div className="mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#f97316]">
              Reliability
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#f1f5f9] sm:text-5xl">
              Reliability at Fyxvo
            </h1>
            <p className="mt-5 text-base leading-7 text-[#64748b]">
              Fyxvo is a devnet alpha. This page is an honest account of how the
              platform is operated, what we monitor, how we communicate
              degradation, and what constraints come with the current stage. We do
              not have an SLA in alpha and will not pretend otherwise.
            </p>
          </div>

          <div className="space-y-12">
            <Section title="Uptime commitment">
              <p>
                During the devnet alpha there is no formal uptime guarantee or
                service level agreement. We operate the platform on a best-effort
                basis and aim to keep the gateway and API available continuously,
                but maintenance windows, infrastructure changes, and unexpected
                failures will occur without advance notice.
              </p>
              <p>
                Current service status is published in real time. You can{" "}
                <Link href="/status" className="text-[#f97316] hover:underline">
                  view the live status page
                </Link>{" "}
                for the latest state of the gateway, API, and on-chain program
                interactions. The status page is updated automatically as our
                monitoring systems detect changes.
              </p>
              <p>
                A formal SLA will be established before any production or mainnet
                deployment. At that stage, uptime commitments, incident response
                times, and compensation terms will be documented and contractually
                binding.
              </p>
            </Section>

            <Section title="Managed infrastructure">
              <p>
                The Fyxvo backend API and relay gateway are hosted on Railway.
                Railway provides automatic restarts on process crashes, rolling
                deployments with zero-downtime updates, and persistent environment
                variable management. Each service runs in an isolated container
                with resource limits and health-check probes.
              </p>
              <p>
                The web application is deployed on Vercel with global edge
                distribution. Static pages are served from the CDN edge with no
                origin dependency. Dynamic routes and API calls proxied through
                the web layer reach the Railway-hosted backend over private
                networking.
              </p>
              <p>
                Database state is managed on a Railway-hosted PostgreSQL instance
                with automated daily backups. In the event of data loss, recovery
                would restore to within 24 hours of the last backup checkpoint.
                Point-in-time recovery is not currently enabled in alpha.
              </p>
            </Section>

            <Section title="Degradation communication">
              <p>
                When the platform experiences degraded performance or an outage,
                we post updates to the{" "}
                <Link href="/status" className="text-[#f97316] hover:underline">
                  status page
                </Link>{" "}
                as quickly as possible. Incident updates include an initial
                acknowledgment, ongoing investigation notes, and a post-incident
                summary once the issue is resolved.
              </p>
              <p>
                For significant incidents, notifications are also sent to the
                Fyxvo newsletter and posted in the community channels linked from
                the dashboard. We aim to communicate the nature and scope of an
                incident within 30 minutes of identification.
              </p>
            </Section>

            <Section title="What we monitor">
              <p>
                Automated monitoring runs continuously across the following
                dimensions: gateway health endpoint availability and response
                time, per-method RPC relay latency at p50 and p95 percentiles,
                HTTP error rates on the API and gateway, background job queue
                depth and processing lag, and on-chain program instruction success
                rates for project activation and funding transactions.
              </p>
              <p>
                Alerts are configured on threshold breaches and trigger on-call
                notification within minutes. The metrics underpinning these alerts
                are the same data surfaced in the analytics dashboard, giving users
                and operators visibility into the same signal the team monitors
                internally.
              </p>
            </Section>

            <Section title="Known limitations">
              <p>
                Because Fyxvo runs on Solana devnet, all on-chain operations
                depend on the availability and health of Solana's public devnet
                infrastructure. Devnet nodes are shared resources; they experience
                resets, instability, and elevated latency from time to time that
                is outside Fyxvo's control.
              </p>
              <p>
                Devnet SOL has no monetary value and can be obtained freely via
                airdrop. Credit balances are denominated in devnet SOL and carry
                no real-world financial meaning during this alpha period. On-chain
                state is subject to devnet resets, which would require project
                re-activation.
              </p>
              <p>
                The current operator topology is a single managed node. There is
                no redundancy, geographic distribution, or failover routing at the
                relay layer in alpha. Horizontal scale and multi-operator routing
                are planned features for future stages.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </main>
  );
}
