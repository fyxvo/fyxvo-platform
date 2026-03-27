import type { Metadata } from "next";
import Link from "next/link";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: "Privacy Policy — Fyxvo",
  description:
    "How Fyxvo collects, stores, and protects your data while you use the devnet private alpha platform.",
  alternates: {
    canonical: `${webEnv.siteUrl}/privacy`,
  },
  openGraph: {
    title: "Privacy Policy — Fyxvo",
    description:
      "How Fyxvo collects, stores, and protects your data while you use the devnet private alpha platform.",
    url: `${webEnv.siteUrl}/privacy`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy — Fyxvo",
    description:
      "How Fyxvo collects, stores, and protects your data while you use the devnet private alpha platform.",
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

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
          Legal
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
          Last updated: March 2026. This policy describes how Fyxvo handles your
          data during the current devnet private alpha. As the platform matures
          and approaches mainnet, this policy will be revised to reflect any
          changes in scope, storage, or data practices.
        </p>
      </div>

      <div className="space-y-10">
        <PolicySection title="What data is collected">
          <p>
            When you connect a Solana wallet to Fyxvo, we store your public
            wallet address. This is the primary identifier for your account and
            everything tied to it: your projects, API keys, funding history, and
            session tokens. We never request your private key or seed phrase, and
            we have no mechanism to access or store them.
          </p>
          <p>
            If you submit an interest form or contact form, we collect whatever
            you provide in that form, which may include an email address, team
            name, use case description, and message text. We use that information
            to follow up with you directly and to inform product decisions. We do
            not add submitted email addresses to any marketing list unless you
            explicitly request it.
          </p>
          <p>
            We collect lightweight first-party product analytics events such as
            page visits, wallet connection attempts, project creation steps, and
            funding flow interactions. These events are sent to our own
            infrastructure. There are no third-party analytics scripts or
            tracking pixels on the platform.
          </p>
        </PolicySection>

        <PolicySection title="How data is stored">
          <p>
            Account data, project records, API key metadata, and request
            analytics are stored in our control plane database, which runs on
            managed infrastructure. The API backend is hosted on Railway and the
            frontend on Vercel. Both providers operate their own logging and
            request metadata pipelines at the infrastructure level, subject to
            their respective privacy policies.
          </p>
          <p>
            We retain account data, project records, and API key metadata for as
            long as your account is active. Request logs follow a rolling 30-day
            retention window: logs older than 30 days are purged automatically.
            Interest and feedback form submissions are retained indefinitely so
            we can reference them during product development, but they are only
            accessible to the Fyxvo team.
          </p>
          <p>
            We do not store the body content of JSON-RPC requests that pass
            through the relay gateway. Only routing metadata is logged: the
            timestamp, method, route, HTTP status code, response latency, and
            the project identifier associated with the API key used.
          </p>
        </PolicySection>

        <PolicySection title="How wallet addresses are handled">
          <p>
            Your public wallet address is already visible on the Solana
            blockchain. Within Fyxvo, it functions as a pseudonymous identifier.
            We use it to authenticate your session via a signed challenge,
            associate your projects and API keys with your account, and attribute
            funding transactions to the correct project treasury. We do not sell
            wallet addresses, share them with advertising networks, or
            cross-reference them with third-party identity services.
          </p>
          <p>
            Wallet addresses may appear in internal audit logs and administrative
            tooling so the Fyxvo team can investigate potential fraud, rate-limit
            abuse, or governance issues. Other users on the platform cannot see
            your wallet address. Publicly visible project pages, if you opt into
            them, show only your project name and aggregated request statistics,
            not your wallet address.
          </p>
        </PolicySection>

        <PolicySection title="Request log retention">
          <p>
            Every request that flows through the relay gateway generates a log
            entry containing the timestamp, RPC method, route, HTTP status code,
            response latency, and the project identifier of the API key that was
            used. Logs are associated with the project, not directly with your
            personal identity beyond the project ownership link. These logs power
            the analytics dashboard and are used for billing reconciliation,
            rate-limit enforcement, and operator health monitoring.
          </p>
          <p>
            Request logs are kept on a 30-day rolling window. Entries older than
            30 days are deleted automatically. Aggregate statistics derived from
            those logs, such as daily request counts and average latency, may be
            retained longer to support historical analytics views, but they
            contain no individually identifiable routing data.
          </p>
        </PolicySection>

        <PolicySection title="On-chain transactions">
          <p>
            Fyxvo is built on Solana devnet. When you activate a project or fund
            its treasury, those transactions are submitted to the Solana devnet
            blockchain and are permanently public. Anyone can look up your
            wallet's transaction history on a Solana block explorer and see those
            interactions. This is an inherent property of public blockchains and
            is not specific to Fyxvo.
          </p>
          <p>
            The Fyxvo program ID is{" "}
            <span className="font-mono text-sm text-[var(--fyxvo-text)]">
              Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc
            </span>
            . Project program-derived addresses are derived from your wallet and
            the project name, and these PDAs are also permanently on-chain. We
            cannot remove on-chain data. Neither can you. That is how blockchains
            work.
          </p>
        </PolicySection>

        <PolicySection title="Cookies and local storage">
          <p>
            Fyxvo uses browser local storage rather than traditional HTTP cookies
            for client-side persistence. The items stored are: your theme
            preference under{" "}
            <span className="font-mono text-sm text-[var(--fyxvo-text)]">
              fyxvo.web.theme
            </span>
            , your wallet session JWT under{" "}
            <span className="font-mono text-sm text-[var(--fyxvo-text)]">
              fyxvo.web.session
            </span>
            , and your selected project ID under{" "}
            <span className="font-mono text-sm text-[var(--fyxvo-text)]">
              fyxvo.web.project
            </span>
            . These items exist for functional necessity only. We do not use them
            to track your behavior across sessions or other websites.
          </p>
          <p>
            You can clear all Fyxvo local storage at any time through your
            browser's developer tools, or you can disconnect your wallet using
            the navigation controls in the app, which clears the session token.
            Clearing local storage does not delete your account data on our
            servers. For a full account deletion, see the user rights section
            below. Our full cookie and storage policy is available at{" "}
            <Link
              href="/cookies"
              className="text-[var(--fyxvo-brand)] hover:underline"
            >
              fyxvo.com/cookies
            </Link>
            .
          </p>
        </PolicySection>

        <PolicySection title="Third-party services">
          <p>
            Vercel hosts the Fyxvo frontend and handles edge delivery. Vercel may
            log request metadata such as IP addresses and request paths as part
            of their infrastructure operations. You can read about their data
            practices at{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--fyxvo-brand)] hover:underline"
            >
              vercel.com/legal/privacy-policy
            </a>
            .
          </p>
          <p>
            Railway hosts the API and gateway backends. Railway may log
            container-level request metadata for operational purposes. Solana
            devnet is a public blockchain maintained by the Solana Foundation.
            All on-chain transactions and program-derived addresses are
            permanently public by the nature of the network. CoinGecko is used
            to fetch live SOL price data for display on the pricing page. No
            personal data is sent to CoinGecko.
          </p>
          <p>
            We do not use advertising networks, social media tracking pixels,
            third-party analytics services such as Google Analytics or Mixpanel,
            or any identity resolution services. All product analytics are
            first-party and flow through our own infrastructure.
          </p>
        </PolicySection>

        <PolicySection title="Your rights and deletion requests">
          <p>
            You can request a copy of all data associated with your wallet
            address. You can request deletion of your account data, including
            your projects, API keys, request logs, and any form submissions
            linked to your email. Deletion requests are handled manually during
            the private alpha, and we aim to respond within five business days.
          </p>
          <p>
            To submit a request, send an email to{" "}
            <a
              href="mailto:privacy@fyxvo.com"
              className="text-[var(--fyxvo-brand)] hover:underline"
            >
              privacy@fyxvo.com
            </a>{" "}
            or use the{" "}
            <Link
              href="/contact"
              className="text-[var(--fyxvo-brand)] hover:underline"
            >
              contact page
            </Link>
            . Please include the wallet address associated with your account so
            we can locate your records accurately. Note that on-chain data, such
            as transactions and program-derived addresses, cannot be removed. It
            exists on the public Solana ledger and is outside our control.
          </p>
        </PolicySection>

        <PolicySection title="Changes to this policy">
          <p>
            We may update this policy as the platform evolves. The date at the
            top of this page will always reflect the most recent revision. If we
            make a material change, we will announce it through our community
            channels and the status page. Continued use of the platform after a
            revision constitutes acceptance of the updated policy.
          </p>
          <p>
            Questions about this policy can be directed to{" "}
            <a
              href="mailto:privacy@fyxvo.com"
              className="text-[var(--fyxvo-brand)] hover:underline"
            >
              privacy@fyxvo.com
            </a>
            .
          </p>
        </PolicySection>
      </div>
    </div>
  );
}
