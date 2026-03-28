import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Verify Email",
  "Confirm a Fyxvo email verification token and finish enabling email delivery features."
);

export default function VerifyEmailLayout({ children }: { children: ReactNode }) {
  return children;
}
