import type { Metadata } from "next";
import { DashShell } from "../../components/dash-shell";

export const metadata: Metadata = {
  title: "Transactions — Fyxvo",
  description: "Funding transaction history across all your Fyxvo projects.",
};

export default function TransactionsLayout({ children }: { readonly children: React.ReactNode }) {
  return <DashShell>{children}</DashShell>;
}
