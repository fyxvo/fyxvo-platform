import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { SocialLinks } from "./social-links";
import { NewsletterSignup } from "./newsletter-signup";

const productLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/status", label: "Status" },
  { href: "/security", label: "Security" },
  { href: "/reliability", label: "Reliability" },
  { href: "/changelog", label: "Changelog" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/updates", label: "Updates" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/explore", label: "Explore" },
  { href: "/assistant", label: "Assistant" },
  { href: "/playground", label: "Playground" },
  { href: "/contact", label: "Contact" },
];

const communityLinks = [
  { href: "https://x.com/fyxvo", label: "X", external: true },
  { href: "https://discord.gg/Uggu236Jgj", label: "Discord", external: true },
  { href: "https://t.me/fyxvo", label: "Telegram", external: true },
  { href: "/docs", label: "Docs" },
  { href: "/status", label: "Status" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
  { href: "/security", label: "Security" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <BrandLogo />
            <p className="max-w-sm text-sm leading-6 text-[var(--fyxvo-text-muted)]">
              On-chain funded Solana RPC with wallet-based project control, live analytics,
              and transparent devnet status. Built for teams that need real infrastructure,
              not simulated environments.
            </p>
            <div className="inline-flex items-center gap-2 rounded-md border border-[var(--fyxvo-border)] px-3 py-1.5 text-xs text-[var(--fyxvo-text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--fyxvo-brand)]" />
              Solana devnet, private alpha
            </div>
            <div className="pt-1">
              <SocialLinks />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
              Product
            </p>
            <div className="space-y-2">
              {productLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block text-sm text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
              Community
            </p>
            <div className="space-y-2">
              {communityLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  target={"external" in link && link.external ? "_blank" : undefined}
                  rel={"external" in link && link.external ? "noopener noreferrer" : undefined}
                  className="block text-sm text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
              Legal
            </p>
            <div className="space-y-2">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] px-5 py-4">
          <NewsletterSignup />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--fyxvo-border)] pt-6">
          <p className="text-xs text-[var(--fyxvo-text-muted)]">
            Fyxvo {new Date().getFullYear()}, private alpha on Solana devnet
          </p>
          <p className="font-mono text-xs text-[var(--fyxvo-text-muted)]">
            FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa
          </p>
        </div>
      </div>
    </footer>
  );
}
