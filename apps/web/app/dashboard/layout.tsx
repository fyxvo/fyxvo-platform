import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Fyxvo workspace overview: gateway health, project status, API key activity, and on-chain balance at a glance.",
};

export default function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
