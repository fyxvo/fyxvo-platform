import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playground — Fyxvo",
  description: "Interactively test Solana RPC methods through the Fyxvo gateway — send live requests and inspect responses.",
};

export default function PlaygroundLayout({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>;
}
