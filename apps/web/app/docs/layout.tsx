import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Documentation",
  "Read the wallet auth, project activation, funding, gateway, and public endpoint contract for Fyxvo."
);

export default function DocsLayout({ children }: { children: ReactNode }) {
  return children;
}
