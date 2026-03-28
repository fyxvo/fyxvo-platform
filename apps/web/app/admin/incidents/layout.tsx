import type { ReactNode } from "react";
import { createPageMetadata } from "../../../lib/metadata";

export const metadata = createPageMetadata(
  "Admin incidents",
  "Create, update, and resolve incident records that power the public Fyxvo status surfaces."
);

export default function AdminIncidentsLayout({ children }: { children: ReactNode }) {
  return children;
}
