import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "What cookies and local storage Fyxvo uses and how to manage them.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
        {children}
      </CardContent>
    </Card>
  );
}

function StorageRow({ name, type, purpose, duration }: {
  name: string;
  type: string;
  purpose: string;
  duration: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="font-mono text-sm font-medium text-[var(--fyxvo-text)]">{name}</span>
        <span className="rounded-full border border-[var(--fyxvo-border)] px-2.5 py-0.5 text-xs text-[var(--fyxvo-text-muted)]">
          {type}
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--fyxvo-text-soft)]">{purpose}</p>
      <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">Duration: {duration}</p>
    </div>
  );
}

export default function CookiesPage() {
  const effectiveDate = "March 19, 2026";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <PageHeader
        eyebrow="Legal"
        title="Cookie Policy"
        description={`Effective date: ${effectiveDate}. This policy explains what cookies and local storage Fyxvo uses, and how you can manage them.`}
      />

      <Notice tone="neutral" title="Minimal tracking">
        Fyxvo does not use advertising cookies, third-party tracking pixels, or cross-site
        analytics. We only store what is needed for session management, your preferences, and
        first-party product analytics.
      </Notice>

      <div className="space-y-6">
        <Section title="1. What we use and why">
          <p>
            Fyxvo relies on browser local storage and session storage rather than traditional HTTP
            cookies for most client-side persistence. Here is what gets stored in your browser.
          </p>

          <div className="space-y-3 mt-4">
            <StorageRow
              name="fyxvo-token"
              type="Local storage"
              purpose="Holds your JWT auth token after you sign in with your wallet. This keeps your API session alive between page loads so you do not have to re-authenticate every time."
              duration="Until session expires or you disconnect your wallet"
            />
            <StorageRow
              name="fyxvo-theme"
              type="Local storage"
              purpose="Remembers whether you prefer dark or light mode so the right theme loads when you come back."
              duration="Persistent until cleared"
            />
            <StorageRow
              name="fyxvo-cookies-accepted"
              type="Local storage"
              purpose="Records that you have dismissed the cookie notice so it does not keep popping up on every page."
              duration="Persistent until cleared"
            />
          </div>
        </Section>

        <Section title="2. Infrastructure and hosting cookies">
          <p>
            Vercel, which hosts the Fyxvo frontend, may set its own performance and security cookies
            as part of edge delivery. Those cookies come from Vercel and are not under our direct
            control. You can read about what Vercel collects in their privacy policy at
            vercel.com/legal/privacy-policy.
          </p>
          <p>
            Railway, which hosts the API and gateway backends, does not set any browser-side cookies.
            It may log server-side request metadata for its own operational purposes.
          </p>
        </Section>

        <Section title="3. What we do not use">
          <p>Fyxvo does not use any of the following.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Advertising or remarketing cookies</li>
            <li>Third-party analytics cookies (Google Analytics, Mixpanel, and similar services)</li>
            <li>Social media tracking pixels (Meta, X, LinkedIn, and others)</li>
            <li>Cross-site tracking or user fingerprinting</li>
            <li>Persistent device identifiers beyond what is in browser storage</li>
          </ul>
        </Section>

        <Section title="4. How to manage storage">
          <p>
            You can clear all Fyxvo local storage whenever you want through your browser settings
            or developer tools. If you do, here is what happens.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You will be logged out of your current wallet session (fyxvo-token)</li>
            <li>Your theme preference will reset to the platform default</li>
            <li>The cookie notice will reappear</li>
          </ul>
          <p>
            In Chrome, you can do this by opening DevTools (F12), going to Application, then
            Storage, then Local Storage, selecting the Fyxvo origin, and clearing the entries.
          </p>
          <p>
            In Firefox, open DevTools (F12), go to Storage, then Local Storage, select the Fyxvo
            origin, and right-click to delete items.
          </p>
          <p>
            Clearing local storage does not touch your account data, projects, or API keys on the
            Fyxvo servers. That data lives on our backend until you ask us to delete it (see the
            Privacy Policy for details on deletion requests).
          </p>
        </Section>

        <Section title="5. Changes to this policy">
          <p>
            If we introduce new storage mechanisms, we will update this policy. The effective date
            at the top of the page always reflects the most recent revision. We will communicate
            changes through the Fyxvo community channels.
          </p>
        </Section>
      </div>
    </div>
  );
}
