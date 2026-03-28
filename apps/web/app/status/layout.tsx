import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Status",
  "Track live control-plane health, gateway status, incidents, capacity, and recent network history."
);

export default function StatusLayout({ children }: { children: ReactNode }) {
  return children;
}
