import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalProvider } from "../components/portal-provider";
import { Footer } from "../components/footer";
import { Nav } from "../components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fyxvo — Solana RPC & Priority Relay",
    template: "%s | Fyxvo",
  },
  description:
    "Fyxvo provides high-performance RPC infrastructure and priority relay for Solana applications.",
  metadataBase: new URL("https://fyxvo.com"),
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PortalProvider>
          <Nav />
          <main className="pt-16">{children}</main>
          <Footer />
        </PortalProvider>
      </body>
    </html>
  );
}
