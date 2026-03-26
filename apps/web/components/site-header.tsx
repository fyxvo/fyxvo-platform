"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, Button } from "@fyxvo/ui";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";
import { WalletConnectButton } from "./wallet-connect-button";
import { MenuIcon, CloseIcon } from "./icons";
import { usePortal } from "./portal-provider";
import { shortenAddress } from "../lib/format";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/explore", label: "Explore" },
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/status", label: "Status" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

export function SiteHeader() {
  const pathname = usePathname();
  const portal = usePortal();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <BrandLogo priority />
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(pathname, link.href)
                    ? "bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text)]"
                    : "text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden md:block">
            {portal.walletPhase === "authenticated" ? (
              <div className="flex items-center gap-3">
                <span className="rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1.5 font-mono text-xs text-[var(--fyxvo-text-muted)]">
                  {shortenAddress(portal.walletAddress ?? "", 4, 4)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void portal.disconnectWallet()}
                  className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <WalletConnectButton compact />
            )}
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <CloseIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(pathname, link.href)
                    ? "bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text)]"
                    : "text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-[var(--fyxvo-border)] pt-3">
              {portal.walletPhase === "authenticated" ? (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="font-mono text-sm text-[var(--fyxvo-text-muted)]">
                    {shortenAddress(portal.walletAddress ?? "", 4, 4)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void portal.disconnectWallet()}
                    className="text-xs text-[var(--fyxvo-text-muted)]"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="px-1">
                  <WalletConnectButton />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
