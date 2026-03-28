import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Fyxvo",
  description:
    "Fyxvo's privacy policy: what data we collect, how wallet addresses are handled, log retention, cookies, third-party services, and how to request deletion.",
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

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="mt-5 text-sm text-[#64748b]">
              Effective date: January 1, 2026
            </p>
            <p className="mt-4 text-base leading-7 text-[#64748b]">
              This policy describes what information Fyxvo collects when you use
              the platform, how that information is used, and what controls you
              have over it. Fyxvo is a devnet alpha product; the data practices
              described here reflect that stage.
            </p>
          </div>

          <div className="space-y-12">
            <Section title="What we collect">
              <p>
                Fyxvo collects three categories of information from users:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-[#f1f5f9]">Wallet addresses</strong> —
                  your public Solana wallet address, collected when you
                  authenticate. Wallet addresses are public by design on Solana
                  and carry no personally identifying information on their own.
                </li>
                <li>
                  <strong className="text-[#f1f5f9]">Request logs</strong> —
                  per-request metadata including the RPC method name, timestamp,
                  HTTP status code, and response latency in milliseconds. The
                  content of RPC request parameters is not stored.
                </li>
                <li>
                  <strong className="text-[#f1f5f9]">Email address</strong> —
                  collected optionally if you subscribe to the newsletter or
                  enable email notifications in settings. Providing an email is
                  not required to use the platform.
                </li>
              </ul>
            </Section>

            <Section title="Wallet address handling">
              <p>
                Your wallet address is used exclusively to authenticate you to the
                platform and to associate projects and API keys with your account.
                Wallet addresses are not sold, shared with third parties, or used
                for any purpose outside the Fyxvo platform.
              </p>
              <p>
                Because wallet addresses are public on the Solana blockchain, their
                association with your Fyxvo account does not constitute a privacy
                risk in the traditional sense. However, Fyxvo does not publish or
                expose your wallet address to other users of the platform without
                your explicit action, such as sharing an invite link.
              </p>
            </Section>

            <Section title="Request log retention">
              <p>
                Request logs — method, timestamp, status code, latency — are
                retained for 90 days and then automatically deleted. Logs are used
                to power the analytics dashboard, calculate per-project request
                counts, and support the Fyxvo team in diagnosing infrastructure
                issues.
              </p>
              <p>
                Request logs are keyed to project IDs, not to real-world
                identities. They are not cross-referenced against external
                datasets and are not used for advertising or behavioral profiling.
              </p>
            </Section>

            <Section title="Email">
              <p>
                If you provide an email address, it is used only for the following
                purposes: sending the Fyxvo newsletter, delivering transactional
                notifications you have opted into (such as funding confirmations or
                project alerts), and verifying your contact for account recovery
                purposes.
              </p>
              <p>
                You can unsubscribe from the newsletter at any time using the link
                at the bottom of any newsletter email. You can remove your email
                address from your account in the settings page. Fyxvo does not
                share email addresses with third parties for marketing purposes.
              </p>
            </Section>

            <Section title="Cookies and local storage">
              <p>
                Fyxvo does not use third-party tracking cookies or advertising
                cookies. The following data is stored in your browser's local
                storage by the Fyxvo web application:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-[#f1f5f9]">Session token</strong> — a
                  JWT containing your wallet address and session metadata, stored
                  under the key <code className="text-[#f1f5f9]">fyxvo.web.session</code>.
                  Cleared when you disconnect your wallet.
                </li>
                <li>
                  <strong className="text-[#f1f5f9]">Theme preference</strong> —
                  your selected light or dark theme, stored under the key{" "}
                  <code className="text-[#f1f5f9]">fyxvo-theme</code>. Persists
                  indefinitely until cleared.
                </li>
                <li>
                  <strong className="text-[#f1f5f9]">Selected project</strong> —
                  the ID of the last project you selected in the dashboard, stored
                  under the key{" "}
                  <code className="text-[#f1f5f9]">fyxvo.web.project</code>.
                  Cleared when you disconnect.
                </li>
              </ul>
              <p>
                Vercel, which hosts the Fyxvo web application, may set technical
                deployment cookies necessary for routing and edge caching. These
                cookies are not used for tracking and do not carry personally
                identifying information.
              </p>
            </Section>

            <Section title="Third-party services">
              <p>
                Fyxvo uses the following third-party services in the operation of
                the platform:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-[#f1f5f9]">Vercel</strong> — hosts the
                  web application. Vercel may process request metadata (IP
                  addresses, user agents) for edge routing and DDoS protection
                  purposes. See the{" "}
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#f97316] hover:underline"
                  >
                    Vercel Privacy Policy
                  </a>
                  .
                </li>
                <li>
                  <strong className="text-[#f1f5f9]">Railway</strong> — hosts the
                  backend API and gateway. Railway processes server-to-server
                  traffic. No PII is transmitted to Railway beyond what is
                  inherent in IP-level routing.
                </li>
                <li>
                  <strong className="text-[#f1f5f9]">CoinGecko</strong> — used to
                  fetch the current SOL/USD price for display purposes only. No
                  personally identifying information is sent to CoinGecko.
                </li>
              </ul>
            </Section>

            <Section title="Deletion requests">
              <p>
                You can request deletion of data associated with your account at
                any time by emailing{" "}
                <a
                  href="mailto:security@fyxvo.com"
                  className="text-[#f97316] hover:underline"
                >
                  security@fyxvo.com
                </a>{" "}
                with the subject line <em>Data deletion request</em> and your
                wallet address. We will process deletion requests within 30 days.
              </p>
              <p>
                Deletion removes your wallet address, email (if provided), project
                records, API keys, and request logs from our systems. On-chain
                project state on Solana is immutable and cannot be deleted.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                For questions about this privacy policy, contact{" "}
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
