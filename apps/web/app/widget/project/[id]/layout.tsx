import type { ReactNode } from "react";
import { createPageMetadata } from "../../../../lib/metadata";

export const metadata = createPageMetadata(
  "Project Widget",
  "Render the embeddable Fyxvo project widget with public status and request summary data."
);

export default function ProjectWidgetLayout({ children }: { children: ReactNode }) {
  return children;
}
