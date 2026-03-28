import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Mainnet gate",
  "Review the public and admin-visible readiness checks that track Fyxvo's path from devnet private alpha toward a mainnet launch."
);

export default function MainnetLayout({ children }: { children: ReactNode }) {
  return children;
}
