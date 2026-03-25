import type { Metadata } from "next";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: {
    absolute: "Leaderboard — Fyxvo"
  },
  description: "Top Fyxvo projects by request volume over the last 30 days.",
  alternates: {
    canonical: `${webEnv.siteUrl}/leaderboard`
  },
  openGraph: {
    title: "Leaderboard — Fyxvo",
    description: "Top Fyxvo projects by request volume over the last 30 days.",
    url: `${webEnv.siteUrl}/leaderboard`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Leaderboard — Fyxvo",
    description: "Top Fyxvo projects by request volume over the last 30 days.",
    images: [webEnv.socialImageUrl]
  }
};
export default function Layout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
