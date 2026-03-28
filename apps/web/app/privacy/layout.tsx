import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Privacy",
  "Read how Fyxvo handles wallet, project, request, email, and support data in the live service."
);

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}
