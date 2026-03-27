import type { Metadata } from "next";
import Link from "next/link";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: "Security — Fyxvo",
  description:
    "Fyxvo's security posture during the devnet private alpha: what is in place, how secrets are handled, what has not been audited, and how to report vulnerabilities.",
  alternates: {
    canonical: `${webEnv.siteUrl}/security`,
  },
  openGraph: {
    title: "Security — Fyxvo",
    description:
      "Fyxvo's security posture during the devnet private alpha: what is in place, how secrets are handled, what has not been audited, and how to report vulnerabilities.",
    url: `${webEnv.siteUrl}/security`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Security — Fyxvo",
    description:
      "Fyxvo's security posture during the devnet private alpha: what is in place, how secrets are handled, what has not been audited, and how to report vulnerabilities.",
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

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
          Security
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-5xl">
          Security posture
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
          Fyxvo is a devnet private alpha. This page describes what security
          controls are in place today, how sensitive material is handled, where
          the boundaries of current review sit, and how to reach the team if you
          find something worth reporting.
        </p>
      </div>

      <div className="space-y-10">
        <PolicySection title="What is in place">
          <p>
            Authentication on Fyxvo is wallet-based. When you sign in, the
            server issues a signed challenge, your wallet extension signs it, and
            the signature is verified server-side before a JWT session token is
            issued. There are no passwords. The JWT has a fixed expiry and is
            validated on every authenticated request. No admin credentials are
            exposed in the frontend.
          </p>
          <p>
            Gateway access is controlled through project-scoped API keys.
            Each key carries explicit scopes, either standard relay, priority
            relay, or both. The gateway enforces scope on every request before
            routing it. Keys can be revoked instantly from the dashboard, and
            revocation takes effect at the gateway immediately. Server-side
            request validation runs before any relay routing occurs.
          </p>
          <p>
            Content Security Policy headers are set on all pages, rate limiting
            is enforced on all API and gateway endpoints, and request logs are
            captured so the team can investigate anomalies. The relay gateway
            validates that webhook URLs and outbound targets do not resolve to
            internal or private network addresses, which reduces SSRF exposure.
          </p>
        </PolicySection>

        <PolicySection title="How secrets are handled">
          <p>
            API keys are hashed before storage. The full key value is shown to
            you exactly once at creation. After that moment, neither you nor
            Fyxvo can recover it, and only the hash is retained server-side.
            JWTs are signed server-side using a key held in managed runtime
            configuration. No signing secrets are committed to source control or
            exposed to the browser.
          </p>
          <p>
            Wallet private keys never leave your device. Fyxvo's authentication
            flow requests a signature from your wallet extension for a
            server-issued challenge, and that signature is what gets sent to the
            API. The private key itself is never transmitted, never requested,
            and never stored. Solana transactions such as project funding are
            also signed entirely within your wallet extension before being
            submitted to the network.
          </p>
          <p>
            Environment variables containing sensitive material are managed in
            server-side runtime configuration. The only environment variables
            exposed to the browser are those explicitly prefixed with
            NEXT_PUBLIC_, which contain non-sensitive values such as the site
            URL, API base URL, and Solana cluster identifier. No credentials,
            signing keys, or database connection strings are exposed client-side.
          </p>
        </PolicySection>

        <PolicySection title="What has not been audited">
          <p>
            The Fyxvo Solana program has not undergone a formal third-party
            security audit. The program ID is{" "}
            <span className="font-mono text-sm text-[var(--fyxvo-text)]">
              Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc
            </span>
            . It runs under a staged governance model with explicit authority
            roles for protocol configuration, treasury, and upgrade decisions,
            but that governance structure itself has not been independently
            reviewed.
          </p>
          <p>
            The full API and gateway stack has not received a formal external
            penetration test or code audit. The platform is in private alpha, and
            the scope of review reflects that stage. There is currently no bug
            bounty program. The infrastructure runs on a single managed operator
            topology, which means it has not been tested at scale or under
            adversarial load conditions. These are known gaps, not oversights,
            and they will be addressed before any mainnet deployment.
          </p>
        </PolicySection>

        <PolicySection title="Current stage">
          <p>
            This is a private devnet alpha. The security posture described here
            is appropriate for that stage: real controls are in place, but the
            platform has not gone through the audit and hardening process that
            mainnet infrastructure requires. Devnet tokens have no monetary
            value, which limits the financial risk surface during this period.
          </p>
          <p>
            Before any mainnet deployment, a full audit of the Solana program and
            the API layer will be required. Governance structures will be
            hardened, the operator topology will be stress-tested, and the
            security posture will be re-evaluated in full. We will publish the
            results of that process publicly.
          </p>
          <p>
            If you find a potential vulnerability or security issue, please reach
            out to{" "}
            <a
              href="mailto:security@fyxvo.com"
              className="text-[var(--fyxvo-brand)] hover:underline"
            >
              security@fyxvo.com
            </a>{" "}
            before publishing any details. We ask for a reasonable window to
            investigate and respond. Our responsible disclosure policy is
            documented in{" "}
            <Link
              href="https://github.com/fyxvo/fyxvo-platform/blob/main/SECURITY.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--fyxvo-brand)] hover:underline"
            >
              SECURITY.md on GitHub
            </Link>
            .
          </p>
        </PolicySection>
      </div>
    </div>
  );
}
