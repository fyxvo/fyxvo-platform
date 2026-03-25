import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashShell } from "../../components/dash-shell";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: {
    absolute: "AI Assistant — Fyxvo"
  },
  description: "Ask the Fyxvo AI assistant anything about Solana development, RPC methods, or integrating the Fyxvo gateway.",
  alternates: {
    canonical: `${webEnv.siteUrl}/assistant`
  },
  openGraph: {
    title: "AI Assistant — Fyxvo",
    description: "Ask the Fyxvo AI assistant anything about Solana development, RPC methods, or integrating the Fyxvo gateway.",
    url: `${webEnv.siteUrl}/assistant`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Assistant — Fyxvo",
    description: "Ask the Fyxvo AI assistant anything about Solana development, RPC methods, or integrating the Fyxvo gateway.",
    images: [webEnv.socialImageUrl]
  }
};

export default function AssistantLayout({ children }: { readonly children: ReactNode }) {
  return <DashShell>{children}</DashShell>;
}
