import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Cookies",
  "Review how Fyxvo uses essential browser storage and operational telemetry in the web app."
);

export default function CookiesLayout({ children }: { children: ReactNode }) {
  return children;
}
