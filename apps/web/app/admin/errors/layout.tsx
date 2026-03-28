import type { ReactNode } from "react";
import { createPageMetadata } from "../../../lib/metadata";

export const metadata = createPageMetadata(
  "Admin errors",
  "Review the latest server-side Fyxvo API failures captured from live production traffic."
);

export default function AdminErrorsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
