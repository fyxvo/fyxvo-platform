"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@fyxvo/ui";
import { usePortal } from "../lib/portal-context";
import { useTheme } from "../lib/hooks";
import { MoonIcon, SunIcon } from "./icons";
import { WalletConnectButton } from "./wallet-connect-button";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/explore", label: "Explore" },
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/status", label: "Status" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  const pathname = usePathname();
  const { walletPhase, user, disconnectWallet } = usePortal();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="fixed inset-x-0 top-0 z-[100] border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/90 backdrop-blur-md"
      style={{ height: 64 }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="font-display text-lg font-bold text-[var(--fyxvo-brand)]">Fyxvo</span>
        </Link>

        {/* Center links – hidden on mobile */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-[var(--fyxvo-panel)] text-[var(--fyxvo-text)]"
                  : "text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)] transition-colors"
          >
            {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>

          {walletPhase === "authenticated" && user?.walletAddress ? (
            <button
              type="button"
              onClick={() => void disconnectWallet()}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-3 py-1.5 text-xs font-mono text-[var(--fyxvo-text-muted)] hover:border-[var(--fyxvo-brand)] transition-colors"
            >
              {user.walletAddress.slice(0, 4)}...{user.walletAddress.slice(-4)}
            </button>
          ) : (
            <WalletConnectButton />
          )}

          {/* Hamburger – mobile only */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] md:hidden transition-colors"
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
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-4">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-[var(--fyxvo-panel)] text-[var(--fyxvo-text)]"
                    : "text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
