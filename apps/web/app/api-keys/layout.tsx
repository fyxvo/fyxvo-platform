import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Keys",
  description: "Create scoped API keys for relay traffic, analytics, and internal tools. Each key carries explicit permissions and a full usage history.",
};

export default function ApiKeysLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
