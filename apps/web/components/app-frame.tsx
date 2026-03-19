"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, Button, Card } from "@fyxvo/ui";
import { webEnv } from "../lib/env";
import { shortenAddress } from "../lib/format";
import { usePortal } from "./portal-provider";
import {
  BookIcon,
  ChartIcon,
  CloseIcon,
  FolderIcon,
  FundingIcon,
  GaugeIcon,
  HomeIcon,
  KeyIcon,
  MenuIcon,
  PulseIcon,
  ServerIcon,
} from "./icons";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";
import { WalletPanel } from "./wallet-panel";
import { WalletConnectButton } from "./wallet-connect-button";
import { SocialLinks } from "./social-links";

const navigation = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/dashboard", label: "Dashboard", icon: GaugeIcon },
  { href: "/pricing", label: "Pricing", icon: BookIcon },
  { href: "/contact", label: "Contact", icon: BookIcon },
  { href: "/projects/solstice-labs", label: "Project", icon: FolderIcon },
  { href: "/api-keys", label: "API keys", icon: KeyIcon },
  { href: "/funding", label: "Funding", icon: FundingIcon },
  { href: "/analytics", label: "Analytics", icon: ChartIcon },
  { href: "/operators", label: "Operators", icon: ServerIcon },
  { href: "/docs", label: "Docs", icon: BookIcon },
  { href: "/status", label: "Status", icon: PulseIcon },
] as const;

const primaryLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
  { href: "/docs", label: "Docs" },
  { href: "/status", label: "Status" },
] as const;

const homeAnchors = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#developer-flow", label: "Developer flow" },
  { href: "/#community", label: "Community" },
  { href: "/#operators", label: "Operators" },
  { href: "/#status-preview", label: "Status" },
] as const;

function isActivePath(pathname: string, href: string) {
  return (
    pathname === href || (href !== "/" && pathname.startsWith(href.replace("/solstice-labs", "")))
  );
}

function NavigationList({
  pathname,
  onNavigate,
}: {
  readonly pathname: string;
  readonly onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-2">
      {navigation.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            {...(onNavigate ? { onClick: onNavigate } : {})}
            className={`flex items-center justify-between rounded-[1.75rem] border px-4 py-3 transition ${
              active
                ? "border-brand-500/30 bg-brand-500/10 text-[var(--fyxvo-text)]"
                : "border-transparent bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] hover:border-[var(--fyxvo-border)] hover:bg-[var(--fyxvo-panel)] hover:text-[var(--fyxvo-text)]"
            }`}
          >
            <span className="flex items-center gap-3">
              <span
                className={`rounded-2xl p-2 ${
                  active
                    ? "bg-brand-500/20 text-brand-300"
                    : "bg-black/10 text-[var(--fyxvo-text-muted)]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppFrame({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const portal = usePortal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const onHome = pathname === "/";

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[1700px] px-4 py-4 md:px-6 xl:px-8">
      <div className="grid gap-6 xl:grid-cols-[312px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <div className="sticky top-4 space-y-4">
            <Card className="fyxvo-surface border-[color:var(--fyxvo-border)] p-5">
              <BrandLogo priority />
              <p className="mt-5 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                Funded Solana RPC, wallet-authenticated control surfaces, and devnet protocol state
                in one calm private-alpha shell.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge tone="brand">{webEnv.solanaCluster}</Badge>
                <Badge tone="neutral">SOL live</Badge>
              </div>
            </Card>

            <NavigationList pathname={pathname} />
            <WalletPanel compact />
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-4 z-40 mb-6 rounded-[2rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel)] px-4 py-4 shadow-[0_24px_72px_rgba(6,10,18,0.26)] backdrop-blur-2xl md:px-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] text-[var(--fyxvo-text)] xl:hidden"
                    onClick={() => setMobileMenuOpen(true)}
                    aria-label="Open navigation"
                  >
                    <MenuIcon className="h-5 w-5" />
                  </button>
                  <BrandLogo priority />
                </div>

                <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 xl:flex">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {primaryLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          isActivePath(pathname, item.href)
                            ? "bg-brand-500/12 text-brand-300"
                            : "text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <ThemeToggle />
                  {portal.walletPhase === "authenticated" ? (
                    <>
                      <div className="hidden rounded-full border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-4 py-2 text-right md:block">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--fyxvo-text-muted)]">
                          {portal.walletName ?? portal.user?.role ?? "session"}
                        </div>
                        <div className="text-sm font-medium text-[var(--fyxvo-text)]">
                          {portal.user?.displayName ?? "Connected"} ·{" "}
                          {shortenAddress(portal.walletAddress ?? "", 4, 4)}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => void portal.refresh()}
                        loading={portal.loading}
                        className="hidden md:inline-flex"
                      >
                        Refresh
                      </Button>
                    </>
                  ) : (
                    <WalletConnectButton compact className="rounded-full" />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--fyxvo-border)] pt-4">
                <Badge tone="neutral">{webEnv.solanaCluster}</Badge>
                <Badge tone={portal.networkMismatch ? "warning" : "success"}>
                  {portal.networkMismatch ? "wallet mismatch" : "wallet aligned"}
                </Badge>
                {portal.selectedProject ? (
                  <Badge tone="brand">{portal.selectedProject.name}</Badge>
                ) : null}
                <Link
                  href={webEnv.apiBaseUrl}
                  target="_blank"
                  className="text-sm text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                >
                  API
                </Link>
                <Link
                  href={webEnv.gatewayBaseUrl}
                  target="_blank"
                  className="text-sm text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                >
                  RPC
                </Link>
                <Link
                  href={webEnv.statusPageUrl}
                  className="text-sm text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                >
                  Status surface
                </Link>
                <Link
                  href="/contact"
                  className="text-sm text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                >
                  Support path
                </Link>
                <SocialLinks className="ml-auto hidden md:flex" />
              </div>

              {onHome ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--fyxvo-border)] pt-4">
                  {homeAnchors.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-full border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-4 py-2 text-sm text-[var(--fyxvo-text-muted)] transition hover:text-[var(--fyxvo-text)]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </header>

          <main className="space-y-10 pb-12">{children}</main>

          <footer className="mt-10 rounded-[2rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel)] px-5 py-8 shadow-[0_18px_60px_rgba(6,10,18,0.2)] backdrop-blur-xl md:px-8">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <BrandLogo />
                <p className="max-w-2xl text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                  Fyxvo keeps the devnet alpha explicit. SOL is live, USDC stays gated until you
                  intentionally enable it, and the current launch topology is managed infrastructure
                  rather than a fake open marketplace.
                </p>
                <div className="flex flex-wrap gap-5 text-sm text-[var(--fyxvo-text-muted)]">
                  <Link href="/" className="hover:text-[var(--fyxvo-text)]">
                    Home
                  </Link>
                  <Link href="/pricing" className="hover:text-[var(--fyxvo-text)]">
                    Pricing
                  </Link>
                  <Link href="/contact" className="hover:text-[var(--fyxvo-text)]">
                    Contact
                  </Link>
                  <Link href="/dashboard" className="hover:text-[var(--fyxvo-text)]">
                    Dashboard
                  </Link>
                  <Link href="/docs" className="hover:text-[var(--fyxvo-text)]">
                    Docs
                  </Link>
                  <Link href="/status" className="hover:text-[var(--fyxvo-text)]">
                    Status
                  </Link>
                  <Link
                    href={webEnv.apiBaseUrl}
                    target="_blank"
                    className="hover:text-[var(--fyxvo-text)]"
                  >
                    API
                  </Link>
                  <Link
                    href={webEnv.gatewayBaseUrl}
                    target="_blank"
                    className="hover:text-[var(--fyxvo-text)]"
                  >
                    RPC
                  </Link>
                </div>
              </div>

              <div className="space-y-4 lg:justify-self-end">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--fyxvo-text-muted)]">
                  Follow Fyxvo
                </div>
                <SocialLinks />
              </div>
            </div>
          </footer>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-black/55 px-4 py-4 backdrop-blur-md xl:hidden">
          <div className="mx-auto flex h-full w-full max-w-lg flex-col rounded-[2rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-strong)] p-5 shadow-[0_32px_80px_rgba(2,6,23,0.42)]">
            <div className="flex items-center justify-between gap-3">
              <BrandLogo />
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] text-[var(--fyxvo-text)]"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <ThemeToggle />
              {portal.walletPhase === "authenticated" ? (
                <Button
                  variant="secondary"
                  onClick={() => void portal.refresh()}
                  loading={portal.loading}
                >
                  Refresh
                </Button>
              ) : (
                <WalletConnectButton />
              )}
            </div>
            <div className="mt-6 flex-1 overflow-y-auto space-y-4">
              <NavigationList pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
              <WalletPanel compact />
            </div>
            <div className="mt-6 border-t border-[color:var(--fyxvo-border)] pt-4">
              <SocialLinks />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
