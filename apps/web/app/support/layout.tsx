import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support — Fyxvo",
  description: "Get help with Fyxvo. Search the docs or submit a support ticket.",
};

export default function SupportLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
