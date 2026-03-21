import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashShell } from "../../components/dash-shell";

export const metadata: Metadata = {
  title: "AI Assistant — Fyxvo",
  description: "Ask the Fyxvo AI assistant anything about Solana development, RPC methods, or integrating the Fyxvo gateway.",
};

export default function AssistantLayout({ children }: { readonly children: ReactNode }) {
  return <DashShell>{children}</DashShell>;
}
