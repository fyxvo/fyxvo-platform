import type { Metadata } from "next";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: {
    absolute: "Docs — Fyxvo"
  },
  description: "Fyxvo developer documentation: quickstart, authentication, standard RPC, priority relay, analytics API, SDK reference, and troubleshooting.",
  alternates: {
    canonical: `${webEnv.siteUrl}/docs`
  },
  openGraph: {
    title: "Docs — Fyxvo",
    description: "Fyxvo developer documentation: quickstart, authentication, standard RPC, priority relay, analytics API, SDK reference, and troubleshooting.",
    url: `${webEnv.siteUrl}/docs`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Docs — Fyxvo",
    description: "Fyxvo developer documentation: quickstart, authentication, standard RPC, priority relay, analytics API, SDK reference, and troubleshooting.",
    images: [webEnv.socialImageUrl]
  }
};

export default function DocsLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
