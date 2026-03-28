import type { ReactNode } from "react";
import { createPageMetadata } from "../../../lib/metadata";

export const metadata = createPageMetadata(
  "Admin platform",
  "Review platform-wide user, project, request, and signup metrics from the Fyxvo control plane."
);

export default function AdminPlatformLayout({ children }: { children: ReactNode }) {
  return children;
}
