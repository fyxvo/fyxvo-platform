import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Request volume, latency, error rates, and balance consumption for your Fyxvo project. Time-range selectable with CSV export.",
};

export default function AnalyticsLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
