import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Reliability",
  "Review the operating model, health signals, and public trust surfaces that support Fyxvo reliability."
);

export default function ReliabilityLayout({ children }: { children: ReactNode }) {
  return children;
}
