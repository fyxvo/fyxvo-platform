import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Funding",
  "Prepare, sign, submit, and verify SOL funding transactions for the selected project treasury."
);

export default function FundingLayout({ children }: { children: ReactNode }) {
  return children;
}
