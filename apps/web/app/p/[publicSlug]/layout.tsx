import type { ReactNode } from "react";
import { createPageMetadata } from "../../../lib/metadata";

export const metadata = createPageMetadata(
  "Public Project",
  "Inspect a public Fyxvo project page with recent request volume and latency information."
);

export default function PublicProjectLayout({ children }: { children: ReactNode }) {
  return children;
}
