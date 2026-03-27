import type { Metadata } from "next";
import Link from "next/link";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: "Changelog — Fyxvo",
  description:
    "Release notes and version history for the Fyxvo devnet control plane, relay gateway, and on-chain protocol.",
  alternates: {
    canonical: `${webEnv.siteUrl}/changelog`,
  },
  openGraph: {
    title: "Changelog — Fyxvo",
    description:
      "Release notes and version history for the Fyxvo devnet control plane, relay gateway, and on-chain protocol.",
    url: `${webEnv.siteUrl}/changelog`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog — Fyxvo",
    description:
      "Release notes and version history for the Fyxvo devnet control plane, relay gateway, and on-chain protocol.",
    images: [webEnv.socialImageUrl],
  },
};

interface ChangelogEntry {
  version: string;
  date: string;
  prose: string;
}

const entries: ChangelogEntry[] = [
  {
    version: "0.1.7",
    date: "March 2026",
    prose:
      "Governed program deployment. The Fyxvo Solana program now runs under a staged governance model with explicit authority roles for protocol configuration, treasury operations, and upgrade decisions. Authority is distributed rather than held under a single signer, making the program structure appropriate for continued alpha hardening. The program ID remains Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc.",
  },
  {
    version: "0.1.6",
    date: "March 2026",
    prose:
      "Public project pages are now available at /p/[slug]. Projects can opt into public visibility from the project settings, which makes their aggregate request volume and gateway status visible to anyone without authentication. Each public project page includes a badge generator that produces an embeddable image suitable for GitHub READMEs and documentation sites. The badge image links back to the project page and shows a live request count and current status.",
  },
  {
    version: "0.1.5",
    date: "March 2026",
    prose:
      "The Fyxvo Assistant launched as a streaming chat interface available from the dashboard. The assistant has full context of the platform: available endpoints, pricing tiers, relay architecture, and common developer workflows for Solana. It can generate code examples, explain funding mechanics, and answer questions about the devnet control plane. Conversation history is preserved for the duration of your session.",
  },
  {
    version: "0.1.4",
    date: "February 2026",
    prose:
      "The Playground launched as a live interactive JSON-RPC request builder. You can construct requests against the relay gateway directly from the browser, inspect raw responses, and observe latency. Compare mode runs the same request through both the standard and priority relay simultaneously and shows which path returned a response faster. Simulation mode appends a simulate flag to requests so you can observe routing behavior without consuming funded balance.",
  },
  {
    version: "0.1.3",
    date: "February 2026",
    prose:
      "Team collaboration features are now live. Project owners can invite other users by their Solana wallet address, assign roles within the project, and manage or remove members from the project settings. Invitations are accepted by the invited wallet the next time they sign into the platform. An audit log tracks access changes, recording when members were added, removed, or had their role modified.",
  },
  {
    version: "0.1.2",
    date: "February 2026",
    prose:
      "The analytics dashboard received a significant expansion. Latency data now includes percentile breakdowns, giving you visibility into p50, p95, and p99 response times rather than only averages. Method-level traffic analysis shows which RPC methods are generating the most volume across your project. A cost breakdown view classifies spend by pricing tier, showing how your balance is distributed between standard and priority relay usage.",
  },
  {
    version: "0.1.1",
    date: "January 2026",
    prose:
      "The priority relay path launched alongside the standard relay. Priority relay uses a dedicated routing window within the gateway and is available under a separate pricing tier. Requests routed through the priority path are processed ahead of standard traffic. Request logs were updated to differentiate between standard and priority relay traffic, so analytics accurately reflect which path handled each request.",
  },
  {
    version: "0.1.0",
    date: "January 2026",
    prose:
      "Initial private alpha launch. The wallet-authenticated control surface went live on Solana devnet. Projects can be created through the dashboard and activated on-chain via the Fyxvo Solana program. The SOL funding path is live, allowing project treasuries to be loaded via signed wallet transactions. Standard JSON-RPC relay routes through the managed Fyxvo gateway. Basic request logging and analytics are available for each project. API key creation and management are fully operational, with support for assigning relay scopes at key creation time.",
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-16">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
          Changelog
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-5xl">
          What has changed
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
          Release notes for the Fyxvo devnet control plane, relay gateway, and
          on-chain protocol. The platform is in private alpha and updates ship
          as the product hardens toward mainnet readiness. Entries are shown
          newest first.
        </p>
      </div>

      {/* Entries */}
      <div className="space-y-0">
        {entries.map((entry, index) => (
          <article
            key={entry.version}
            className={`relative flex gap-8 pb-12 ${
              index < entries.length - 1
                ? "border-b border-[var(--fyxvo-border)]"
                : ""
            } ${index > 0 ? "pt-12" : ""}`}
          >
            {/* Version sidebar */}
            <div className="hidden w-32 shrink-0 sm:block">
              <div className="sticky top-6">
                <p className="font-mono text-sm font-semibold text-[var(--fyxvo-text)]">
                  v{entry.version}
                </p>
                <p className="mt-1 text-xs text-[var(--fyxvo-text-soft)]">
                  {entry.date}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="sm:hidden mb-3">
                <span className="font-mono text-sm font-semibold text-[var(--fyxvo-text)]">
                  v{entry.version}
                </span>
                <span className="ml-3 text-xs text-[var(--fyxvo-text-soft)]">
                  {entry.date}
                </span>
              </div>
              <h3 className="hidden font-display text-lg font-semibold text-[var(--fyxvo-text)] sm:block">
                Version {entry.version}
              </h3>
              <p className="mt-2 text-base leading-7 text-[var(--fyxvo-text-muted)] sm:mt-3">
                {entry.prose}
              </p>
            </div>
          </article>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-16 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-6 py-5">
        <p className="text-sm text-[var(--fyxvo-text-muted)]">
          Fyxvo is in private alpha on Solana devnet. Updates ship continuously
          as the protocol and gateway stack mature toward mainnet readiness.
          Follow{" "}
          <a
            href="https://x.com/fyxvo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--fyxvo-brand)] hover:underline"
          >
            @fyxvo
          </a>{" "}
          for announcements, or check the{" "}
          <Link
            href="/status"
            className="text-[var(--fyxvo-brand)] hover:underline"
          >
            status page
          </Link>{" "}
          for live platform health.
        </p>
      </div>
    </div>
  );
}
