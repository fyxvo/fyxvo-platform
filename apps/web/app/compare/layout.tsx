import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Projects — Fyxvo",
  description: "Compare your Fyxvo projects side by side — total requests, success rate, latency, and 7-day volume.",
};

export default function CompareLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
