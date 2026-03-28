import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Support",
  "Open and review authenticated support tickets tied to your wallet session and projects."
);

export default function SupportLayout({ children }: { children: ReactNode }) {
  return children;
}
