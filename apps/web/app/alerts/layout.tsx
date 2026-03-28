import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Alerts",
  "Review and resolve project alerts for balance pressure, error spikes, webhook failures, and incident signals."
);

export default function AlertsLayout({ children }: { children: ReactNode }) {
  return children;
}
