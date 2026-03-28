import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CommandPalette } from "../components/command-palette";
import { WalletProvider } from "../components/wallet-provider";
import { PortalProvider } from "../components/portal-provider";
import { Footer } from "../components/footer";
import { Nav } from "../components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fyxvo — Solana devnet control plane",
    template: "%s — Fyxvo",
  },
  description:
    "Fyxvo is a Solana devnet control plane for funded relay access, on-chain project activation, API keys, analytics, alerts, and assistant-guided operations.",
  metadataBase: new URL("https://www.fyxvo.com"),
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <PortalProvider>
            <Nav />
            <CommandPalette />
            <main className="pt-16">{children}</main>
            <Footer />
          </PortalProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
