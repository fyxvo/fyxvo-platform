import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Updates",
  "Read product and rollout updates for the live Fyxvo devnet deployment."
);

export default function UpdatesLayout({ children }: { children: ReactNode }) {
  return children;
}
