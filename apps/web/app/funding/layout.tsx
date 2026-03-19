import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Funding",
  description: "Fund your Fyxvo project on chain with devnet SOL. Track treasury balance, prepare funding coordinates, and confirm reserve health.",
};

export default function FundingLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
