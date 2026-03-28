import type { ReactNode } from "react";
import { createPageMetadata } from "../../../lib/metadata";

export const metadata = createPageMetadata(
  "Admin operators",
  "Review operator registrations, approve new upstream nodes, and reject operator applications when they do not meet the current network bar."
);

export default function AdminOperatorsLayout({ children }: { children: ReactNode }) {
  return children;
}
