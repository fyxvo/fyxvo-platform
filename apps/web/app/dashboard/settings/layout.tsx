import type { ReactNode } from "react";
import { createPageMetadata } from "../../../lib/metadata";

export const metadata = createPageMetadata(
  "Project Settings",
  "Edit project details, manage members, configure webhooks, and archive the selected Fyxvo project."
);

export default function DashboardSettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
