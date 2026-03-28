import type { ReactNode } from "react";
import { createPageMetadata } from "../../../lib/metadata";

export const metadata = createPageMetadata(
  "Project Detail",
  "Inspect project activation state, balances, API keys, analytics, and request logs for a specific Fyxvo project."
);

export default function ProjectDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
