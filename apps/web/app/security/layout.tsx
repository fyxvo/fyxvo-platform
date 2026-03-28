import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Security",
  "Review the security boundary, disclosure path, and alpha-stage risk posture for Fyxvo."
);

export default function SecurityLayout({ children }: { children: ReactNode }) {
  return children;
}
