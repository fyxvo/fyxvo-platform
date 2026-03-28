import type { ReactNode } from "react";
import { createPageMetadata } from "../../../lib/metadata";

export const metadata = createPageMetadata(
  "Update",
  "Read a published Fyxvo product update or rollout note in full."
);

export default function UpdateDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
