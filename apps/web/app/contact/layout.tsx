import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Contact",
  "Contact the Fyxvo team for onboarding interest, product feedback, and support requests."
);

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children;
}
