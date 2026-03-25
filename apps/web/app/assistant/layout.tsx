import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashShell } from "../../components/dash-shell";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: {
    absolute: "Fyxvo Assistant — Solana Help, Debugging, and Workspace Context"
  },
  description: "Use the Fyxvo Assistant for Solana RPC guidance, debugging help, workspace-aware onboarding, and live platform context tied to your authenticated project session.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: `${webEnv.siteUrl}/assistant`
  },
  openGraph: {
    title: "Fyxvo Assistant",
    description: "Workspace-aware help for Solana RPC, Fyxvo onboarding, debugging, and gateway usage inside your authenticated Fyxvo session.",
    url: `${webEnv.siteUrl}/assistant`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Fyxvo Assistant",
    description: "Workspace-aware help for Solana RPC, Fyxvo onboarding, debugging, and gateway usage inside your authenticated Fyxvo session.",
    images: [webEnv.socialImageUrl]
  }
};

export default function AssistantLayout({ children }: { readonly children: ReactNode }) {
  return <DashShell>{children}</DashShell>;
}
