import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Enterprise",
  "Start an enterprise conversation about rollout planning, traffic shape, and operational support for Fyxvo."
);

export default function EnterpriseLayout({ children }: { children: ReactNode }) {
  return children;
}
