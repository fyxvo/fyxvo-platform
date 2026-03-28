import type { ReactNode } from "react";
import { createPageMetadata } from "../../../lib/metadata";

export const metadata = createPageMetadata(
  "Admin feedback",
  "Review the feedback inbox that combines product feedback, support tickets, newsletter signups, and referral conversions."
);

export default function AdminFeedbackLayout({ children }: { children: ReactNode }) {
  return children;
}
