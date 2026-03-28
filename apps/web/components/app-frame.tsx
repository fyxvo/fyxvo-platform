"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { DashShell } from "./dash-shell";

const MARKETING_PATHS = new Set([
  "/",
  "/pricing",
  "/docs",
  "/status",
  "/contact",
  "/enterprise",
  "/updates",
  "/changelog",
  "/leaderboard",
  "/explore",
  "/compare",
  "/operators",
  "/security",
  "/reliability",
  "/privacy",
  "/terms",
  "/cookies",
]);

function isMarketingRoute(pathname: string) {
  if (MARKETING_PATHS.has(pathname)) {
    return true;
  }

  return (
    pathname.startsWith("/p/") ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/widget/project/")
  );
}

export function AppFrame({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();

  if (isMarketingRoute(pathname)) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main id="main-content" className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    );
  }

  const isAssistant = pathname.startsWith("/assistant");
  return (
    <DashShell fullbleed={isAssistant} hideBottomNav={isAssistant}>
      {children}
    </DashShell>
  );
}
