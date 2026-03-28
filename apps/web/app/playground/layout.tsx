import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Playground",
  "Send real JSON-RPC requests through the Fyxvo gateway and inspect the live responses."
);

export default function PlaygroundLayout({ children }: { children: ReactNode }) {
  return children;
}
