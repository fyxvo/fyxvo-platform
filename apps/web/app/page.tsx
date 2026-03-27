import type { Metadata } from "next";
import Link from "next/link";
import { webEnv } from "../lib/env";
import { LiveStatusStrip } from "../components/live-status-strip";

export const metadata: Metadata = {
  title: {
    absolute: "Fyxvo — Solana devnet control plane"
  },
  description:
    "Fyxvo is a Solana devnet control plane for funded RPC access, project activation, API keys, request traces, alerts, and assistant-guided support.",
  alternates: {
    canonical: webEnv.siteUrl
  },
  openGraph: {
    title: "Fyxvo — Solana devnet control plane",
    description:
      "Funded RPC access, project operations, request traces, alerts, and assistant support for Solana devnet teams.",
    url: webEnv.siteUrl,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Fyxvo — Solana devnet control plane",
    description:
      "Funded RPC access, project operations, request traces, alerts, and assistant support for Solana devnet teams.",
    images: [webEnv.socialImageUrl]
  }
};

const WHERE_TO_START = [
  {
    title: "Dashboard",
    href: "/dashboard",
    description: "Create projects, fund balances, issue API keys, and manage your live workspace."
  },
  {
    title: "Docs",
    href: "/docs",
    description: "Step-by-step guidance from wallet connection to your first routed devnet request."
  },
  {
    title: "Pricing",
    href: "/pricing",
    description: "Published request pricing, funding mechanics, and automatic volume discounts."
  },
  {
    title: "Assistant",
    href: "/assistant",
    description: "Project-aware help for onboarding, debugging, funding, and relay operations."
  },
  {
    title: "Playground",
    href: "/playground",
    description: "Send live JSON-RPC calls through the relay and inspect the response in real time."
  },
  {
    title: "Status",
    href: "/status",
    description: "Live health for the API, gateway, protocol readiness, and active incidents."
  }
];

export default async function HomePage() {
  return (
    <div style={{ backgroundColor: "#0a0a0f" }} className="min-h-screen">
      {/* Hero */}
      <section className="py-24 lg:py-36 border-b border-white/[0.08]">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f97316]/25 bg-[#f97316]/10 px-4 py-1.5 text-xs font-medium text-[#f97316] mb-10">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f97316] animate-pulse" />
            Devnet private alpha · Now live
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.04] tracking-tight text-[#f1f5f9] max-w-4xl">
            Build on Solana devnet{" "}
            <span className="text-[#f97316]">without the guesswork</span>
          </h1>

          <p className="mt-7 text-lg leading-8 text-[#64748b] max-w-2xl font-sans">
            Connect a wallet, activate a project on chain, generate API keys, and relay real JSON-RPC
            traffic through a managed gateway with analytics and alerts.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-[#f97316] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#f97316]/20 transition hover:bg-[#f97316]/90 hover:shadow-[#f97316]/30"
            >
              Open workspace
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-3 text-sm font-semibold text-[#f1f5f9] transition hover:bg-white/[0.07] hover:border-white/[0.14]"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      {/* Live status strip */}
      <section className="border-b border-white/[0.08]">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <LiveStatusStrip />
        </div>
      </section>

      {/* Where to start */}
      <section className="py-20 lg:py-28 border-b border-white/[0.08]">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-14">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#f97316] mb-3">
              Navigate the platform
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#f1f5f9] tracking-tight">
              Where to start
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {WHERE_TO_START.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-transform hover:-translate-y-1 hover:border-white/[0.14] hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-base font-semibold text-[#f1f5f9]">
                    {item.title}
                  </h3>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    className="w-4 h-4 shrink-0 text-[#64748b] mt-0.5 transition-colors group-hover:text-[#f97316]"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#64748b] font-sans">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 sm:p-14">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#f97316] mb-3">
              Stay informed
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#f1f5f9] tracking-tight max-w-xl">
              Get rollout notes without the noise
            </h2>
            <p className="mt-4 text-base leading-7 text-[#64748b] font-sans max-w-lg">
              Product notes, operational changes, and release milestones for teams actively
              testing Solana devnet traffic. Low volume, high signal.
            </p>
            <NewsletterInlineForm apiBaseUrl={webEnv.apiBaseUrl} />
          </div>
        </div>
      </section>
    </div>
  );
}

function NewsletterInlineForm({ apiBaseUrl }: { readonly apiBaseUrl: string }) {
  // This is a server component so we render a plain HTML form
  return (
    <form
      method="POST"
      action={`${apiBaseUrl}/v1/newsletter/subscribe`}
      className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md"
    >
      <input
        type="email"
        name="email"
        required
        placeholder="your@email.com"
        className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]/40"
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-xl bg-[#f97316] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#f97316]/90 whitespace-nowrap"
      >
        Subscribe
      </button>
    </form>
  );
}
