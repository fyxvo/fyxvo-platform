import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Changelog",
  "Read milestone notes for the live Fyxvo devnet rollout and product contract changes."
);

export default function ChangelogLayout({ children }: { children: ReactNode }) {
  return children;
}
