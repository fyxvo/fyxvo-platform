import type { Metadata } from "next";
import Link from "next/link";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: "Terms of Service — Fyxvo",
  description:
    "Terms governing use of the Fyxvo devnet private alpha infrastructure platform.",
  alternates: {
    canonical: `${webEnv.siteUrl}/terms`,
  },
  openGraph: {
    title: "Terms of Service — Fyxvo",
    description:
      "Terms governing use of the Fyxvo devnet private alpha infrastructure platform.",
    url: `${webEnv.siteUrl}/terms`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service — Fyxvo",
    description:
      "Terms governing use of the Fyxvo devnet private alpha infrastructure platform.",
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

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
          Legal
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
          Last updated: March 2026. These terms govern your use of the Fyxvo
          devnet private alpha platform. By using any part of the platform,
          including the web interface at fyxvo.com, the API at api.fyxvo.com,
          or the relay gateway at rpc.fyxvo.com, you agree to these terms.
        </p>

        <div className="mt-6 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
          <p className="text-sm font-semibold text-[var(--fyxvo-text)]">
            Private alpha — please read carefully
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--fyxvo-text-muted)]">
            Fyxvo is a private alpha running exclusively on Solana devnet. There
            is no service level agreement, no uptime guarantee, and no warranty
            of any kind. This is an environment for evaluation and development,
            not for production workloads of any kind.
          </p>
        </div>
      </div>

      <div className="space-y-10">
        <PolicySection title="Platform status">
          <p>
            Fyxvo is developer infrastructure for Solana devnet. It provides
            wallet-authenticated project controls, on-chain funded JSON-RPC
            relay, priority relay, request analytics, and managed operator
            infrastructure. The platform is currently in a private alpha stage.
            Features, pricing structures, data formats, and access policies can
            change at any time without prior notice.
          </p>
          <p>
            The platform operates exclusively on Solana devnet. There is no
            mainnet deployment at this time. Devnet is a test environment
            maintained by the Solana Foundation, and it can experience resets,
            instability, or extended downtime for reasons entirely outside
            Fyxvo's control. The service is provided as-is, with no implied
            warranties of merchantability, fitness for a particular purpose, or
            uninterrupted availability.
          </p>
        </PolicySection>

        <PolicySection title="Acceptable use">
          <p>
            Fyxvo is intended for legitimate Solana development, integration
            testing, and infrastructure evaluation. You agree to use the platform
            only for those purposes. You may not use the platform to send
            malicious, abusive, or artificially inflated request traffic. You may
            not attempt to circumvent rate limiting, scope enforcement, or
            balance checks by any technical means. You may not reverse-engineer
            or attempt to extract non-public infrastructure details, routing
            logic, or internal API behavior.
          </p>
          <p>
            API keys are project-scoped credentials intended for your own use.
            You may not redistribute, resell, or sublicense access to the relay
            gateway through API keys assigned to your projects. Each key should
            be held and used by the team that owns the project. If you become
            aware that a key has been exposed or misused, you are responsible for
            revoking it promptly.
          </p>
          <p>
            Violations of these acceptable use terms may result in immediate
            suspension or termination of access without notice. We reserve the
            right to make that determination at our discretion.
          </p>
        </PolicySection>

        <PolicySection title="On-chain funding terms">
          <p>
            All funding on the Fyxvo platform uses Solana devnet SOL. Devnet SOL
            has no monetary value. It is obtainable from public faucets at no
            cost and exists solely as a test token for development purposes.
            Fyxvo does not sell devnet SOL, does not charge money for devnet
            access, and makes no representation that devnet SOL has or will have
            any monetary value.
          </p>
          <p>
            When you fund a project treasury, you sign and submit a Solana
            transaction from your wallet. That transaction is irreversible once
            confirmed on-chain. The API verifies the confirmed transaction
            signature and credits your project's spendable balance accordingly.
            Consumed credits are deducted as relay requests are processed. There
            are no refunds for consumed devnet credits because there is nothing
            of monetary value to refund.
          </p>
          <p>
            A separate terms document governing real funding, fees, and refund
            policies will be published before any mainnet deployment. These terms
            apply exclusively to devnet usage.
          </p>
        </PolicySection>

        <PolicySection title="API key usage">
          <p>
            API keys are project-scoped credentials that grant relay access
            within the bounds of the scopes assigned at creation time. Each key
            can be scoped to standard RPC relay, priority relay, or both. You
            are responsible for keeping your API keys confidential and for
            assigning the narrowest scopes that satisfy your use case.
          </p>
          <p>
            Keys may be revoked by you at any time from the project dashboard.
            Fyxvo may also revoke keys at its discretion if it detects abuse,
            policy violations, or suspicious activity. A revoked key is rejected
            immediately at the gateway. Keys are not for sharing with third
            parties, reselling, or embedding in publicly accessible code
            repositories. If a key is exposed, revoke it and generate a new one.
          </p>
        </PolicySection>

        <PolicySection title="Service availability">
          <p>
            During the private alpha, Fyxvo operates on a best-effort basis.
            There is no formal uptime commitment and no service level agreement.
            We work to keep the gateway and API available, and we monitor health
            continuously, but we cannot guarantee uninterrupted operation on
            devnet infrastructure.
          </p>
          <p>
            Platform status, incidents, and maintenance notices are published at{" "}
            <Link
              href="/status"
              className="text-[var(--fyxvo-brand)] hover:underline"
            >
              fyxvo.com/status
            </Link>
            . We post updates there when incidents are open and when they are
            resolved. There is no formal SLA-backed notification process during
            the alpha.
          </p>
        </PolicySection>

        <PolicySection title="Limitation of liability">
          <p>
            To the fullest extent permitted by applicable law, Fyxvo and its
            contributors disclaim all warranties, express or implied, including
            warranties of merchantability, fitness for a particular purpose, and
            non-infringement. The platform is provided as-is and as-available
            without any representation that it will meet your requirements or
            operate without interruption.
          </p>
          <p>
            In no event will Fyxvo or its contributors be liable for any
            indirect, incidental, special, consequential, or punitive damages
            arising from your use of or inability to use the platform. This
            includes but is not limited to loss of devnet credits, loss of data,
            service interruptions, or errors caused by Solana devnet instability.
            Because devnet tokens have no monetary value, claims for financial
            compensation arising from devnet activity have no basis. You use this
            platform at your own risk.
          </p>
        </PolicySection>

        <PolicySection title="Governing terms">
          <p>
            These terms may be updated at any time. The date at the top of this
            page reflects the most recent revision. When significant changes are
            made, we will announce them through our community channels and the
            status page. Continued use of the platform after a revision is
            published constitutes acceptance of the updated terms.
          </p>
          <p>
            If any provision of these terms is found to be unenforceable by a
            court of competent jurisdiction, the remaining provisions will
            continue in full force. These terms represent the complete agreement
            between you and Fyxvo with respect to use of the private alpha
            platform.
          </p>
        </PolicySection>

        <PolicySection title="Contact for legal questions">
          <p>
            If you have questions about these terms or wish to raise a legal
            matter, you can reach us at{" "}
            <a
              href="mailto:legal@fyxvo.com"
              className="text-[var(--fyxvo-brand)] hover:underline"
            >
              legal@fyxvo.com
            </a>
            . For general support and product questions, use the{" "}
            <Link
              href="/contact"
              className="text-[var(--fyxvo-brand)] hover:underline"
            >
              contact page
            </Link>
            .
          </p>
        </PolicySection>
      </div>
    </div>
  );
}
