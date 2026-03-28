import Image from "next/image";
import Link from "next/link";
import { EmailSubscribeForm } from "./email-subscribe-form";

const SOCIAL_LINKS = [
  {
    href: "https://github.com/fyxvo/fyxvo-platform",
    label: "GitHub",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
        <path d="M12 2a10 10 0 0 0-3.162 19.49c.5.092.683-.216.683-.48 0-.237-.009-.866-.014-1.7-2.782.605-3.37-1.34-3.37-1.34-.455-1.157-1.11-1.466-1.11-1.466-.908-.62.07-.608.07-.608 1.004.071 1.533 1.03 1.533 1.03.892 1.53 2.341 1.088 2.91.832.091-.646.35-1.088.636-1.338-2.221-.253-4.556-1.11-4.556-4.943 0-1.092.39-1.985 1.03-2.684-.104-.253-.447-1.274.098-2.656 0 0 .84-.269 2.75 1.025A9.55 9.55 0 0 1 12 6.844c.85.004 1.708.115 2.508.337 1.909-1.294 2.748-1.025 2.748-1.025.547 1.382.204 2.403.1 2.656.64.699 1.028 1.592 1.028 2.684 0 3.842-2.338 4.687-4.566 4.935.36.31.68.922.68 1.858 0 1.34-.012 2.422-.012 2.752 0 .267.18.577.688.479A10 10 0 0 0 12 2Z" />
      </svg>
    ),
  },
  {
    href: "https://x.com/fyxvo",
    label: "X",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
        <path d="M18.901 2H22l-6.767 7.733L23.2 22h-6.24l-4.887-7.447L5.555 22H2.455l7.238-8.273L.8 2h6.398l4.418 6.738L18.901 2Zm-1.087 18h1.718L6.267 3.896H4.424L17.814 20Z" />
      </svg>
    ),
  },
  {
    href: "https://discord.gg/Uggu236Jgj",
    label: "Discord",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
        <path d="M20.317 4.369A19.791 19.791 0 0 0 15.458 3a13.215 13.215 0 0 0-.676 1.374 18.27 18.27 0 0 0-5.565 0A13.036 13.036 0 0 0 8.541 3a19.736 19.736 0 0 0-4.86 1.37C.533 9.042-.319 13.58.107 18.057a19.93 19.93 0 0 0 5.993 2.943 14.34 14.34 0 0 0 1.285-2.11 12.98 12.98 0 0 1-2.023-.98c.17-.12.337-.246.498-.375 3.904 1.821 8.135 1.821 11.993 0 .163.135.33.261.499.375-.648.384-1.328.712-2.027.981.37.75.801 1.454 1.287 2.109a19.862 19.862 0 0 0 6-2.944c.5-5.186-.85-9.684-3.295-13.688ZM8.02 15.331c-1.17 0-2.13-1.068-2.13-2.381 0-1.314.94-2.382 2.13-2.382 1.2 0 2.148 1.078 2.13 2.382 0 1.313-.94 2.381-2.13 2.381Zm7.96 0c-1.17 0-2.13-1.068-2.13-2.381 0-1.314.94-2.382 2.13-2.382 1.2 0 2.148 1.078 2.13 2.382 0 1.313-.93 2.381-2.13 2.381Z" />
      </svg>
    ),
  },
] as const;

const FOOTER_GROUPS = [
  {
    heading: "Product",
    links: [
      { href: "/docs", label: "Docs" },
      { href: "/pricing", label: "Pricing" },
      { href: "/playground", label: "Playground" },
      { href: "/assistant", label: "Assistant" },
    ],
  },
  {
    heading: "Public surfaces",
    links: [
      { href: "/status", label: "Status" },
      { href: "/explore", label: "Explore" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/updates", label: "Updates" },
    ],
  },
  {
    heading: "Trust",
    links: [
      { href: "/security", label: "Security" },
      { href: "/reliability", label: "Reliability" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-[var(--fyxvo-border)] px-4 py-12">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.3fr_2fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Image src="/brand/logo.png" width={36} height={36} alt="Fyxvo" />
            <div>
              <p className="font-display text-lg font-bold text-[var(--fyxvo-brand)]">Fyxvo</p>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Solana devnet control plane
              </p>
            </div>
          </div>
          <p className="max-w-md text-sm leading-6 text-[var(--fyxvo-text-muted)]">
            Fund projects on devnet, route traffic through the managed relay, inspect request
            history, and operate from one wallet-authenticated workspace.
          </p>
          <div className="max-w-md rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4">
            <p className="text-sm font-medium text-[var(--fyxvo-text)]">Newsletter</p>
            <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
              Subscribe for product updates, rollout notes, and changes to the devnet operating
              contract.
            </p>
            <div className="mt-4">
              <EmailSubscribeForm
                endpoint="/v1/newsletter/subscribe"
                buttonLabel="Subscribe"
                successMessage="Your email has been added to the Fyxvo newsletter list."
                source="footer"
                compact
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-[var(--fyxvo-text-muted)]">
            <a
              href="https://www.fyxvo.com"
              className="transition-colors hover:text-[var(--fyxvo-text)]"
              rel="noreferrer"
              target="_blank"
            >
              www.fyxvo.com
            </a>
            <a
              href="https://api.fyxvo.com"
              className="transition-colors hover:text-[var(--fyxvo-text)]"
              rel="noreferrer"
              target="_blank"
            >
              api.fyxvo.com
            </a>
            <a
              href="https://rpc.fyxvo.com"
              className="transition-colors hover:text-[var(--fyxvo-text)]"
              rel="noreferrer"
              target="_blank"
            >
              rpc.fyxvo.com
            </a>
            <a
              href="https://status.fyxvo.com"
              className="transition-colors hover:text-[var(--fyxvo-text)]"
              rel="noreferrer"
              target="_blank"
            >
              status.fyxvo.com
            </a>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1">
            <p className="text-xs text-[var(--fyxvo-text-muted)]">
              © {new Date().getFullYear()} Fyxvo. Devnet private alpha.
            </p>
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={link.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] transition-colors hover:border-[var(--fyxvo-brand)] hover:text-[var(--fyxvo-text)]"
                >
                  <span className="sr-only">{link.label}</span>
                  {link.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.heading}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                {group.heading}
              </p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--fyxvo-text-muted)]">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="transition-colors hover:text-[var(--fyxvo-text)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
