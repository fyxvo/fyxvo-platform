"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminGate } from "./state-panels";

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/operators", label: "Operators" },
  { href: "/admin/platform", label: "Platform" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/incidents", label: "Incidents" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminGate>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <aside className="lg:w-64 lg:flex-shrink-0">
          <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
              Admin panel
            </p>
            <nav className="mt-4 space-y-2">
              {ADMIN_LINKS.map((link) => {
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
    </AdminGate>
  );
}
