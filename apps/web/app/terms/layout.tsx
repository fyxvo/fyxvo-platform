import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Terms",
  "Read the service terms that govern use of the live Fyxvo devnet control plane."
);

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}
