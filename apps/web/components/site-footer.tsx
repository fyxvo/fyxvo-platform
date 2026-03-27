import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { SocialLinks } from "./social-links";
import { NewsletterSignup } from "./newsletter-signup";
import { footerRouteGroups } from "../lib/routes";

const communityLinks = [
  { href: "https://x.com/fyxvo", label: "X", external: true },
  { href: "https://discord.gg/Uggu236Jgj", label: "Discord", external: true },
  { href: "https://t.me/fyxvo", label: "Telegram", external: true },
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
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--fyxvo-text-muted)]">
        {title}
      </p>
      <div className="space-y-2.5">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            className="block text-sm text-[var(--fyxvo-text-muted)] transition hover:text-[var(--fyxvo-text)]"
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
    <footer className="border-t border-[var(--fyxvo-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--fyxvo-bg)_78%,transparent),var(--fyxvo-bg))]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
          <div className="space-y-6">
            <BrandLogo />
            <p className="max-w-md text-sm leading-7 text-[var(--fyxvo-text-muted)]">
              Fyxvo gives Solana teams a single control surface for funded relay access,
              wallet-auth project activation, scoped API keys, analytics, alerts, and public trust surfaces.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--fyxvo-panel)_88%,transparent),color-mix(in_srgb,var(--fyxvo-panel-soft)_92%,transparent))] p-4 shadow-[0_24px_64px_color-mix(in_srgb,var(--fyxvo-brand)_10%,transparent)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fyxvo-brand-soft)]">
                  Environment
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--fyxvo-text)]">Devnet private alpha</p>
                <p className="mt-2 text-xs leading-6 text-[var(--fyxvo-text-muted)]">
                  Everything visible here is tied to the live devnet stack and public status pages.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--fyxvo-panel)_88%,transparent),color-mix(in_srgb,var(--fyxvo-panel-soft)_92%,transparent))] p-4 shadow-[0_24px_64px_color-mix(in_srgb,var(--fyxvo-brand)_10%,transparent)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fyxvo-brand-soft)]">
                  Surfaces
                </p>
                <p className="mt-2 font-mono text-xs text-[var(--fyxvo-text)]">
                  www.fyxvo.com
                  <br />
                  rpc.fyxvo.com
                  <br />
                  api.fyxvo.com
                  <br />
                  status.fyxvo.com
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--fyxvo-text-muted)]">
                Community
              </p>
              <SocialLinks />
              <div className="flex flex-wrap gap-3 text-sm text-[var(--fyxvo-text-muted)]">
                {communityLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-[var(--fyxvo-border)] px-3 py-1.5 transition hover:text-[var(--fyxvo-text)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {footerRouteGroups.map((group) => (
            <FooterColumn key={group.title} title={group.title} links={group.links} />
          ))}
        </div>

        <div className="mt-12 rounded-[2rem] border border-[var(--fyxvo-border)] bg-[linear-gradient(135deg,rgba(251,191,36,0.08),rgba(249,115,22,0.06),rgba(17,24,39,0.35))] p-6 shadow-[0_28px_90px_color-mix(in_srgb,var(--fyxvo-brand)_10%,transparent)] lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fyxvo-brand-soft)]">
                Stay close to the rollout
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-3xl">
                Get product updates, launch notes, and operational changes in one calm stream.
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                The newsletter covers what shipped, what changed operationally, and what gates still stand between devnet alpha and mainnet.
              </p>
            </div>
            <div className="w-full max-w-xl">
              <NewsletterSignup />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--fyxvo-border)] pt-6 text-xs text-[var(--fyxvo-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>Fyxvo {new Date().getFullYear()} · Solana infrastructure control plane</p>
          <p className="font-mono">Devnet alpha · wallet auth · funded relay access</p>
        </div>
      </div>
    </footer>
  );
}
