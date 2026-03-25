import type { Metadata } from "next";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: {
    absolute: "Enterprise — Fyxvo"
  },
  description: "Dedicated relay capacity, custom SLAs, and priority support for high-volume Solana infrastructure teams.",
  alternates: {
    canonical: `${webEnv.siteUrl}/enterprise`
  },
  openGraph: {
    title: "Enterprise — Fyxvo",
    description: "Dedicated relay capacity, custom SLAs, and priority support for high-volume Solana infrastructure teams.",
    url: `${webEnv.siteUrl}/enterprise`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Enterprise — Fyxvo",
    description: "Dedicated relay capacity, custom SLAs, and priority support for high-volume Solana infrastructure teams.",
    images: [webEnv.socialImageUrl]
  }
};

export default function EnterpriseLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
