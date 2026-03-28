import Image from "next/image";
import Link from "next/link";

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
          <p className="text-xs text-[var(--fyxvo-text-muted)]">
            © {new Date().getFullYear()} Fyxvo. Devnet private alpha.
          </p>
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
