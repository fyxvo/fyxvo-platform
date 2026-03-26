"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, Button } from "@fyxvo/ui";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";
import { WalletConnectButton } from "./wallet-connect-button";
import {
  GaugeIcon,
  FolderIcon,
  KeyIcon,
  FundingIcon,
  ChartIcon,
  ServerIcon,
  BookIcon,
  PulseIcon,
  MenuIcon,
  SettingsIcon,
  SupportIcon,
  TransactionsIcon,
  SparklesIcon,
  BeakerIcon,
  AlertIcon,
} from "./icons";
import { usePortal } from "./portal-provider";
import { NotificationBell } from "./notification-bell";
import { CommandPalette } from "./command-palette";
import { ConnectionQualityIndicator } from "./connection-quality";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { shortenAddress } from "../lib/format";
import { listBookmarks } from "../lib/api";
import type { BookmarkRecord } from "../lib/types";

const primaryNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: GaugeIcon },
  { href: "/projects", label: "Projects", icon: FolderIcon },
  { href: "/api-keys", label: "API Keys", icon: KeyIcon },
  { href: "/funding", label: "Funding", icon: FundingIcon },
  { href: "/transactions", label: "Transactions", icon: TransactionsIcon },
  { href: "/analytics", label: "Analytics", icon: ChartIcon },
  { href: "/alerts", label: "Alerts", icon: AlertIcon },
] as const;

const toolsNavItems = [
  { href: "/operators", label: "Operators", icon: ServerIcon },
  { href: "/playground", label: "Playground", icon: BeakerIcon },
  { href: "/assistant", label: "Assistant", icon: SparklesIcon },
] as const;

const supportNavItems = [
  { href: "/docs", label: "Docs", icon: BookIcon },
  { href: "/status", label: "Status", icon: PulseIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
  { href: "/support", label: "Support", icon: SupportIcon },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/projects") return pathname.startsWith("/projects");
  if (href === "/operators") return pathname === "/operators";
  return pathname === href;
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      {...(onClick ? { onClick } : {})}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
        "transition-colors duration-150",
        active
          ? "border border-brand-500/15 bg-brand-500/8 text-[var(--fyxvo-text)]"
          : "border border-transparent text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-[var(--fyxvo-brand)]" : "text-[var(--fyxvo-text-muted)]"
        )}
      />
      {label}
    </Link>
  );
}

function NavGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
  onOpenShortcuts,
}: {
  pathname: string;
  onNavigate?: () => void;
  onOpenShortcuts?: () => void;
}) {
  const portal = usePortal();
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const projectHref =
    portal.selectedProject ? `/projects/${portal.selectedProject.slug}` : "/projects/solstice-labs";

  useEffect(() => {
    if (portal.walletPhase !== "authenticated" || !portal.token) return;
    let cancelled = false;
    listBookmarks(portal.token)
      .then((items) => {
        if (!cancelled) setBookmarks(items.slice(0, 6));
      })
      .catch(() => {
        if (!cancelled) setBookmarks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [portal.token, portal.walletPhase]);
  const visibleBookmarks = portal.walletPhase === "authenticated" ? bookmarks : [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--fyxvo-border)] px-4">
        <BrandLogo priority />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenShortcuts}
            aria-label="Keyboard shortcuts"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--fyxvo-border)]",
              "bg-transparent text-[var(--fyxvo-text-muted)]",
              "transition-colors duration-150 hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
            )}
            title="Keyboard shortcuts (?)"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
              <rect x="2" y="5" width="16" height="11" rx="2" />
              <rect x="4.5" y="7.5" width="2" height="2" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="8.5" y="7.5" width="2" height="2" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="12.5" y="7.5" width="2" height="2" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="4.5" y="11" width="10" height="2" rx="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
          {portal.walletPhase === "authenticated" && portal.token ? (
            <NotificationBell token={portal.token} />
          ) : null}
        </div>
      </div>

      {/* Active project */}
      {portal.walletPhase === "authenticated" && portal.selectedProject ? (
        <div className="border-b border-[var(--fyxvo-border)] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            Active project
          </p>
          <p className="mt-1 truncate text-sm font-medium text-[var(--fyxvo-text)]">
            {portal.selectedProject.name}
          </p>
        </div>
      ) : null}

      {/* Quick access bookmarks */}
      {visibleBookmarks.length > 0 ? (
        <div className="border-b border-[var(--fyxvo-border)] px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            Quick access
          </p>
          <div className="space-y-0.5">
            {visibleBookmarks.map((bookmark) => (
              <Link
                key={bookmark.id}
                href={bookmark.href}
                {...(onNavigate ? { onClick: onNavigate } : {})}
                className="block rounded-lg px-2 py-1.5 text-sm text-[var(--fyxvo-text-muted)] transition-colors duration-150 hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
              >
                {bookmark.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Primary navigation">
        <NavGroup label="Workspace">
          {primaryNavItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href === "/projects" ? projectHref : item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(pathname, item.href)}
              {...(onNavigate ? { onClick: onNavigate } : {})}
            />
          ))}
        </NavGroup>

        <NavGroup label="Tools">
          {toolsNavItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(pathname, item.href)}
              {...(onNavigate ? { onClick: onNavigate } : {})}
            />
          ))}
        </NavGroup>

        <NavGroup label="Support">
          {supportNavItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(pathname, item.href)}
              {...(onNavigate ? { onClick: onNavigate } : {})}
            />
          ))}
        </NavGroup>
      </nav>

      {/* Footer */}
      <div className="shrink-0 space-y-3 border-t border-[var(--fyxvo-border)] px-4 py-4">
        {portal.walletPhase === "authenticated" && portal.walletAddress ? (
          <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--fyxvo-text-muted)]">
                {portal.walletName ?? "Wallet"}
              </p>
              <ConnectionQualityIndicator />
            </div>
            <p className="mt-0.5 font-mono text-sm font-medium text-[var(--fyxvo-text)]">
              {shortenAddress(portal.walletAddress, 4, 4)}
            </p>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {portal.walletPhase !== "authenticated" ? (
            <WalletConnectButton compact className="flex-1" />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void portal.disconnectWallet()}
              className="flex-1 text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
            >
              Disconnect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashShell({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const portal = usePortal();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    startTransition(() => setSidebarOpen(false));
  }, [pathname]);

  return (
    <div className="relative flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-[var(--fyxvo-border)] lg:bg-[var(--fyxvo-bg)]">
        <SidebarContent pathname={pathname} onOpenShortcuts={() => setShortcutsOpen(true)} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-opacity duration-200",
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        <aside
          className={cn(
            "fixed left-0 top-0 h-full w-72 border-r border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)]",
            "shadow-2xl transition-transform duration-250 ease-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarContent
            pathname={pathname}
            onNavigate={() => setSidebarOpen(false)}
            onOpenShortcuts={() => setShortcutsOpen(true)}
          />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg",
              "border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]",
              "text-[var(--fyxvo-text-muted)] transition-colors duration-150 hover:text-[var(--fyxvo-text)]"
            )}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <MenuIcon className="h-4 w-4" />
          </button>
          <BrandLogo />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              aria-label="Keyboard shortcuts"
              className={cn(
                "hidden sm:flex h-8 w-8 items-center justify-center rounded-lg",
                "border border-[var(--fyxvo-border)] bg-transparent",
                "text-[var(--fyxvo-text-muted)] transition-colors duration-150 hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
              )}
              title="Keyboard shortcuts (?)"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
                <rect x="2" y="5" width="16" height="11" rx="2" />
                <rect x="4.5" y="7.5" width="2" height="2" rx="0.5" fill="currentColor" stroke="none" />
                <rect x="8.5" y="7.5" width="2" height="2" rx="0.5" fill="currentColor" stroke="none" />
                <rect x="12.5" y="7.5" width="2" height="2" rx="0.5" fill="currentColor" stroke="none" />
                <rect x="4.5" y="11" width="10" height="2" rx="0.5" fill="currentColor" stroke="none" />
              </svg>
            </button>
            {portal.walletPhase === "authenticated" && portal.token ? (
              <NotificationBell token={portal.token} />
            ) : <div className="w-9" />}
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 lg:px-8 lg:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/95 backdrop-blur lg:hidden"
        aria-label="Mobile navigation"
      >
        {([
          { href: "/dashboard", label: "Dashboard", icon: GaugeIcon },
          { href: "/projects", label: "Projects", icon: FolderIcon },
          { href: "/funding", label: "Funding", icon: FundingIcon },
          { href: "/analytics", label: "Analytics", icon: ChartIcon },
          { href: "/assistant", label: "Assistant", icon: SparklesIcon },
        ] as const).map((item) => {
          const projectHref = portal.selectedProject ? `/projects/${portal.selectedProject.slug}` : "/projects/solstice-labs";
          const href = item.href === "/projects" ? projectHref : item.href;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium transition-colors duration-150",
                active
                  ? "text-[var(--fyxvo-brand)]"
                  : "text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <CommandPalette />
      <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
