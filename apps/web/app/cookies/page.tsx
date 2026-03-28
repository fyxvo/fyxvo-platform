import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookies and Storage Policy — Fyxvo",
  description:
    "Fyxvo's cookies and local storage policy: what is stored in your browser, why, and how to clear it.",
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

export default function CookiesPage() {
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
              Cookies and Storage Policy
            </h1>
            <p className="mt-5 text-base leading-7 text-[#64748b]">
              Fyxvo uses browser local storage to maintain your session, theme
              preference, and last-selected project. This page describes exactly
              what is stored, why, and how to clear it. Fyxvo does not use
              third-party tracking cookies or advertising cookies.
            </p>
          </div>

          <div className="space-y-12">
            <Section title="What we store locally">
              <p>
                The following entries are written to your browser's{" "}
                <code className="text-[#f1f5f9]">localStorage</code> by the Fyxvo
                web application:
              </p>

              <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                <table className="w-full min-w-[540px] text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="px-4 py-3 text-left font-medium text-[#f1f5f9]">Key</th>
                      <th className="px-4 py-3 text-left font-medium text-[#f1f5f9]">Storage</th>
                      <th className="px-4 py-3 text-left font-medium text-[#f1f5f9]">Contents</th>
                      <th className="px-4 py-3 text-left font-medium text-[#f1f5f9]">Lifetime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    <tr>
                      <td className="px-4 py-3">
                        <code className="text-[#f97316]">fyxvo.web.session</code>
                      </td>
                      <td className="px-4 py-3 text-[#64748b]">localStorage</td>
                      <td className="px-4 py-3 text-[#64748b]">JWT token and user info</td>
                      <td className="px-4 py-3 text-[#64748b]">Cleared on disconnect</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">
                        <code className="text-[#f97316]">fyxvo-theme</code>
                      </td>
                      <td className="px-4 py-3 text-[#64748b]">localStorage</td>
                      <td className="px-4 py-3 text-[#64748b]">Light or dark preference</td>
                      <td className="px-4 py-3 text-[#64748b]">Persists indefinitely</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">
                        <code className="text-[#f97316]">fyxvo.web.project</code>
                      </td>
                      <td className="px-4 py-3 text-[#64748b]">localStorage</td>
                      <td className="px-4 py-3 text-[#64748b]">Last selected project ID</td>
                      <td className="px-4 py-3 text-[#64748b]">Cleared on disconnect</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                None of these entries are shared with third parties or transmitted
                to external services beyond the Fyxvo API during normal platform
                operation.
              </p>
            </Section>

            <Section title="Cookies">
              <p>
                Fyxvo itself does not set any browser cookies for authentication,
                session management, or preference storage. The web application
                uses localStorage exclusively for the entries described above.
              </p>
              <p>
                Vercel, which hosts the Fyxvo web application, may set technical
                deployment cookies required for edge routing, A/B deployment
                targeting, and DDoS protection. These cookies are set and
                controlled by Vercel infrastructure, contain no personally
                identifying information, and are not used by Fyxvo for any
                application-level purpose.
              </p>
            </Section>

            <Section title="Third-party cookies">
              <p>
                Fyxvo does not load any third-party analytics scripts, advertising
                networks, or social media widgets that would set cookies from
                external domains. There are no Google Analytics, Meta Pixel,
                LinkedIn Insight Tag, or similar tracking integrations on any
                Fyxvo page.
              </p>
              <p>
                Vercel's edge infrastructure may set its own technical cookies as
                part of CDN operation. These are technical in nature and are
                governed by the{" "}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f97316] hover:underline"
                >
                  Vercel Privacy Policy
                </a>
                .
              </p>
            </Section>

            <Section title="Managing storage">
              <p>
                You can inspect and clear all Fyxvo localStorage entries using
                your browser's developer tools:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  In Chrome or Edge: open DevTools (F12 or Cmd+Option+I), go to
                  the <strong className="text-[#f1f5f9]">Application</strong> tab,
                  expand <strong className="text-[#f1f5f9]">Local Storage</strong>,
                  and select the Fyxvo origin.
                </li>
                <li>
                  In Firefox: open DevTools, go to the{" "}
                  <strong className="text-[#f1f5f9]">Storage</strong> tab, expand{" "}
                  <strong className="text-[#f1f5f9]">Local Storage</strong>, and
                  select the Fyxvo origin.
                </li>
                <li>
                  In Safari: open Web Inspector, go to the{" "}
                  <strong className="text-[#f1f5f9]">Storage</strong> tab, and
                  select Local Storage.
                </li>
              </ul>
              <p>
                Clearing localStorage entries from the Fyxvo origin will sign you
                out and reset your theme preference. It does not delete your
                account, projects, API keys, or any server-side data. Those remain
                intact and accessible the next time you connect your wallet.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions about this policy can be sent to{" "}
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
