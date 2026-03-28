import type { ReactNode } from "react";
import { createPageMetadata } from "../../../lib/metadata";

export const metadata = createPageMetadata(
  "Operator Dashboard",
  "Review the current operator registration tied to your wallet and track whether the node is still pending or already active."
);

export default function OperatorDashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
