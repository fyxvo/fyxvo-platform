import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Assistant",
  "Ask the project-aware Fyxvo assistant for help with onboarding, funding, relay behavior, and operations."
);

export default function AssistantLayout({ children }: { children: ReactNode }) {
  return children;
}
