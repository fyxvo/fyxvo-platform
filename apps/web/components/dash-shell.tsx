"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
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
  SearchIcon,
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

function openCommandPalette() {
  window.dispatchEvent(new Event("fyxvo:open-command-palette"));
}

function inferWorkspaceMeta(pathname: string) {
  if (pathname.startsWith("/projects/")) {
    return {
      title: "Project workspace",
      description: "Logs, funding, traffic, and operational health for the active project.",
    };
  }

  if (pathname === "/dashboard") {
    return {
      title: "Dashboard",
      description: "Launch guidance, release readiness, and the current state of your workspace.",
    };
  }

  if (pathname === "/assistant") {
    return {
      title: "Assistant",
      description: "Project-aware help, debugging support, docs grounding, and request examples.",
    };
  }

  if (pathname === "/playground") {
    return {
      title: "Playground",
      description: "Try live relay calls, recipes, benchmarks, and webhook tests before shipping them.",
    };
  }

  if (pathname === "/analytics") {
    return {
      title: "Analytics",
      description: "Traffic, latency, spend, and recent request behavior across your projects.",
    };
  }

  if (pathname === "/alerts") {
    return {
      title: "Alerts",
      description: "Operational signals, incidents, low balance warnings, and failure clusters.",
    };
  }

  if (pathname === "/funding") {
    return {
      title: "Funding",
      description: "Track treasury runway, top up credits, and plan reserve for the next rollout.",
    };
  }

  if (pathname === "/api-keys") {
    return {
      title: "API keys",
      description: "Issue scoped credentials, review lifecycle health, and export operational metadata.",
    };
  }

  if (pathname === "/transactions") {
    return {
      title: "Transactions",
      description: "Review recent on-chain funding and activation activity across the workspace.",
    };
  }

  if (pathname === "/settings") {
    return {
      title: "Settings",
      description: "Security, team collaboration, notes, webhooks, and personal preferences.",
    };
  }

  if (pathname === "/operators") {
    return {
      title: "Operators",
      description: "Gateway infrastructure, node behavior, and operator-side observability.",
    };
  }

  if (pathname === "/support") {
    return {
      title: "Support",
      description: "Open tickets, review guidance, and keep the team unblocked.",
    };
  }

  return {
    title: "Workspace",
    description: "Keep project control, traffic, and operational tooling in one place.",
  };
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
        "group flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-medium transition-all duration-150",
        active
          ? "border-[var(--fyxvo-brand)]/20 bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-text)] shadow-[0_12px_32px_color-mix(in_srgb,var(--fyxvo-brand)_12%,transparent)]"
          : "border-transparent text-[var(--fyxvo-text-muted)] hover:border-[var(--fyxvo-border)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
          active
            ? "border-[var(--fyxvo-brand)]/20 bg-[var(--fyxvo-bg)] text-[var(--fyxvo-brand)]"
            : "border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] text-[var(--fyxvo-text-muted)] group-hover:text-[var(--fyxvo-text)]"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span>{label}</span>
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
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fyxvo-text-muted)]">
        {label}
      </p>
      <div className="space-y-1.5">{children}</div>
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
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-[var(--fyxvo-border)] px-5">
        <BrandLogo priority />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Open command palette"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]"
          >
            <SearchIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onOpenShortcuts}
            aria-label="Keyboard shortcuts"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]"
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

      <div className="border-b border-[var(--fyxvo-border)] px-5 py-4">
        <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fyxvo-text-muted)]">
            Active context
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--fyxvo-text)]">
            {portal.selectedProject?.name ?? "No project selected"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--fyxvo-text-muted)]">
            {portal.selectedProject
              ? "Project-specific analytics, budgets, recipes, and assistant context will follow this selection."
              : "Pick a project to make the workspace, alerts, and assistant fully project-aware."}
          </p>
        </div>
      </div>

      {visibleBookmarks.length > 0 ? (
        <div className="border-b border-[var(--fyxvo-border)] px-5 py-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fyxvo-text-muted)]">
            Quick access
          </p>
          <div className="space-y-1.5">
            {visibleBookmarks.map((bookmark) => (
              <Link
                key={bookmark.id}
                href={bookmark.href}
                {...(onNavigate ? { onClick: onNavigate } : {})}
                className="block rounded-xl border border-transparent px-3 py-2 text-sm text-[var(--fyxvo-text-muted)] transition-colors hover:border-[var(--fyxvo-border)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
              >
                {bookmark.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label="Primary navigation">
        <div className="space-y-6">
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
        </div>
      </nav>

      <div className="shrink-0 space-y-3 border-t border-[var(--fyxvo-border)] px-5 py-4">
        {portal.walletPhase === "authenticated" && portal.walletAddress ? (
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[var(--fyxvo-text-muted)]">
                  {portal.walletName ?? "Wallet"}
                </p>
                <p className="mt-1 font-mono text-sm font-medium text-[var(--fyxvo-text)]">
                  {shortenAddress(portal.walletAddress, 4, 4)}
                </p>
              </div>
              <ConnectionQualityIndicator />
            </div>
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

export function DashShell({
  children,
  fullbleed = false,
  hideBottomNav = false,
}: {
  readonly children: React.ReactNode;
  readonly fullbleed?: boolean;
  readonly hideBottomNav?: boolean;
}) {
  const pathname = usePathname();
  const portal = usePortal();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const workspaceMeta = useMemo(() => inferWorkspaceMeta(pathname), [pathname]);

  useEffect(() => {
    startTransition(() => setSidebarOpen(false));
  }, [pathname]);

  return (
    <div className={cn("relative flex bg-[var(--fyxvo-bg)]", fullbleed ? "h-dvh overflow-hidden" : "min-h-screen")}>
      <aside className="hidden xl:flex xl:w-80 xl:shrink-0 xl:flex-col xl:border-r xl:border-[var(--fyxvo-border)] xl:bg-[var(--fyxvo-bg)]">
        <SidebarContent pathname={pathname} onOpenShortcuts={() => setShortcutsOpen(true)} />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-50 xl:hidden transition-opacity duration-200",
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <aside
          className={cn(
            "fixed left-0 top-0 h-full w-[min(88vw,22rem)] border-r border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] shadow-2xl transition-transform duration-250 ease-out",
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
        <header className="sticky top-0 z-30 border-b border-[var(--fyxvo-border)] bg-[color-mix(in_srgb,var(--fyxvo-bg)_82%,transparent)] backdrop-blur-xl">
          <div className="mx-auto flex min-h-[76px] max-w-[120rem] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)] xl:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <MenuIcon className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fyxvo-text-muted)]">
                  Workspace
                </span>
                {portal.selectedProject ? (
                  <span className="rounded-full border border-[var(--fyxvo-brand)]/15 bg-[var(--fyxvo-brand-subtle)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fyxvo-brand)]">
                    {portal.selectedProject.slug}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-[2rem]">
                    {workspaceMeta.title}
                  </h1>
                  <p className="max-w-3xl text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                    {workspaceMeta.description}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={openCommandPalette}
                    className="flex items-center gap-2 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]"
                    aria-label="Open command palette"
                  >
                    <SearchIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Search</span>
                    <span className="hidden rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-soft)] lg:inline">
                      Ctrl K
                    </span>
                  </button>
                  {portal.walletPhase === "authenticated" && portal.token ? (
                    <NotificationBell token={portal.token} />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className={cn(fullbleed ? "flex flex-1 flex-col overflow-hidden" : "flex-1 overflow-y-auto")}
        >
          {fullbleed ? (
            children
          ) : (
            <div className="mx-auto w-full max-w-[120rem] px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-10">
              <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[color-mix(in_srgb,var(--fyxvo-panel)_82%,transparent)] p-4 shadow-[0_28px_80px_color-mix(in_srgb,var(--fyxvo-brand)_8%,transparent)] backdrop-blur-sm sm:p-6 lg:p-8">
                {children}
              </div>
            </div>
          )}
        </main>
      </div>

      {hideBottomNav ? null : (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--fyxvo-border)] bg-[color-mix(in_srgb,var(--fyxvo-bg)_88%,transparent)] px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.35rem)] pt-2 backdrop-blur-xl xl:hidden"
          aria-label="Mobile navigation"
        >
          <div className="grid grid-cols-5 gap-1">
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
                    "flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium transition-colors duration-150",
                    active
                      ? "bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-brand)]"
                      : "text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <CommandPalette />
      <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
