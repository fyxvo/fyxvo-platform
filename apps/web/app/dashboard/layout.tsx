import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Dashboard",
  "Create projects, activate them on Solana devnet, and manage the authenticated Fyxvo workspace."
);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
