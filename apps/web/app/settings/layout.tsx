import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Settings",
  "Manage notification preferences, email verification, and digest delivery for your Fyxvo account."
);

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
