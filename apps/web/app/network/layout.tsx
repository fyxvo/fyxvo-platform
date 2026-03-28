import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Network",
  "View live request totals, active operators, gateway capacity, and protocol addresses for the Fyxvo devnet network."
);

export default function NetworkLayout({ children }: { children: ReactNode }) {
  return children;
}
