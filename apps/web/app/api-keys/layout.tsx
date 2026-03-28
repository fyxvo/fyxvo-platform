import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "API Keys",
  "Create, review, and revoke scoped API keys for the selected Fyxvo project."
);

export default function ApiKeysLayout({ children }: { children: ReactNode }) {
  return children;
}
