"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "./brand-logo";

const LINK_COLUMNS = [
  {
    heading: "Start here",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Docs", href: "/docs" },
      { label: "Pricing", href: "/pricing" },
      { label: "Assistant", href: "/assistant" },
      { label: "Playground", href: "/playground" },
    ],
  },
  {
    heading: "Operate",
    links: [
      { label: "Status", href: "/status" },
      { label: "Alerts", href: "/alerts" },
      { label: "Analytics", href: "/analytics" },
      { label: "Explore", href: "/explore" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    heading: "Trust",
    links: [
      { label: "Security", href: "/security" },
      { label: "Reliability", href: "/reliability" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
  {
    heading: "Community",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Enterprise", href: "/enterprise" },
      { label: "Updates", href: "/updates" },
    ],
  },
] as const;

const NEWSLETTER_ENDPOINT = "https://api.fyxvo.com/v1/newsletter/subscribe";

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [subState, setSubState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubState("loading");
    setErrorMsg("");
    try {
      const res = await fetch(NEWSLETTER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error("Subscription failed.");
      setSubState("success");
      setEmail("");
    } catch (err) {
      setSubState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <footer className="border-t border-white/[0.08] bg-[#0a0a0f]">
      {/* Top section */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-6">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <BrandLogo />
            <p className="mt-4 text-sm leading-7 text-[#64748b] max-w-xs font-sans">
              A Solana devnet control plane for funded RPC access, project activation, API keys,
              request traces, and on-chain analytics.
            </p>

            {/* Newsletter form */}
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#64748b] mb-3">
                Product updates
              </p>
              {subState === "success" ? (
                <p className="text-sm text-emerald-400 font-medium">Subscribed. Thanks!</p>
              ) : (
                <form onSubmit={(e) => void handleSubscribe(e)} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]/40"
                  />
                  <button
                    type="submit"
                    disabled={subState === "loading"}
                    className="rounded-xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#f97316]/90 disabled:opacity-60 whitespace-nowrap"
                  >
                    {subState === "loading" ? "…" : "Subscribe"}
                  </button>
                </form>
              )}
              {subState === "error" ? (
                <p className="mt-2 text-xs text-red-400">{errorMsg}</p>
              ) : null}
            </div>
          </div>

          {/* Link columns */}
          {LINK_COLUMNS.map((col) => (
            <div key={col.heading} className="lg:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f1f5f9] mb-4">
                {col.heading}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#64748b] hover:text-[#f1f5f9] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.08] mx-auto max-w-7xl px-5 sm:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#64748b] font-mono">
            Fyxvo 2026 &middot; api.fyxvo.com &middot; rpc.fyxvo.com &middot; status.fyxvo.com
          </p>

          {/* Social icons */}
          <div className="flex items-center gap-4">
            {/* X */}
            <a
              href="https://x.com/fyxvo"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fyxvo on X"
              className="text-[#64748b] hover:text-[#f1f5f9] transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            {/* Discord */}
            <a
              href="https://discord.gg/fyxvo"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fyxvo on Discord"
              className="text-[#64748b] hover:text-[#f1f5f9] transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.074.11 18.09.12 18.1a19.878 19.878 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>

            {/* Telegram */}
            <a
              href="https://t.me/fyxvo"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fyxvo on Telegram"
              className="text-[#64748b] hover:text-[#f1f5f9] transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
