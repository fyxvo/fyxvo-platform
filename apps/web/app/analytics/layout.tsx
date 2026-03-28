import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Analytics",
  "Inspect platform and project request metrics, success rates, latency, and method activity for your workspace."
);

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return children;
}
