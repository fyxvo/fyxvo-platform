"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, cn } from "@fyxvo/ui";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";
import { WalletConnectButton } from "./wallet-connect-button";
import { CloseIcon, MenuIcon, SearchIcon } from "./icons";
import { usePortal } from "./portal-provider";
import { shortenAddress } from "../lib/format";
import { marketingPrimaryRoutes, marketingSecondaryRoutes } from "../lib/routes";

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

function openCommandPalette() {
  window.dispatchEvent(new Event("fyxvo:open-command-palette"));
}

export function SiteHeader() {
  const pathname = usePathname();
  const portal = usePortal();
  const [mobileOpen, setMobileOpen] = useState(false);

  const walletLabel = useMemo(
    () => (portal.walletAddress ? shortenAddress(portal.walletAddress, 4, 4) : null),
    [portal.walletAddress]
  );

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--fyxvo-border)] bg-[color-mix(in_srgb,var(--fyxvo-bg)_84%,transparent)] backdrop-blur-2xl">
      <div className="border-b border-[var(--fyxvo-border)]/60 bg-[linear-gradient(90deg,rgba(251,191,36,0.08),rgba(249,115,22,0.08),transparent)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[var(--fyxvo-text-muted)] sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--fyxvo-brand)]/25 bg-[var(--fyxvo-brand-subtle)] px-3 py-1 text-[10px] font-semibold text-[var(--fyxvo-brand-soft)]">
              <span className="h-2 w-2 rounded-full bg-[var(--fyxvo-brand)] shadow-[0_0_16px_var(--fyxvo-brand-glow)]" />
              Real devnet traffic
            </span>
            <span className="hidden text-[10px] sm:inline">On-chain funded relay, honest status, wallet-auth workspace</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/status"
              className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1 text-[10px] transition hover:border-[var(--fyxvo-brand)]/30 hover:text-[var(--fyxvo-text)]"
            >
              Status
            </Link>
            <Link
              href="/updates"
              className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1 text-[10px] transition hover:border-[var(--fyxvo-brand)]/30 hover:text-[var(--fyxvo-text)]"
            >
              Updates
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-[84px] max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-5 lg:gap-10">
          <BrandLogo priority className="min-w-0" />

          <nav className="hidden items-center gap-1 xl:flex">
            {marketingPrimaryRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "rounded-2xl px-3 py-2.5 transition-colors",
                  isActive(pathname, route.href)
                    ? "bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-text)]"
                    : "text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
                )}
              >
                <div className="text-sm font-semibold">{route.label}</div>
                <div className="max-w-[12rem] text-[11px] leading-4 text-[var(--fyxvo-text-muted)]">
                  {route.description}
                </div>
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {marketingSecondaryRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, route.href)
                  ? "bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-brand-soft)]"
                  : "text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
              )}
            >
              {route.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden items-center gap-2 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text-muted)] transition hover:border-[var(--fyxvo-brand)]/30 hover:text-[var(--fyxvo-text)] xl:flex"
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
                variant="secondary"
                size="sm"
                onClick={() => void portal.disconnectWallet()}
                className="text-xs"
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] transition hover:text-[var(--fyxvo-text)]"
          >
            <SearchIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] transition hover:text-[var(--fyxvo-text)]"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <CloseIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[var(--fyxvo-border)] bg-[color-mix(in_srgb,var(--fyxvo-bg)_92%,transparent)] px-4 py-4 backdrop-blur-xl lg:hidden">
          <div className="mx-auto max-w-7xl space-y-5 sm:px-2">
            <div className="grid gap-2 sm:grid-cols-2">
              {[...marketingPrimaryRoutes, ...marketingSecondaryRoutes].map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 transition-colors",
                    isActive(pathname, route.href)
                      ? "border-[var(--fyxvo-brand)]/25 bg-[var(--fyxvo-brand-subtle)]"
                      : "border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]"
                  )}
                >
                  <div className="text-sm font-semibold text-[var(--fyxvo-text)]">{route.label}</div>
                  {route.description ? (
                    <div className="mt-1 text-xs leading-5 text-[var(--fyxvo-text-muted)]">{route.description}</div>
                  ) : null}
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
                  <Button variant="secondary" size="sm" onClick={() => void portal.disconnectWallet()}>
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
