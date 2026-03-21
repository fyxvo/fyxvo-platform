import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Enterprise — Fyxvo",
  description: "Dedicated relay capacity, custom SLAs, and priority support for high-volume Solana infrastructure teams.",
};

export default function EnterpriseLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
