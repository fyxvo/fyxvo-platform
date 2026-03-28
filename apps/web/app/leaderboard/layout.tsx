import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Leaderboard",
  "View public Fyxvo project rankings based on observed request volume and latency."
);

export default function LeaderboardLayout({ children }: { children: ReactNode }) {
  return children;
}
