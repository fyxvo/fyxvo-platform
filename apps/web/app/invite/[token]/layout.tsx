import type { ReactNode } from "react";
import { createPageMetadata } from "../../../lib/metadata";

export const metadata = createPageMetadata(
  "Invite",
  "Review and accept or decline a Fyxvo project invitation tied to an invite token."
);

export default function InviteLayout({ children }: { children: ReactNode }) {
  return children;
}
