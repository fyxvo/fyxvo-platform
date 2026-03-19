"use client";

import { useState } from "react";
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
} from "./icons";
import { usePortal } from "./portal-provider";
import { NotificationBell } from "./notification-bell";
import { shortenAddress } from "../lib/format";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: GaugeIcon },
  { href: "/projects", label: "Projects", icon: FolderIcon },
  { href: "/api-keys", label: "API Keys", icon: KeyIcon },
  { href: "/funding", label: "Funding", icon: FundingIcon },
  { href: "/analytics", label: "Analytics", icon: ChartIcon },
  { href: "/operators", label: "Operators", icon: ServerIcon },
  { href: "/docs", label: "Docs", icon: BookIcon },
  { href: "/status", label: "Status", icon: PulseIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
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
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border border-brand-500/20 bg-brand-500/10 text-[var(--fyxvo-text)]"
          : "border border-transparent text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)]"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-brand-400" : "text-[var(--fyxvo-text-muted)]"
        )}
      />
      {label}
    </Link>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const portal = usePortal();
  const projectHref =
    portal.selectedProject ? `/projects/${portal.selectedProject.slug}` : "/projects/solstice-labs";

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--fyxvo-border)] px-4">
        <BrandLogo priority />
        {portal.walletPhase === "authenticated" && portal.token ? (
          <NotificationBell token={portal.token} />
        ) : null}
      </div>

      {portal.walletPhase === "authenticated" && portal.selectedProject ? (
        <div className="border-b border-[var(--fyxvo-border)] px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
            Project
          </p>
          <p className="mt-1 truncate text-sm font-medium text-[var(--fyxvo-text)]">
            {portal.selectedProject.name}
          </p>
        </div>
      ) : null}

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href === "/projects" ? projectHref : item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(pathname, item.href)}
            {...(onNavigate ? { onClick: onNavigate } : {})}
          />
        ))}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-[var(--fyxvo-border)] px-4 py-4">
        {portal.walletPhase === "authenticated" && portal.walletAddress ? (
          <div className="rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2.5">
            <p className="text-xs text-[var(--fyxvo-text-muted)]">
              {portal.walletName ?? "Wallet"}
            </p>
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

  return (
    <div className="relative flex min-h-screen">
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-[var(--fyxvo-border)] lg:bg-[var(--fyxvo-bg)]">
        <SidebarContent pathname={pathname} />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-full w-72 border-r border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] shadow-2xl">
            <SidebarContent pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)]"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <MenuIcon className="h-4 w-4" />
          </button>
          <BrandLogo />
          <div className="flex items-center gap-2">
            {portal.walletPhase === "authenticated" && portal.token ? (
              <NotificationBell token={portal.token} />
            ) : <div className="w-9" />}
          </div>
        </header>

        {/* Desktop notification bell in sidebar header */}


        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
