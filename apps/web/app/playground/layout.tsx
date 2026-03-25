import type { Metadata } from "next";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: {
    absolute: "Playground — Fyxvo"
  },
  description: "Interactively test Solana RPC methods through the Fyxvo gateway — send live requests and inspect responses.",
  alternates: {
    canonical: `${webEnv.siteUrl}/playground`
  },
  openGraph: {
    title: "Playground — Fyxvo",
    description: "Interactively test Solana RPC methods through the Fyxvo gateway — send live requests and inspect responses.",
    url: `${webEnv.siteUrl}/playground`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Playground — Fyxvo",
    description: "Interactively test Solana RPC methods through the Fyxvo gateway — send live requests and inspect responses.",
    images: [webEnv.socialImageUrl]
  }
};

export default function PlaygroundLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
