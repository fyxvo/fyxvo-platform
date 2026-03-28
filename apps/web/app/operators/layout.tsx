import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Operators",
  "Learn how Fyxvo operator participation is evolving from managed devnet infrastructure toward an open node operator network."
);

export default function OperatorsLayout({ children }: { children: ReactNode }) {
  return children;
}
