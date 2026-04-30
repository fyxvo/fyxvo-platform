"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, useState, useEffect, useCallback } from "react";
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

function NavItem({ link, pathname, onClick }: { link: NavLink; pathname: string; onClick?: () => void }) {
  const isActive = !link.external && pathname === link.href;
  const baseClass = cn(
    "rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
    isActive
      ? "bg-[var(--fyxvo-brand)]/10 text-[var(--fyxvo-brand)] border border-[var(--fyxvo-brand)]/20"
      : "text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)] border border-transparent",
  );

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className={cn(baseClass, "flex items-center gap-1.5")}
        onClick={onClick}
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
    <Link href={link.href} className={baseClass} onClick={onClick}>
      {link.label}
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  const { walletPhase, user, disconnectWallet } = usePortal();
  const { theme, toggle } = useTheme();
  const mounted = useMounted();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-[100] border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/80 backdrop-blur-xl"
        style={{ height: 64 }}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
            <div className="relative">
              <Image src="/brand/logo.png" width={32} height={32} alt="Fyxvo" className="relative z-10" />
              <div className="absolute inset-0 bg-[var(--fyxvo-brand)]/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold leading-none text-[var(--fyxvo-brand)]">
                Fyxvo
              </span>
              <span className="hidden text-[10px] uppercase tracking-[0.18em] text-[var(--fyxvo-text-muted)] sm:block">
                Devnet control plane
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {NAV_LINKS.map((link) => (
              <NavItem key={link.href} link={link} pathname={pathname} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)] transition-all duration-200 border border-transparent hover:border-[var(--fyxvo-border)]"
            >
              {theme === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </button>

            {mounted && walletPhase === "authenticated" && user?.walletAddress ? (
              <button
                type="button"
                onClick={() => void disconnectWallet()}
                className="hidden sm:flex items-center gap-2 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-3.5 py-2 text-xs font-mono text-[var(--fyxvo-text-muted)] hover:border-[var(--fyxvo-brand)]/50 hover:bg-[var(--fyxvo-brand)]/5 transition-all duration-200"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {user.walletAddress.slice(0, 4)}...{user.walletAddress.slice(-4)}
              </button>
            ) : mounted ? (
              <WalletConnectButton />
            ) : null}

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              className="flex lg:hidden h-10 w-10 items-center justify-center rounded-xl text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)] transition-all duration-200 border border-transparent hover:border-[var(--fyxvo-border)]"
            >
              <div className="relative w-5 h-5">
                <span
                  className={cn(
                    "absolute left-0 top-1 h-0.5 w-5 bg-current transition-all duration-300",
                    mobileMenuOpen && "top-2.5 rotate-45"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-2.5 h-0.5 w-5 bg-current transition-all duration-300",
                    mobileMenuOpen && "opacity-0"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-4 h-0.5 w-5 bg-current transition-all duration-300",
                    mobileMenuOpen && "top-2.5 -rotate-45"
                  )}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[90] bg-[var(--fyxvo-bg)]/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* Mobile menu panel */}
      <div
        className={cn(
          "fixed top-16 right-0 bottom-0 z-[95] w-full max-w-sm bg-[var(--fyxvo-bg)] border-l border-[var(--fyxvo-border)] transition-transform duration-300 ease-out lg:hidden overflow-y-auto",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-6">
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((link, index) => (
              <div
                key={link.href}
                className={cn(
                  "transition-all duration-300",
                  mobileMenuOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                )}
                style={{ transitionDelay: mobileMenuOpen ? `${index * 50}ms` : "0ms" }}
              >
                <NavItem link={link} pathname={pathname} onClick={closeMobileMenu} />
              </div>
            ))}
          </nav>

          {/* Mobile wallet section */}
          {mounted && walletPhase === "authenticated" && user?.walletAddress && (
            <div className="mt-8 pt-6 border-t border-[var(--fyxvo-border)]">
              <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)] mb-3">Connected Wallet</p>
              <button
                type="button"
                onClick={() => {
                  void disconnectWallet();
                  closeMobileMenu();
                }}
                className="w-full flex items-center justify-between rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-4 py-3 text-sm font-mono text-[var(--fyxvo-text-muted)] hover:border-red-500/50 hover:text-red-400 transition-all duration-200"
              >
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                </span>
                <span className="text-xs">Disconnect</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
