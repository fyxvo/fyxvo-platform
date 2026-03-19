import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Operators",
  description: "View the managed relay operators powering the Fyxvo devnet gateway, including uptime, routing share, and reward accrual.",
};

export default function OperatorsLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
