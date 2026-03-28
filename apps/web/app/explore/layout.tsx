import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Explore",
  "Browse public Fyxvo projects that have enabled discoverability from their project settings."
);

export default function ExploreLayout({ children }: { children: ReactNode }) {
  return children;
}
