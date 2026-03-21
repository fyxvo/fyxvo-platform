import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Invitation — Fyxvo",
  description: "You have been invited to join a project on Fyxvo.",
};

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
