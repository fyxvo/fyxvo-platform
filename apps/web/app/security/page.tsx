import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security — Fyxvo",
  description:
    "Fyxvo's security posture during the devnet alpha: disclosure policy, secrets handling, what has not been audited, and how to report vulnerabilities.",
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

export default function SecurityPage() {
  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "#0a0a0f" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl py-20">
          {/* Hero */}
          <div className="mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#f97316]">
              Security
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#f1f5f9] sm:text-5xl">
              Security at Fyxvo
            </h1>
            <p className="mt-5 text-base leading-7 text-[#64748b]">
              Fyxvo is a devnet alpha. This page documents the security controls in
              place today, how sensitive material is handled, what has not yet been
              formally audited, and how to reach the team when you find something
              worth reporting. We believe honest transparency about our current
              security posture is more useful than aspirational claims.
            </p>
          </div>

          <div className="space-y-12">
            <Section title="Disclosure policy">
              <p>
                If you discover a potential vulnerability in Fyxvo — whether in the
                API, the gateway relay, the Solana program, or the web application —
                please contact us before publishing any details. Send a description
                of the issue to{" "}
                <a
                  href="mailto:security@fyxvo.com"
                  className="text-[#f97316] hover:underline"
                >
                  security@fyxvo.com
                </a>
                . We ask for a reasonable investigation window, typically five to
                ten business days, before any public disclosure.
              </p>
              <p>
                Our full responsible disclosure policy is documented in{" "}
                <a
                  href="https://github.com/fyxvo/fyxvo-platform/blob/main/SECURITY.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f97316] hover:underline"
                >
                  SECURITY.md
                </a>{" "}
                on GitHub. That file is the canonical reference for timelines,
                scope, and acknowledgment expectations.
              </p>
              <p>
                We do not currently offer a formal bug bounty program, but we
                genuinely appreciate responsible disclosures and will acknowledge
                them publicly if you wish.
              </p>
            </Section>

            <Section title="What we protect">
              <p>
                Authentication on Fyxvo is wallet-based. The server issues a signed
                challenge, your wallet extension signs it, and the signature is
                verified before a JWT session token is minted. There are no
                passwords. The JWT has a fixed expiry and is validated on every
                authenticated request.
              </p>
              <p>
                Project access is controlled through scoped API keys. Each key
                carries explicit permission scopes — standard relay, priority relay,
                or both. The gateway enforces these scopes on every inbound request
                before any routing occurs. Keys can be revoked instantly from the
                dashboard, and revocation propagates immediately.
              </p>
              <p>
                Wallet private keys never leave your device. Fyxvo requests a
                signature for a server-issued challenge string; the private key
                itself is never transmitted, never requested, and never stored.
                Solana on-chain transactions such as project funding are also signed
                entirely within your wallet extension before being broadcast.
              </p>
            </Section>

            <Section title="Secrets handling">
              <p>
                API keys are hashed before storage using a one-way function. The
                full key value is displayed to you exactly once at creation time.
                After that moment, neither you nor Fyxvo can recover the plaintext
                value — only the hash is retained server-side. This means that if
                you lose the key, a new one must be generated.
              </p>
              <p>
                JWTs are signed with a secret held in managed runtime configuration.
                No signing secrets are committed to source control. The only
                environment variables that reach the browser are those explicitly
                prefixed with <code className="text-[#f1f5f9]">NEXT_PUBLIC_</code>,
                which contain non-sensitive values such as the site URL, API base
                URL, and Solana cluster name.
              </p>
              <p>
                Backend secrets — database connection strings, JWT signing keys,
                admin credentials — are managed through Railway's encrypted secrets
                manager and are never included in client bundles, repository
                history, or build artifacts.
              </p>
            </Section>

            <Section title="What has not been audited">
              <p>
                The Fyxvo Solana program has not undergone a formal third-party
                security audit. It runs under a staged governance model with
                explicit authority roles for protocol configuration, treasury
                management, and upgrade decisions, but that governance structure
                itself has not been independently reviewed. The program is deployed
                to devnet only.
              </p>
              <p>
                The full API and gateway stack has not received an external
                penetration test or code audit. The platform is in private alpha,
                and the scope of review reflects that stage. There is no bug bounty
                program at this time. The infrastructure runs on a single managed
                operator topology, which has not been stress-tested under
                adversarial load conditions. These are known gaps, not oversights,
                and will be addressed before any mainnet deployment.
              </p>
            </Section>

            <Section title="Dependency hygiene">
              <p>
                Direct and transitive dependencies are scanned automatically on
                every pull request and on a nightly schedule using GitHub's
                dependency graph and Dependabot alerts. High and critical severity
                advisories are addressed before merging to the main branch.
              </p>
              <p>
                Lockfiles are committed to the repository and validated as part of
                CI. Any discrepancy between the lockfile and installed packages
                causes the build to fail, preventing supply-chain substitution
                attacks. Package integrity is verified against the registry on
                install.
              </p>
            </Section>

            <Section title="Reporting a vulnerability">
              <p>
                To report a security issue, follow these steps:
              </p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Email{" "}
                  <a
                    href="mailto:security@fyxvo.com"
                    className="text-[#f97316] hover:underline"
                  >
                    security@fyxvo.com
                  </a>{" "}
                  with a subject line beginning with <em>Security:</em>.
                </li>
                <li>
                  Describe the issue clearly: what you found, how to reproduce it,
                  and what impact you believe it could have.
                </li>
                <li>
                  Include any proof-of-concept steps, screenshots, or request/response
                  examples that help illustrate the issue.
                </li>
                <li>
                  Do not publish or share the vulnerability details publicly until
                  we have had a chance to investigate and respond.
                </li>
                <li>
                  We will acknowledge receipt within 48 hours and provide an
                  estimated resolution timeline.
                </li>
              </ol>
              <p>
                For non-security bugs or general questions, use the standard support
                channels rather than the security address.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </main>
  );
}
