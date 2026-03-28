import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Operators",
  "Understand what operator and authority information is public in the live Fyxvo devnet deployment."
);

export default function OperatorsLayout({ children }: { children: ReactNode }) {
  return children;
}
