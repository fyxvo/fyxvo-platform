"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";
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
] as const;

function linkIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 60);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300 ${
          scrolled
            ? "backdrop-blur-md bg-[#0a0a0f]/90 border-b border-white/[0.08] shadow-sm shadow-black/20"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-full flex items-center gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <BrandLogo priority />
          </div>

          {/* Center nav — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_LINKS.map((link) => {
              const active = linkIsActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                    active
                      ? "text-[#f97316] bg-[#f97316]/10"
                      : "text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/[0.05]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
            <div className="hidden md:block">
              <WalletConnectButton compact />
            </div>

            {/* Hamburger — mobile only */}
            <button
              type="button"
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#64748b] hover:text-[#f1f5f9] transition-colors"
            >
              {drawerOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer panel */}
          <div className="absolute top-16 left-0 right-0 border-b border-white/[0.08] bg-[#0a0a0f] shadow-xl">
            <nav className="flex flex-col py-3">
              {NAV_LINKS.map((link) => {
                const active = linkIsActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`px-5 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "text-[#f97316] bg-[#f97316]/10"
                        : "text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/[0.05]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="px-5 py-3 border-t border-white/[0.08] mt-2">
                <WalletConnectButton />
              </div>
            </nav>
          </div>
        </div>
      ) : null}

      {/* Spacer so content clears the fixed header */}
      <div className="h-16" aria-hidden="true" />
    </>
  );
}
