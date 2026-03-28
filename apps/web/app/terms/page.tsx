import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Fyxvo",
  description:
    "Fyxvo's terms of service: devnet alpha status, acceptable use, on-chain funding, API keys, availability, intellectual property, and liability limitations.",
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

export default function TermsPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#0a0a0f" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl py-20">
          {/* Hero */}
          <div className="mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#f97316]">
              Legal
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#f1f5f9] sm:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-5 text-sm text-[#64748b]">
              Effective date: January 1, 2026
            </p>
            <p className="mt-4 text-base leading-7 text-[#64748b]">
              By accessing or using Fyxvo, you agree to be bound by these terms.
              If you do not agree, do not use the platform. These terms govern
              use of the Fyxvo web application, API, gateway relay, and on-chain
              programs during the devnet alpha period.
            </p>
          </div>

          <div className="space-y-12">
            <Section title="Devnet alpha status">
              <p>
                Fyxvo is pre-production software operating on the Solana devnet.
                The platform is provided as-is during this alpha period with no
                guarantees of availability, correctness, or fitness for any
                particular purpose. All transactions, project activations, and
                funding operations use Solana devnet SOL, which has no real
                monetary value.
              </p>
              <p>
                The platform may undergo breaking changes, resets, or complete
                rebuilds at any time during the alpha. Account data, project
                configurations, and on-chain state may be wiped as part of
                infrastructure upgrades. Fyxvo is not liable for any loss of
                data, configuration, or on-chain state during the alpha period.
              </p>
              <p>
                Do not use Fyxvo for production workloads, financial applications,
                or any use case that requires guarantees of availability or data
                durability until a mainnet production release is announced.
              </p>
            </Section>

            <Section title="Acceptable use">
              <p>
                You agree to use Fyxvo only for lawful purposes and in accordance
                with these terms. Specifically, you must not:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Intentionally exceed rate limits to degrade service for other
                  users or to circumvent billing controls.
                </li>
                <li>
                  Attempt to exploit, reverse-engineer, or compromise the Fyxvo
                  on-chain programs, API, or gateway infrastructure.
                </li>
                <li>
                  Use Fyxvo API keys to proxy unauthorized traffic on behalf of
                  third parties without explicit permission.
                </li>
                <li>
                  Submit automated requests designed to inflate usage metrics,
                  manipulate analytics, or exhaust shared infrastructure resources.
                </li>
                <li>
                  Use the platform for any purpose that violates applicable law
                  or the rights of others.
                </li>
              </ul>
            </Section>

            <Section title="On-chain funding">
              <p>
                To route traffic through the Fyxvo relay, projects must be funded
                with devnet SOL. Funded credits are consumed as requests are
                processed through the gateway. The cost per request is determined
                by the current rate schedule published in the dashboard.
              </p>
              <p>
                All SOL used on Fyxvo during the alpha is devnet SOL obtained via
                airdrop or test faucets. Devnet SOL has no monetary value. Fyxvo
                does not accept, hold, or transfer real-world currency or mainnet
                SOL during the alpha period. There are no refunds of devnet SOL,
                as devnet SOL itself carries no value.
              </p>
            </Section>

            <Section title="API keys">
              <p>
                API keys are issued on a per-project basis and carry scoped
                permissions. You are responsible for the security of your API
                keys. Do not share keys publicly, commit them to public
                repositories, or embed them in client-side code that would expose
                them to end users.
              </p>
              <p>
                Fyxvo reserves the right to revoke any API key that is found to
                be in violation of these terms or that poses a security risk to
                the platform. You can revoke your own keys at any time from the
                dashboard. Revocation takes effect immediately.
              </p>
            </Section>

            <Section title="Service availability">
              <p>
                Fyxvo provides the platform on a best-effort basis during the
                alpha period. There is no uptime guarantee, no SLA, and no
                commitment to uninterrupted service. Planned maintenance,
                infrastructure changes, and unexpected failures may cause
                downtime without advance notice.
              </p>
              <p>
                Current service status is published at the status page linked
                from the dashboard. We will make reasonable efforts to communicate
                significant outages in a timely manner.
              </p>
            </Section>

            <Section title="Intellectual property">
              <p>
                Fyxvo owns all rights in the platform, including the web
                application, API, gateway software, on-chain programs, brand
                assets, and documentation. Nothing in these terms transfers
                ownership of Fyxvo intellectual property to you.
              </p>
              <p>
                You own your data. The request logs, project configurations, and
                API key metadata associated with your account belong to you.
                Fyxvo processes this data to provide the service, not to
                commercialize it. You may request deletion of your data at any
                time as described in the privacy policy.
              </p>
            </Section>

            <Section title="Liability limitations">
              <p>
                Fyxvo is alpha software. To the maximum extent permitted by
                applicable law, Fyxvo is provided without warranty of any kind,
                express or implied, including but not limited to warranties of
                merchantability, fitness for a particular purpose, and
                non-infringement.
              </p>
              <p>
                In no event shall Fyxvo or its contributors be liable for any
                direct, indirect, incidental, special, exemplary, or consequential
                damages arising out of or in connection with your use of the
                platform, even if advised of the possibility of such damages. This
                includes loss of data, loss of access, or any on-chain state
                changes resulting from platform operations.
              </p>
            </Section>

            <Section title="Changes to these terms">
              <p>
                Fyxvo may update these terms at any time. When terms are updated,
                the effective date at the top of this page will be changed.
                Continued use of the platform after an update constitutes
                acceptance of the revised terms.
              </p>
              <p>
                For material changes, we will make reasonable efforts to notify
                users through the platform dashboard or via email if you have
                provided one.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions about these terms can be sent to{" "}
                <a
                  href="mailto:security@fyxvo.com"
                  className="text-[#f97316] hover:underline"
                >
                  security@fyxvo.com
                </a>
                .
              </p>
            </Section>
          </div>
        </div>
      </div>
    </main>
  );
}
