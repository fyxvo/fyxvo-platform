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
    "Decentralized Solana RPC and relay infrastructure network. Connect a wallet, activate a project, fund it with SOL or USDC, and start routing real Solana JSON-RPC traffic through the managed gateway on devnet today.",
  metadataBase: new URL("https://www.fyxvo.com"),
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: "https://www.fyxvo.com",
    siteName: "Fyxvo",
    title: "Fyxvo",
    description: "Decentralized Solana RPC data and relay infrastructure network",
    images: [
      {
        url: "https://www.fyxvo.com/brand/logo.png",
        width: 512,
        height: 512,
        alt: "Fyxvo",
      },
    ],
  },
  twitter: {
    card: "summary",
    site: "@fyxvo",
    creator: "@fyxvo",
  },
  verification: {
    google: "a4kZyFOCBfoVihbdI3gh4qsEFgIwP0W8Q0Ygki6pvMg",
  },
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
