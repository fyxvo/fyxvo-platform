import type { ReactNode } from "react";
import { createPageMetadata } from "../../../lib/metadata";

export const metadata = createPageMetadata(
  "Join",
  "Enter Fyxvo through a referral or invite code and continue into the wallet-authenticated onboarding flow."
);

export default function JoinLayout({ children }: { children: ReactNode }) {
  return children;
}
