import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { SocialLinks } from "./social-links";
import { NewsletterSignup } from "./newsletter-signup";

const startLinks = [
  { href: "/dashboard", label: "Open dashboard" },
  { href: "/docs", label: "Read quickstart" },
  { href: "/pricing", label: "Review pricing" },
  { href: "/assistant", label: "Use assistant" },
  { href: "/playground", label: "Open playground" },
] as const;

const operationsLinks = [
  { href: "/status", label: "Status" },
  { href: "/alerts", label: "Alerts" },
  { href: "/analytics", label: "Analytics" },
  { href: "/explore", label: "Explore public projects" },
  { href: "/changelog", label: "Changelog" },
] as const;

const trustLinks = [
  { href: "/security", label: "Security" },
  { href: "/reliability", label: "Reliability" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
] as const;

const communityLinks = [
  { href: "https://x.com/fyxvo", label: "X", external: true },
  { href: "https://discord.gg/Uggu236Jgj", label: "Discord", external: true },
  { href: "https://t.me/fyxvo", label: "Telegram", external: true },
  { href: "/contact", label: "Contact" },
  { href: "/enterprise", label: "Enterprise" },
] as const;

function FooterColumn({
  title,
  links,
}: {
  readonly title: string;
  readonly links: readonly { href: string; label: string; external?: boolean }[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fyxvo-text-muted)]">
        {title}
      </p>
      <div className="space-y-2">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            className="block text-sm text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
          <div className="space-y-5">
            <BrandLogo />
            <p className="max-w-sm text-sm leading-6 text-[var(--fyxvo-text-muted)]">
              Real Solana infrastructure for teams that want funded relay traffic, honest
              operational visibility, and product surfaces that stay close to what is
              actually live.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fyxvo-text-muted)]">
                  Environment
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--fyxvo-text)]">Devnet private alpha</p>
                <p className="mt-1 text-xs leading-5 text-[var(--fyxvo-text-muted)]">
                  Wallet-authenticated control, funded request flow, and public status surfaces.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fyxvo-text-muted)]">
                  Program
                </p>
                <p className="mt-2 font-mono text-xs text-[var(--fyxvo-text)]">
                  Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--fyxvo-text-muted)]">
                  Governed staged program now backing the hosted devnet stack.
                </p>
              </div>
            </div>
            <SocialLinks />
          </div>

          <FooterColumn title="Start here" links={startLinks} />
          <FooterColumn title="Operate" links={operationsLinks} />
          <FooterColumn title="Trust" links={trustLinks} />
          <FooterColumn title="Community" links={communityLinks} />
        </div>

        <div className="mt-10 rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[color-mix(in_srgb,var(--fyxvo-panel)_72%,transparent)] p-5 shadow-[0_22px_70px_color-mix(in_srgb,var(--fyxvo-brand)_8%,transparent)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fyxvo-brand)]">
                Stay close to the rollout
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
                Get product updates, launch notes, and operational changes in one place.
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                The newsletter covers shipped product depth, infrastructure changes, and the next release gates.
              </p>
            </div>
            <div className="w-full max-w-xl">
              <NewsletterSignup />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--fyxvo-border)] pt-6 text-xs text-[var(--fyxvo-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>Fyxvo {new Date().getFullYear()} · private alpha on Solana devnet</p>
          <p className="font-mono">api.fyxvo.com · rpc.fyxvo.com · status.fyxvo.com</p>
        </div>
      </div>
    </footer>
  );
}
