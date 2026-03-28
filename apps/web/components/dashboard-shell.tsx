"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { usePortal } from "../lib/portal-context";

const DASHBOARD_LINKS = [
  { href: "/dashboard", label: "Workspace" },
  { href: "/dashboard/settings", label: "Project settings" },
  { href: "/operators/dashboard", label: "Node operator" }
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { walletPhase } = usePortal();

  if (walletPhase !== "authenticated") {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
      <aside className="lg:w-64 lg:flex-shrink-0">
        <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
            Dashboard
          </p>
          <nav className="mt-4 space-y-2">
            {DASHBOARD_LINKS.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-2xl px-4 py-3 text-sm transition ${
                    active
                      ? "bg-[var(--fyxvo-brand)] text-white"
                      : "bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-soft)] hover:text-[var(--fyxvo-text)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
