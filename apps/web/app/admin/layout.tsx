import type { ReactNode } from "react";
import { AdminShell } from "../../components/admin-shell";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Admin panel",
  "Review the internal Fyxvo control-plane surfaces for network operations, feedback review, incidents, and operator approvals."
);

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
