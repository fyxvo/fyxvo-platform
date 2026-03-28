import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Compare",
  "See how Fyxvo differs from generic Solana RPC services by adding activation, funding, analytics, and trust surfaces."
);

export default function CompareLayout({ children }: { children: ReactNode }) {
  return children;
}
