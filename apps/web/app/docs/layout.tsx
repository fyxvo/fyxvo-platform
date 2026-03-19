import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs",
  description: "Fyxvo developer documentation: quickstart, authentication, standard RPC, priority relay, analytics API, SDK reference, and troubleshooting.",
};

export default function DocsLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
