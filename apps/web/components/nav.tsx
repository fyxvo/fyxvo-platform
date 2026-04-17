"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { cn } from "@fyxvo/ui";
import { usePortal } from "../lib/portal-context";
import { useTheme } from "../lib/hooks";
import { MoonIcon, SunIcon } from "./icons";
import { WalletConnectButton } from "./wallet-connect-button";

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

type NavLink = {
  href: string;
  label: string;
  external?: boolean;
};

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/status", label: "Status" },
  { href: "/network", label: "Network" },
  { href: "/explore", label: "Explore" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "https://yield.fyxvo.com", label: "Yield", external: true },
];

function NavItem({ link, pathname }: { link: NavLink; pathname: string }) {
  const isActive = !link.external && pathname === link.href;
  const baseClass = cn(
    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-[var(--fyxvo-panel)] text-[var(--fyxvo-text)]"
      : "text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]",
  );

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className={cn(baseClass, "flex items-center gap-1")}
      >
        {link.label}
        <svg
          viewBox="0 0 12 12"
          fill="none"
          className="h-2.5 w-2.5 opacity-50"
          aria-hidden="true"
        >
          <path
            d="M2 2h8v8M10 2 5 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    );
  }

  return (
    <Link href={link.href} className={baseClass}>
      {link.label}
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  const { walletPhase, user, disconnectWallet } = usePortal();
  const { theme, toggle } = useTheme();
  const mounted = useMounted();

  return (
    <header
      className="fixed inset-x-0 top-0 z-[100] border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/90 backdrop-blur-md"
      style={{ height: 64 }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src="/brand/logo.png" width={32} height={32} alt="Fyxvo" />
          <div className="flex flex-col">
            <span className="font-display text-lg font-bold leading-none text-[var(--fyxvo-brand)]">
              Fyxvo
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.18em] text-[var(--fyxvo-text-muted)] sm:block">
              Devnet control plane
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {NAV_LINKS.map((link) => (
            <NavItem key={link.href} link={link} pathname={pathname} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)] transition-colors"
          >
            {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>

          {mounted && walletPhase === "authenticated" && user?.walletAddress ? (
            <button
              type="button"
              onClick={() => void disconnectWallet()}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-3 py-1.5 text-xs font-mono text-[var(--fyxvo-text-muted)] hover:border-[var(--fyxvo-brand)] transition-colors"
            >
              {user.walletAddress.slice(0, 4)}...{user.walletAddress.slice(-4)}
            </button>
          ) : mounted ? (
            <WalletConnectButton />
          ) : null}

          <details className="relative md:hidden">
            <summary
              aria-label="Toggle menu"
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-[var(--fyxvo-text-muted)] transition-colors hover:bg-[var(--fyxvo-panel-soft)] [&::-webkit-details-marker]:hidden"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                width={18}
                height={18}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </summary>

            <div className="absolute right-0 top-[calc(100%+0.75rem)] z-20 max-h-[calc(100vh-5rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <NavItem key={link.href} link={link} pathname={pathname} />
                ))}
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
