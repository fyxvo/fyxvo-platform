import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Pricing",
  "Review Fyxvo's live lamport-based request pricing, discounts, and funded usage model."
);

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
