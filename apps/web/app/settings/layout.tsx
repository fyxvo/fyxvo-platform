import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your Fyxvo workspace preferences, project defaults, and notification settings.",
};

export default function SettingsLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
