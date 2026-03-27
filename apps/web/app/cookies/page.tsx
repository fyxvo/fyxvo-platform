import type { Metadata } from "next";
import Link from "next/link";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: "Cookie Policy — Fyxvo",
  description:
    "What cookies and local storage Fyxvo uses, why they exist, and how to manage or clear them.",
  alternates: {
    canonical: `${webEnv.siteUrl}/cookies`,
  },
  openGraph: {
    title: "Cookie Policy — Fyxvo",
    description:
      "What cookies and local storage Fyxvo uses, why they exist, and how to manage or clear them.",
    url: `${webEnv.siteUrl}/cookies`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cookie Policy — Fyxvo",
    description:
      "What cookies and local storage Fyxvo uses, why they exist, and how to manage or clear them.",
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

function StorageItem({
  name,
  type,
  description,
  retention,
}: {
  name: string;
  type: string;
  description: string;
  retention: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-sm font-medium text-[var(--fyxvo-text)]">
          {name}
        </span>
        <span className="rounded-full border border-[var(--fyxvo-border)] px-3 py-0.5 text-xs text-[var(--fyxvo-text-muted)]">
          {type}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
        {description}
      </p>
      <p className="mt-2 text-xs text-[var(--fyxvo-text-soft)]">
        Retention: {retention}
      </p>
    </div>
  );
}

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
          Legal
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-5xl">
          Cookie Policy
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
          Last updated: March 2026. This policy explains what the Fyxvo platform
          stores in your browser, why each item exists, and how you can manage
          or remove them at any time.
        </p>

        <div className="mt-6 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
          <p className="text-sm font-semibold text-[var(--fyxvo-text)]">
            Minimal by design
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--fyxvo-text-muted)]">
            Fyxvo does not use advertising cookies, third-party tracking pixels,
            or cross-site analytics. Everything stored in your browser is there
            for functional necessity: keeping your session alive, remembering
            your preferences, and preserving your working context between page
            loads.
          </p>
        </div>
      </div>

      <div className="space-y-10">
        <PolicySection title="What is stored and why">
          <p>
            Fyxvo uses browser local storage rather than traditional HTTP
            cookies. Local storage items are never automatically sent to the
            server on each request the way cookies are. They are read and written
            by the application only when needed. The three items below are the
            complete set of storage entries that Fyxvo writes to your browser.
          </p>

          <div className="space-y-4 pt-2">
            <StorageItem
              name="fyxvo.web.theme"
              type="localStorage"
              description="Stores your theme preference, either dark or light. This is written when you toggle the theme from the navigation, and read when the page loads so your chosen appearance is applied immediately without a flash of the wrong theme."
              retention="Persistent until you clear it or change your preference"
            />
            <StorageItem
              name="fyxvo.web.session"
              type="localStorage"
              description="Stores the JWT token issued when you authenticate with your wallet. This token is what proves to the API that your requests are authorized. It contains your wallet address and an expiry timestamp. When it expires, or when you disconnect your wallet, this item is cleared."
              retention="Until session expiry or wallet disconnect"
            />
            <StorageItem
              name="fyxvo.web.project"
              type="localStorage"
              description="Stores the ID of the project you most recently selected in the dashboard. This means when you return to the platform, the same project is automatically selected rather than requiring you to navigate back to it from the project list."
              retention="Persistent until you clear it or select a different project"
            />
          </div>
        </PolicySection>

        <PolicySection title="Why these are used">
          <p>
            Each of these three items serves a purely functional purpose. The
            theme preference ensures visual consistency across visits without
            requiring you to set it again each time. The session token is
            required for all authenticated API calls, and without it every
            interaction with your projects and API keys would require re-signing
            a wallet challenge. The selected project ID is a convenience that
            reduces the number of navigation steps needed to reach your working
            context.
          </p>
          <p>
            None of these items are used to track your behaviour across sessions
            or across other websites. They are not read by any third-party
            service. They do not contain any data beyond what is described above.
          </p>
        </PolicySection>

        <PolicySection title="No tracking or advertising cookies">
          <p>
            Fyxvo does not set cookies or local storage items for advertising,
            remarketing, or cross-site tracking. There are no Google Analytics
            cookies, no Mixpanel tracking scripts, no Meta or LinkedIn tracking
            pixels, and no fingerprinting techniques of any kind. The platform
            has no relationship with advertising networks and shares no browser
            data with them.
          </p>
          <p>
            All product analytics on the platform are first-party. Usage events
            such as page visits and feature interactions are sent directly to the
            Fyxvo API and stored in our own infrastructure. They are not routed
            through any third-party analytics provider.
          </p>
        </PolicySection>

        <PolicySection title="How to clear stored items">
          <p>
            The quickest way to clear your Fyxvo session is to click the
            disconnect button in the navigation. This clears the session token
            and signs you out immediately. Your theme preference and selected
            project will be retained.
          </p>
          <p>
            To clear all Fyxvo local storage items at once, open your browser's
            developer tools. In Chrome, press F12, go to the Application tab,
            open Local Storage in the left panel, select the Fyxvo origin, and
            delete the relevant entries. In Firefox, press F12, go to the
            Storage tab, open Local Storage, select the Fyxvo origin, and
            right-click to remove items. In Safari, open the Develop menu,
            select Storage, and manage local storage from there.
          </p>
          <p>
            Clearing local storage removes only client-side data. Your account,
            projects, API keys, and request logs remain on our servers until you
            request deletion. For instructions on requesting account data
            deletion, see the{" "}
            <Link
              href="/privacy"
              className="text-[var(--fyxvo-brand)] hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </PolicySection>

        <PolicySection title="Changes to this policy">
          <p>
            If Fyxvo introduces new storage items in the future, this policy will
            be updated to describe them. The date at the top of the page reflects
            the most recent revision. Significant changes will be announced
            through our community channels. Continued use of the platform after
            an update is published constitutes acceptance of the revised policy.
          </p>
        </PolicySection>
      </div>
    </div>
  );
}
