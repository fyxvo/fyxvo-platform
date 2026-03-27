"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, Button } from "@fyxvo/ui";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";
import { WalletConnectButton } from "./wallet-connect-button";
import { CloseIcon, MenuIcon, SearchIcon } from "./icons";
import { usePortal } from "./portal-provider";
import { shortenAddress } from "../lib/format";

const primaryLinks = [
  { href: "/", label: "Home", description: "Solana devnet" },
  { href: "/dashboard", label: "Dashboard", description: "Workspace" },
  { href: "/explore", label: "Explore", description: "Public projects" },
  { href: "/docs", label: "Docs", description: "Guides and API" },
  { href: "/pricing", label: "Pricing", description: "Relay costs" },
  { href: "/status", label: "Status", description: "Live health" },
] as const;

const secondaryLinks = [
  { href: "/enterprise", label: "Enterprise" },
  { href: "/contact", label: "Contact" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href);
}

function openCommandPalette() {
  window.dispatchEvent(new Event("fyxvo:open-command-palette"));
}

export function SiteHeader() {
  const pathname = usePathname();
  const portal = usePortal();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const walletLabel = useMemo(
    () => (portal.walletAddress ? shortenAddress(portal.walletAddress, 4, 4) : null),
    [portal.walletAddress]
  );

  return (
    <header className={cn(
      "sticky top-0 z-50 border-b border-[var(--fyxvo-border)] backdrop-blur-xl transition-[background-color,box-shadow] duration-300",
      scrolled
        ? "bg-[color-mix(in_srgb,var(--fyxvo-bg)_95%,transparent)] shadow-sm"
        : "bg-[color-mix(in_srgb,var(--fyxvo-bg)_82%,transparent)]"
    )}>
      <div className="border-b border-[var(--fyxvo-border)]/60 bg-[var(--fyxvo-panel-soft)]/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)] sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--fyxvo-success)]" />
            <span>Live devnet control surface</span>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-2 py-1 text-[10px] tracking-[0.18em]">
              Wallet auth
            </span>
            <span className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-2 py-1 text-[10px] tracking-[0.18em]">
              On-chain funded
            </span>
            <span className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-2 py-1 text-[10px] tracking-[0.18em]">
              Request logs
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4 lg:gap-8">
          <BrandLogo priority className="min-w-0" />
          <nav className="hidden items-center gap-1 xl:flex">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "group rounded-2xl px-3 py-2.5 transition-colors",
                  isActive(pathname, link.href)
                    ? "bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-text)]"
                    : "text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
                )}
              >
                <div className="text-sm font-medium">{link.label}</div>
                <div className="text-[11px] text-[var(--fyxvo-text-muted)] transition-colors group-hover:text-[var(--fyxvo-text-soft)]">
                  {link.description}
                </div>
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {secondaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, link.href)
                  ? "bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-brand)]"
                  : "text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
              )}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden items-center gap-2 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)] xl:flex"
            aria-label="Open command palette"
          >
            <SearchIcon className="h-4 w-4" />
            <span>Search</span>
            <span className="rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-soft)]">
              Ctrl K
            </span>
          </button>
          <ThemeToggle />
          {portal.walletPhase === "authenticated" ? (
            <div className="flex items-center gap-2">
              {walletLabel ? (
                <span className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 font-mono text-xs text-[var(--fyxvo-text-muted)]">
                  {walletLabel}
                </span>
              ) : null}
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

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Open command palette"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]"
          >
            <SearchIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <CloseIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/95 px-4 py-4 backdrop-blur-xl lg:hidden">
          <div className="mx-auto max-w-7xl space-y-5 sm:px-2">
            <div className="grid gap-2 sm:grid-cols-2">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 transition-colors",
                    isActive(pathname, link.href)
                      ? "border-[var(--fyxvo-brand)]/20 bg-[var(--fyxvo-brand-subtle)]"
                      : "border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]"
                  )}
                >
                  <div className="text-sm font-semibold text-[var(--fyxvo-text)]">{link.label}</div>
                  <div className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">{link.description}</div>
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {secondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text-muted)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Session
              </p>
              {portal.walletPhase === "authenticated" ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--fyxvo-text)]">Wallet connected</p>
                    <p className="font-mono text-xs text-[var(--fyxvo-text-muted)]">{walletLabel}</p>
                  </div>
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
                <div className="mt-3">
                  <WalletConnectButton />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
