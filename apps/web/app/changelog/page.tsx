import type { Metadata } from "next";
import { Badge } from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: {
    absolute: "Changelog — Fyxvo"
  },
  description: "Release notes and updates for the Fyxvo devnet control plane and relay gateway.",
  alternates: {
    canonical: `${webEnv.siteUrl}/changelog`,
  },
  openGraph: {
    title: "Changelog — Fyxvo",
    description: "Release notes and updates for the Fyxvo devnet control plane and relay gateway.",
    url: `${webEnv.siteUrl}/changelog`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog — Fyxvo",
    description: "Release notes and updates for the Fyxvo devnet control plane and relay gateway.",
    images: [webEnv.socialImageUrl]
  }
};

interface ChangeEntry {
  readonly type: "added" | "changed" | "fixed" | "removed";
  readonly text: string;
}

interface ChangeSection {
  readonly title: string;
  readonly entries: ChangeEntry[];
}

interface Release {
  readonly version: string;
  readonly date: string;
  readonly title: string;
  readonly description: string;
  readonly changes: ChangeEntry[];
  readonly sections?: ChangeSection[];
  readonly note?: string;
  readonly upcoming?: boolean;
}

const releases: Release[] = [
  {
    version: "v0.3.0",
    date: "March 2026",
    title: "Webhooks, Team Collaboration, Public Profiles & Platform Infrastructure",
    description:
      "A major platform expansion: HTTP webhooks with HMAC signatures, team member invitations, public project pages with embeddable README badges, enterprise waitlist, interactive API Explorer, developer playground enhancements, notification preferences, activity log, system announcements, and an improved health endpoint.",
    changes: [
      {
        type: "added",
        text: "Webhooks: POST /v1/projects/:id/webhooks — create HTTP callbacks for funding.confirmed, apikey.created, apikey.revoked, balance.low, and project.activated events. HMAC-SHA256 signatures on every payload. Test endpoint included.",
      },
      {
        type: "added",
        text: "Team collaboration: invite team members by Solana wallet address, view pending invitations, accept or remove members from project settings.",
      },
      {
        type: "added",
        text: "Public project pages: enable a public URL at /p/[slug] showing aggregate request volume and latency. No authentication required. Badge generator for GitHub READMEs.",
      },
      {
        type: "added",
        text: "Enterprise waitlist: /enterprise page with contact form for dedicated capacity inquiries. Form submissions stored in database.",
      },
      {
        type: "added",
        text: "API Explorer in docs: interactive try-it panel embedded in the documentation page. Live requests against the real API with JWT auto-injection.",
      },
      {
        type: "added",
        text: "Developer playground: schema panel showing response structure per RPC method, compare mode for standard vs priority side-by-side latency comparison, shareable URLs with method and params encoded in query string, and one-click example fill.",
      },
      {
        type: "added",
        text: "Notification preferences: per-user toggles for all seven notification types. Email address storage is live so alert and digest delivery can be enabled without re-collecting account details.",
      },
      {
        type: "added",
        text: "Assistant rate limit display: progress bar showing hourly message usage in the AI assistant.",
      },
      {
        type: "added",
        text: "Activity log: timeline of key actions per project — API key events, webhook changes, member activity.",
      },
      {
        type: "added",
        text: "README badge: embeddable SVG badge from /badge/project/[slug] showing live gateway latency. 5-minute CDN cache for GitHub's image proxy.",
      },
      {
        type: "added",
        text: "System announcements: admin-configurable banner that appears on the dashboard for all authenticated users.",
      },
      {
        type: "added",
        text: "Health endpoint: improved /health with per-dependency response times for database, Redis, and Solana RPC.",
      },
    ],
  },
  {
    version: "v0.2.0",
    date: "March 2026",
    title: "Developer Experience & Platform Features",
    description:
      "A broad set of developer experience improvements: AI assistant, project templates, embeddable widgets, onboarding flow, analytics cost breakdown, pricing overhaul, service health timeline, connection quality indicator, offline support, and network stats API.",
    changes: [
      {
        type: "added",
        text: "AI Developer Assistant: streaming chat assistant powered by Claude claude-sonnet-4-20250514 at /assistant. Answers Solana development questions, generates code examples in JS/TS/Python/Rust, explains Fyxvo pricing and architecture, and uses project context for personalized answers.",
      },
      {
        type: "added",
        text: "Project Templates: three project creation templates — blank, DeFi trading, and data indexing. Templates pre-configure suggested funding amounts and show template-specific getting-started guides.",
      },
      {
        type: "added",
        text: "Usage Widget: public embeddable widget at /widget/project/[id]. Shows requests today, average latency, and gateway status. Supports light and dark themes via ?theme=. Auto-refreshes with ?live=true.",
      },
      {
        type: "added",
        text: "Onboarding Flow: five-step welcome modal for new users explains the full setup flow. Dismissal state persists to the database.",
      },
      {
        type: "added",
        text: "Analytics Cost Breakdown: analytics page shows estimated SOL spend for the selected time range, classified by method tier (standard vs compute-heavy).",
      },
      {
        type: "added",
        text: "Pricing Page Overhaul: live SOL/USD pricing from CoinGecko with interactive cost estimator, volume discount tiers, and revenue split display.",
      },
      {
        type: "added",
        text: "Service Health Timeline: status page shows 48-entry uptime history per service as color-coded timeline blocks.",
      },
      {
        type: "added",
        text: "Connection Quality Indicator: sidebar indicator polls API health every 30 seconds and shows fast/normal/slow/offline status with tooltip showing exact response time.",
      },
      {
        type: "added",
        text: "Service Worker: offline support via service worker. Serves cached pages when the user is offline and auto-restores when connection returns.",
      },
      {
        type: "added",
        text: "Network Stats API: public GET /v1/network/stats returns total requests served, projects, API keys, and SOL fees collected. Powers the live stats strip on the landing page.",
      },
    ],
  },
  {
    version: "v0.1.0",
    date: "March 2026",
    title: "Devnet Private Alpha",
    description:
      "The first public release of the Fyxvo control plane, relay gateway, and on-chain protocol. " +
      "This release establishes the core flow — wallet authentication, on-chain project activation, SOL funding, " +
      "scoped API keys, and a funded relay gateway with per-request analytics. Everything here is live on Solana devnet.",
    changes: [],
    sections: [
      {
        title: "Infrastructure",
        entries: [
          {
            type: "added",
            text: "Funded relay gateway with standard RPC path (/rpc) and priority relay path (/priority). Both paths enforce API key scope and deduct per-request lamport fees against the project treasury.",
          },
          {
            type: "added",
            text: "Multi-node routing with automatic fallback. Requests route to the healthiest available devnet node. Failures fall back transparently without surfacing errors to the caller.",
          },
          {
            type: "added",
            text: "Redis-backed rate limiting enforced at both the project and API key level. Rate window violations return 429 with a Retry-After header.",
          },
        ],
      },
      {
        title: "Developer Tools",
        entries: [
          {
            type: "added",
            text: "Wallet-authenticated sessions via Phantom, Solflare, and compatible Solana wallets. Authentication uses a challenge-response signing flow — no private key is ever sent to Fyxvo.",
          },
          {
            type: "added",
            text: "API key management with scoped credentials. Keys can be scoped to standard RPC, priority relay, or both. Revocation is instant.",
          },
          {
            type: "added",
            text: "Command palette (⌘K) for fast navigation across all portal sections. Fuzzy search across projects, API keys, and documentation.",
          },
          {
            type: "added",
            text: "Dark and light mode with automatic system preference detection. Preference persists across sessions.",
          },
          {
            type: "added",
            text: "Docs section with quickstart, API reference, and funding mechanics. Includes copy-ready curl examples for every endpoint.",
          },
        ],
      },
      {
        title: "Analytics and Monitoring",
        entries: [
          {
            type: "added",
            text: "Request logging, analytics aggregation, and latency tracking per project and API key. Aggregates update on every request with no sampling.",
          },
          {
            type: "added",
            text: "Live status page with real-time data from API and gateway health endpoints. Shows per-service condition and last-seen timestamps.",
          },
          {
            type: "added",
            text: "In-app notifications for low balance, high request volume, and key lifecycle events. Notification state is stored per user.",
          },
        ],
      },
      {
        title: "Platform and Operations",
        entries: [
          {
            type: "added",
            text: "Project creation with on-chain activation via the Fyxvo Solana program deployed to devnet. Each project corresponds to a unique on-chain PDA.",
          },
          {
            type: "added",
            text: "SOL funding flow: prepare, sign, and confirm funding transactions to load project treasury credits. The API verifies the on-chain signature and refreshes spendable balance.",
          },
          {
            type: "added",
            text: "Transaction history with Solana Explorer links for all confirmed funding events.",
          },
          {
            type: "added",
            text: "Onboarding checklist tracking activation, funding, API key creation, and first relay request. State is computed live from the project record.",
          },
        ],
      },
      {
        title: "Security",
        entries: [
          {
            type: "changed",
            text: "Authority control uses single-signer posture for devnet launch. Governed migration and multisig upgrade authority are on the roadmap for mainnet preparation.",
          },
          {
            type: "changed",
            text: "USDC funding path exists on-chain but remains configuration-gated during private alpha. The contract supports it; the product does not expose it yet.",
          },
        ],
      },
      {
        title: "Documentation",
        entries: [
          {
            type: "changed",
            text: "Operator marketplace is managed infrastructure during private alpha — all node capacity is Fyxvo-operated. External operator onboarding is a planned next step documented in the roadmap.",
          },
        ],
      },
    ],
  },
  {
    version: "Coming in v0.4.0",
    date: "No dates promised — when it's ready.",
    title: "What's Next",
    description:
      "These items are in active development or planned. None of them have committed ship dates. " +
      "If any of these are blocking you, reach out — prioritization is informed by real usage.",
    changes: [],
    upcoming: true,
    sections: [
      {
        title: "Planned",
        entries: [
          {
            type: "added",
            text: "Mainnet preparation: network configuration, authority migration, and operator capacity validation before any mainnet routing is enabled.",
          },
          {
            type: "added",
            text: "External node operator onboarding: a structured path for external operators to register, stake, and receive traffic allocation through the Fyxvo protocol.",
          },
          {
            type: "added",
            text: "USDC payment support: enable the existing on-chain USDC path for projects that prefer stablecoin funding over SOL.",
          },
          {
            type: "added",
            text: "Email notifications: delivery layer for the existing notification preferences — low balance alerts, key events, and relay status changes.",
          },
        ],
      },
    ],
  },
];

const toneMap: Record<ChangeEntry["type"], { label: string; color: string }> = {
  added: {
    label: "Added",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
  },
  changed: {
    label: "Changed",
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
  },
  fixed: {
    label: "Fixed",
    color: "bg-brand-500/10 text-[var(--fyxvo-brand)] border border-brand-500/20",
  },
  removed: {
    label: "Removed",
    color: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20",
  },
};

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
      <PageHeader
        eyebrow="Changelog"
        title="What's changed in Fyxvo."
        description="Release notes for the Fyxvo devnet control plane, relay gateway, and on-chain protocol. Private alpha updates ship as the product hardens toward mainnet readiness."
      />

      <div className="space-y-16">
        {releases.map((release) => (
          <article key={release.version} className="relative">
            <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
              {/* Version sidebar */}
              <div className="sm:w-44 sm:shrink-0 sm:pt-1">
                <div className="sticky top-6 space-y-2">
                  <Badge tone={release.upcoming ? "neutral" : "brand"}>{release.version}</Badge>
                  <p className="text-xs text-[var(--fyxvo-text-muted)]">{release.date}</p>
                </div>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">{release.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                    {release.description}
                  </p>
                </div>

                {/* Flat change list (v0.2.0, v0.3.0) */}
                {release.changes.length > 0 && (
                  <div className="space-y-3">
                    {release.changes.map((entry, idx) => {
                      const tone = toneMap[entry.type];
                      return (
                        <div
                          key={idx}
                          className="flex gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
                        >
                          <span
                            className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone.color}`}
                          >
                            {tone.label}
                          </span>
                          <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">{entry.text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sectioned change list (v0.1.0, upcoming) */}
                {release.sections && release.sections.length > 0 && (
                  <div className="space-y-8">
                    {release.sections.map((section) => (
                      <div key={section.title}>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                          {section.title}
                        </h3>
                        <div className="space-y-3">
                          {section.entries.map((entry, idx) => {
                            const tone = toneMap[entry.type];
                            return (
                              <div
                                key={idx}
                                className="flex gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
                              >
                                <span
                                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone.color}`}
                                >
                                  {tone.label}
                                </span>
                                <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">{entry.text}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-6 py-5">
        <p className="text-sm text-[var(--fyxvo-text-muted)]">
          Fyxvo is in private alpha on Solana devnet. Updates ship continuously as the protocol and
          gateway stack mature. Follow{" "}
          <a
            href="https://x.com/fyxvo"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--fyxvo-brand)] hover:underline"
          >
            @fyxvo
          </a>{" "}
          for announcements.
        </p>
      </div>
    </div>
  );
}
