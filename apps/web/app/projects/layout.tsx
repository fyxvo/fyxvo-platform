import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Manage your Fyxvo projects: activate on chain, monitor treasury, issue API keys, and track request activity per project.",
};

export default function ProjectsLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
